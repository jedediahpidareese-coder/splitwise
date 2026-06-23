import { Clock, LogOut, Plus, RefreshCw } from 'lucide-react'
import type { Expense, Settlement } from '../types'
import type { ExpenseStore, Session } from '../data/storeTypes'
import { nameFor, otherName } from '../lib/identity'
import { formatCurrency } from '../lib/format'
import { outstandingExpenses, remainingForExpense } from '../lib/balance'
import BalanceCard from '../components/BalanceCard'
import ExpenseRow from '../components/ExpenseRow'
import SettlementRow from '../components/SettlementRow'
import NotificationsBell from '../components/NotificationsBell'
import { useDialog } from '../components/dialog'

interface Props {
  store: ExpenseStore
  session: Session
  onAdd: () => void
  onSettleUp: () => void
  onSignOut?: () => void
}

type Item =
  | { kind: 'expense'; date: string; expense: Expense }
  | { kind: 'settlement'; date: string; settlement: Settlement }

export default function HomeScreen({
  store,
  session,
  onAdd,
  onSettleUp,
  onSignOut,
}: Props) {
  const {
    expenses,
    settlements,
    balance,
    pendingSettlement,
    approveSettlement,
    cancelSettlement,
    deleteExpense,
    resetDemo,
  } = store

  // Fully-paid transactions drop off the active list; the settle-up entry
  // stands in for them (and can be undone).
  const outstanding = outstandingExpenses(expenses, settlements)
  const approved = settlements.filter((s) => s.status === 'approved')
  const { confirm } = useDialog()

  const items: Item[] = [
    ...outstanding.map((e): Item => ({ kind: 'expense', date: e.createdAt, expense: e })),
    ...approved.map((s): Item => ({
      kind: 'settlement',
      date: s.approvedAt ?? s.createdAt,
      settlement: s,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-10 bg-slate-50/90 px-4 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">SplitWise</h1>
          <div className="flex items-center gap-1">
            {!session.soloDemo && <NotificationsBell userId={session.viewerId} />}
            {resetDemo && (
              <button
                type="button"
                aria-label="Reset demo data"
                title="Reset demo data"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Reset demo data?',
                    message: 'Restores the original example purchases.',
                    confirmLabel: 'Reset',
                  })
                  if (ok) resetDemo()
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
          onSettle={onSettleUp}
          canSettle={!pendingSettlement}
        />

        {pendingSettlement && (
          <PendingSettleBanner
            settlement={pendingSettlement}
            session={session}
            onApprove={() => approveSettlement(pendingSettlement.id)}
            onCancel={() => cancelSettlement(pendingSettlement.id)}
          />
        )}

        <h2 className="mb-1 mt-6 px-1 text-sm text-slate-500">Recent</h2>

        {items.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-slate-400">
            No purchases yet. Tap “Add purchase” to start.
          </p>
        ) : (
          <div>
            {items.map((it) =>
              it.kind === 'expense' ? (
                <ExpenseRow
                  key={`e-${it.expense.id}`}
                  expense={it.expense}
                  session={session}
                  onDelete={deleteExpense}
                  remaining={remainingForExpense(it.expense, settlements)}
                />
              ) : (
                <SettlementRow
                  key={`s-${it.settlement.id}`}
                  settlement={it.settlement}
                  session={session}
                  onUndo={cancelSettlement}
                />
              ),
            )}
          </div>
        )}
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}
      >
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

function PendingSettleBanner({
  settlement,
  session,
  onApprove,
  onCancel,
}: {
  settlement: Settlement
  session: Session
  onApprove: () => void
  onCancel: () => void
}) {
  const isRequester = settlement.requestedBy === session.viewerId
  const canApprove = !isRequester || session.soloDemo
  const count = settlement.expenseIds.length

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Clock size={18} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-900">
            {isRequester
              ? 'You asked to settle up'
              : `${nameFor(session, settlement.requestedBy)} wants to settle up`}{' '}
            {count > 0 ? `${count} item${count === 1 ? '' : 's'} · ` : ''}
            {formatCurrency(settlement.amount)}
          </div>
          <div className="text-xs text-amber-700">
            {isRequester
              ? `Waiting for ${otherName(session)} to approve.`
              : 'Approve to clear what’s owed.'}
          </div>
          <div className="mt-2.5 flex gap-2">
            {canApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white active:scale-95"
              >
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 active:scale-95"
            >
              {isRequester ? 'Undo' : 'Decline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
