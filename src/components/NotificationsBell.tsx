import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import {
  disablePush,
  enablePush,
  isStandalone,
  isSubscribed,
  notificationPermission,
  pushSupported,
} from '../lib/push'

export default function NotificationsBell({ userId }: { userId: string }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    isSubscribed().then((v) => {
      if (active) setOn(v)
    })
    return () => {
      active = false
    }
  }, [])

  if (!pushSupported()) return null

  async function toggle() {
    if (busy) return

    // Already on -> turn this device off (also clears a stray browser sub).
    if (on) {
      setBusy(true)
      await disablePush()
      setBusy(false)
      setOn(false)
      return
    }

    // Turning on. Handle the cases that need the user to act first.
    if (notificationPermission() === 'denied') {
      alert(
        "Notifications are turned off for SplitWise in your phone's settings — " +
          'for security, only you can turn them back on there:\n\n' +
          'Android: Settings → Apps → SplitWise → Notifications → turn on.\n' +
          'iPhone: Settings → Notifications → SplitWise → Allow Notifications.\n\n' +
          'Then come back and tap the bell again.',
      )
      return
    }
    if (!isStandalone()) {
      alert(
        'Open SplitWise from its home-screen icon (the installed app) to turn on ' +
          "notifications — not a browser tab. This avoids duplicate browser alerts.\n\n" +
          'If it isn’t installed yet: browser menu → Add to Home screen.',
      )
      return
    }

    setBusy(true)
    const res = await enablePush(userId)
    setBusy(false)
    if (res.ok) {
      setOn(true)
      return
    }
    if (res.reason === 'needs-app') {
      alert('Open the installed SplitWise app (from your home screen) to turn on notifications.')
    } else if (res.reason === 'denied') {
      alert('Notifications are blocked in settings. Turn them on for SplitWise, then tap the bell again.')
    } else if (res.reason && res.reason !== 'default') {
      alert(`Could not enable notifications: ${res.reason}`)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={on ? 'Notifications on' : 'Enable notifications'}
      title={on ? 'Notifications on — tap to turn off' : 'Enable notifications'}
      className={`rounded-md p-1.5 active:scale-90 ${
        on ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {on ? <BellRing size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
    </button>
  )
}
