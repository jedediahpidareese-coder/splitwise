import { useState } from 'react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import Frame from './Frame'
import HomeScreen from '../screens/HomeScreen'
import AddPurchaseScreen from '../screens/AddPurchaseScreen'
import SettleUpScreen from '../screens/SettleUpScreen'
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen'

type View = 'home' | 'add' | 'settle' | 'detail'

// The signed-in (or local) experience: Home, Add, Settle, and purchase detail.
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
  const [detailId, setDetailId] = useState<string | null>(null)
  const home = () => setView('home')

  const detailExpense =
    view === 'detail' ? store.expenses.find((e) => e.id === detailId) : undefined

  return (
    <Frame>
      {view === 'add' ? (
        <AddPurchaseScreen store={store} session={session} onClose={home} />
      ) : view === 'settle' ? (
        <SettleUpScreen store={store} session={session} onClose={home} />
      ) : view === 'detail' && detailExpense ? (
        <ExpenseDetailScreen
          expense={detailExpense}
          session={session}
          store={store}
          onClose={home}
        />
      ) : (
        <HomeScreen
          store={store}
          session={session}
          onAdd={() => setView('add')}
          onSettleUp={() => setView('settle')}
          onOpenExpense={(id) => {
            setDetailId(id)
            setView('detail')
          }}
          onSignOut={onSignOut}
        />
      )}
    </Frame>
  )
}
