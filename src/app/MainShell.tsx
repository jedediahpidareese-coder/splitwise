import { useState } from 'react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import Frame from './Frame'
import HomeScreen from '../screens/HomeScreen'
import AddPurchaseScreen from '../screens/AddPurchaseScreen'
import SettleUpScreen from '../screens/SettleUpScreen'

type View = 'home' | 'add' | 'settle'

// The signed-in (or local) experience: switches between Home, Add, and Settle.
export default function MainShell({
  store,
  session,
  onSignOut,
}: {
  store: ExpenseStore
  session: Session
  onSignOut?: () => void
}) {
  const [view, setView] = useState<View>('home')
  const home = () => setView('home')

  return (
    <Frame>
      {view === 'add' ? (
        <AddPurchaseScreen store={store} session={session} onClose={home} />
      ) : view === 'settle' ? (
        <SettleUpScreen store={store} session={session} onClose={home} />
      ) : (
        <HomeScreen
          store={store}
          session={session}
          onAdd={() => setView('add')}
          onSettleUp={() => setView('settle')}
          onSignOut={onSignOut}
        />
      )}
    </Frame>
  )
}
