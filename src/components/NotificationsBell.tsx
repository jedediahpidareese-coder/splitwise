import { useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { enablePush, notificationPermission, pushSupported } from '../lib/push'

export default function NotificationsBell({ userId }: { userId: string }) {
  const [perm, setPerm] = useState(() => notificationPermission())
  const [busy, setBusy] = useState(false)

  if (!pushSupported()) return null

  const granted = perm === 'granted'

  async function toggle() {
    setBusy(true)
    const res = await enablePush(userId)
    setBusy(false)
    setPerm(notificationPermission())
    if (res.ok) {
      // no-op; icon flips to "on"
    } else if (res.reason === 'denied') {
      alert(
        'Notifications are blocked. Turn them on for this site in your browser or phone settings, then tap the bell again.',
      )
    } else if (res.reason !== 'default') {
      alert(`Could not enable notifications: ${res.reason ?? 'unknown error'}`)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={granted ? 'Notifications on' : 'Enable notifications'}
      title={granted ? 'Notifications on' : 'Enable notifications'}
      className={`rounded-md p-1.5 active:scale-90 ${
        granted ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {granted ? (
        <BellRing size={20} aria-hidden="true" />
      ) : (
        <Bell size={20} aria-hidden="true" />
      )}
    </button>
  )
}
