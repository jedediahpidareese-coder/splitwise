import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import Frame from '../app/Frame'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (err) setError(err.message)
  }

  return (
    <Frame>
      <div className="safe-top flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="mb-8 text-center">
          <img
            src={`${import.meta.env.BASE_URL}icon.svg`}
            alt=""
            className="mx-auto mb-3 h-16 w-16 rounded-2xl"
          />
          <h1 className="text-xl font-semibold text-slate-900">SplitWise</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to sync with your partner.</p>
        </div>

        <form onSubmit={signIn} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 placeholder:text-slate-400"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 placeholder:text-slate-400"
          />

          {error && <p className="px-1 text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-300"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 px-2 text-center text-xs text-slate-400">
          Accounts are created in your Supabase project. If you can’t sign in, ask
          for an invite.
        </p>
      </div>
    </Frame>
  )
}
