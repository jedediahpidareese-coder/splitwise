import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC) &&
    Boolean(supabase)
  )
}

// True when running as the installed app (home-screen icon), false in a browser
// tab. We only subscribe from the installed app so you don't also get separate
// browser-tab notifications.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mm = window.matchMedia?.('(display-mode: standalone)').matches === true
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return mm || ios
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return (await reg.pushManager.getSubscription()) != null
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export interface EnableResult {
  ok: boolean
  reason?: string // 'needs-app' | 'denied' | 'default' | 'unsupported' | error text
}

// Subscribe this device and save it so the server can push here.
export async function enablePush(userId: string): Promise<EnableResult> {
  if (!pushSupported() || !supabase) return { ok: false, reason: 'unsupported' }
  if (!isStandalone()) return { ok: false, reason: 'needs-app' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC as string),
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'bad-subscription' }
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      user_id: userId,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

// Unsubscribe this device and remove it from the server (turns notifications
// off for this device only — used to clear a duplicate browser subscription).
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  } catch {
    // best effort
  }
}

// Best-effort: ask the server to push a notification to the OTHER person.
export async function notifyOther(title: string, body: string): Promise<void> {
  if (!supabase) return
  try {
    await supabase.functions.invoke('notify', { body: { title, body } })
  } catch {
    // Never let a failed notification break the action that triggered it.
  }
}
