import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useCloudData } from '../data/useCloudData'
import SignInScreen from '../screens/SignInScreen'
import ProfileSetupScreen from '../screens/ProfileSetupScreen'
import MainShell from './MainShell'
import Frame from './Frame'

export default function CloudApp() {
  const { user, loading } = useAuth()

  if (loading) return <Centered spinner>Loading…</Centered>
  if (!user) return <SignInScreen />
  return <CloudInner user={user} />
}

function CloudInner({ user }: { user: User }) {
  const data = useCloudData(user)

  if (data.status === 'error') {
    return (
      <Centered>
        <p className="text-rose-600">Couldn’t load your data.</p>
        <p className="mt-1 text-xs text-slate-500">{data.error}</p>
        <button
          type="button"
          onClick={data.retry}
          className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white active:scale-[0.99]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={data.signOut}
          className="mt-3 text-sm font-medium text-slate-400 underline"
        >
          Sign out
        </button>
      </Centered>
    )
  }

  if (data.status === 'loading') return <Centered spinner>Loading…</Centered>

  if (data.status === 'needs-profile') {
    return (
      <ProfileSetupScreen
        email={user.email ?? ''}
        onSubmit={data.createProfile}
        onSignOut={data.signOut}
      />
    )
  }

  // status === 'ready'
  if (!data.session || !data.store) return <Centered spinner>Loading…</Centered>

  if (!data.session.other) {
    return (
      <Centered>
        <p className="font-medium text-slate-800">Almost there 🎉</p>
        <p className="mt-2 text-sm text-slate-500">
          You’re signed in as{' '}
          <span className="font-medium">{data.session.viewer.displayName}</span>.
          Ask your partner to open the app and sign in with their account — once
          they pick a name, your shared balance shows up here automatically.
        </p>
        <button
          type="button"
          onClick={data.signOut}
          className="mt-5 text-sm font-medium text-teal-700 underline"
        >
          Sign out
        </button>
      </Centered>
    )
  }

  return (
    <MainShell store={data.store} session={data.session} onSignOut={data.signOut} />
  )
}

function Centered({
  children,
  spinner = false,
}: {
  children: ReactNode
  spinner?: boolean
}) {
  return (
    <Frame>
      <div className="safe-top flex flex-1 flex-col items-center justify-center px-8 text-center">
        {spinner && (
          <Loader2
            className="mb-3 animate-spin text-slate-300"
            size={22}
            aria-hidden="true"
          />
        )}
        <div>{children}</div>
      </div>
    </Frame>
  )
}
