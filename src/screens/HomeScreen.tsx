import { LogOut, Plus, RefreshCw } from 'lucide-react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import { otherName } from '../lib/identity'
import BalanceCard from '../components/BalanceCard'
import ExpenseRow from '../components/ExpenseRow'

interface Props {
  store: ExpenseStore
  session: Session
  onAdd: () => void
  onSignOut?: () => void
}

export default function HomeScreen({ store, session, onAdd, onSignOut }: Props) {
  const { expenses, balance, settleUp, deleteExpense, resetDemo } = store

  return (
    <div className="flex min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 bg-slate-50/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">SplitWise</h1>
          <div className="flex items-center gap-1">
            {resetDemo && (
              <button
                type="button"
                aria-label="Reset demo data"
                title="Reset demo data"
                onClick={() => {
                  if (confirm('Reset to the original example purchases?')) resetDemo()
                }}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <RefreshCw size={20} aria-hidden="true" />
              </button>
            )}
            {onSignOut && (
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={onSignOut}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <LogOut size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        <BalanceCard
          balance={balance}
          otherName={otherName(session)}
          onSettle={settleUp}
        />

        <h2 className="mb-1 mt-6 px-1 text-sm text-slate-500">Recent</h2>

        {expenses.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-slate-400">
            No purchases yet. Tap “Add purchase” to start.
          </p>
        ) : (
          <div>
            {expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                session={session}
                onDelete={deleteExpense}
              />
            ))}
          </div>
        )}
      </main>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-5">
        <button
          type="button"
          onClick={onAdd}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/20 active:scale-95"
        >
          <Plus size={18} aria-hidden="true" />
          Add purchase
        </button>
      </div>
    </div>
  )
}
