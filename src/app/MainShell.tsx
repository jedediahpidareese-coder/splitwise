import { useEffect, useState } from 'react'
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

  // Tie sub-screens into browser history so the Android/browser Back gesture
  // (and the in-app back arrow) returns to Home instead of closing the app.
  useEffect(() => {
    const onPop = () => setView('home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openSub(next: 'add' | 'settle' | 'detail', id?: string) {
    if (id) setDetailId(id)
    setView(next)
    window.history.pushState({ sub: next }, '')
  }
  // Pop the history entry we pushed; the popstate handler resets to Home.
  const goBack = () => window.history.back()

  const detailExpense =
    view === 'detail' ? store.expenses.find((e) => e.id === detailId) : undefined

  return (
    <Frame>
      {view === 'add' ? (
        <AddPurchaseScreen store={store} session={session} onClose={goBack} />
      ) : view === 'settle' ? (
        <SettleUpScreen store={store} session={session} onClose={goBack} />
      ) : view === 'detail' && detailExpense ? (
        <ExpenseDetailScreen
          expense={detailExpense}
          session={session}
          store={store}
          onClose={goBack}
        />
      ) : (
        <HomeScreen
          store={store}
          session={session}
          onAdd={() => openSub('add')}
          onSettleUp={() => openSub('settle')}
          onOpenExpense={(id) => openSub('detail', id)}
          onSignOut={onSignOut}
        />
      )}
    </Frame>
  )
}
