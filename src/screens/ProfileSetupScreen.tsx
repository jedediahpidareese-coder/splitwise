import { useState, type FormEvent } from 'react'
import Frame from '../app/Frame'

export default function ProfileSetupScreen({
  email,
  onSubmit,
  onSignOut,
}: {
  email: string
  onSubmit: (displayName: string) => Promise<void>
  onSignOut: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Frame>
      <div className="safe-top flex flex-1 flex-col justify-center px-6 pb-10">
        <h1 className="text-xl font-semibold text-slate-900">What’s your name?</h1>
        <p className="mt-1 text-sm text-slate-500">
          This is how your partner will see you{email ? ` (${email})` : ''}.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 placeholder:text-slate-400"
          />

          {error && <p className="px-1 text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-300"
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 text-center text-sm font-medium text-slate-400 underline"
        >
          Sign out
        </button>
      </div>
    </Frame>
  )
}
