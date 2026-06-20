import { useState } from 'react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import Frame from './Frame'
import HomeScreen from '../screens/HomeScreen'
import AddPurchaseScreen from '../screens/AddPurchaseScreen'

type View = 'home' | 'add'

// The signed-in (or local) experience: switches between Home and Add.
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

  return (
    <Frame>
      {view === 'home' ? (
        <HomeScreen
          store={store}
          session={session}
          onAdd={() => setView('add')}
          onSignOut={onSignOut}
        />
      ) : (
        <AddPurchaseScreen
          store={store}
          session={session}
          onClose={() => setView('home')}
        />
      )}
    </Frame>
  )
}
