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
import { useDialog } from './dialog'

export default function NotificationsBell({ userId }: { userId: string }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const { alert } = useDialog()

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

    if (notificationPermission() === 'denied') {
      await alert({
        title: 'Notifications are blocked',
        message:
          "Your phone has notifications blocked for this site, and turning the app's " +
          "notification toggle on isn't enough to undo it.\n\n" +
          'In Chrome: tap the icon just left of the web address → Permissions → ' +
          'Notifications → Allow (or “Reset permissions”). Then reopen SplitWise and ' +
          'tap the bell again.',
      })
      return
    }
    if (!isStandalone()) {
      await alert({
        title: 'Open the installed app',
        message:
          'Turn notifications on from the SplitWise app on your home screen, not a ' +
          'browser tab — this avoids duplicate alerts.\n\nNot installed yet? Use your ' +
          'browser menu → Add to Home screen.',
      })
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
      await alert({
        title: 'Open the installed app',
        message: 'Turn on notifications from the SplitWise home-screen app.',
      })
    } else if (res.reason === 'denied') {
      await alert({
        title: 'Notifications are blocked',
        message:
          'Allow notifications for SplitWise in your phone/browser settings, then tap the bell again.',
      })
    } else if (res.reason && res.reason !== 'default') {
      await alert({ title: 'Couldn’t turn on notifications', message: res.reason })
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
