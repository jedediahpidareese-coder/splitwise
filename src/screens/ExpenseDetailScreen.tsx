import { useState } from 'react'
import { ChevronLeft, Trash2 } from 'lucide-react'
import type { Expense } from '../types'
import type { ExpenseStore, Session } from '../data/storeTypes'
import { categoryMeta } from '../lib/categories'
import { shareOwedByNonPayer, remainingForExpense } from '../lib/balance'
import { formatCurrency } from '../lib/format'
import { nameFor, otherName } from '../lib/identity'
import { useDialog } from '../components/dialog'

export default function ExpenseDetailScreen({
  expense,
  session,
  store,
  onClose,
}: {
  expense: Expense
  session: Session
  store: ExpenseStore
  onClose: () => void
}) {
  const { confirm } = useDialog()
  const [zoom, setZoom] = useState(false)
  const { Icon, label } = categoryMeta(expense.category)

  const share = shareOwedByNonPayer(expense)
  const remaining = remainingForExpense(expense, store.settlements)
  const them = otherName(session)
  const splitText =
    expense.splitType === 'even'
      ? `Split evenly · ${nameFor(session, expense.paidById) === 'You' ? `${them} owes` : 'you owe'} ${formatCurrency(share)}`
      : `Full amount (a loan)`
  const date = new Date(expense.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  async function del() {
    const ok = await confirm({
      title: 'Delete this purchase?',
      message: `“${expense.description}” will be removed for both of you.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (ok) {
      await store.deleteExpense(expense.id)
      onClose()
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 bg-slate-50/90 px-3 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.75rem)' }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 active:scale-90"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="truncate text-lg font-semibold text-slate-900">
          {expense.description}
        </h1>
      </header>

      <main className="flex-1 px-4 pb-10 pt-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            {formatCurrency(expense.amount)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Icon size={16} aria-hidden="true" />
            {label}
          </div>

          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <Row term="Paid by" desc={nameFor(session, expense.paidById)} />
            <Row term="Split" desc={splitText} />
            {remaining > 0.005 && remaining < share - 0.005 && (
              <Row term="Still owed" desc={`${formatCurrency(remaining)} left`} />
            )}
            <Row term="Date" desc={date} />
            {expense.note && <Row term="Note" desc={expense.note} />}
          </dl>
        </div>

        <div className="mt-5">
          <h2 className="mb-2 px-1 text-sm text-slate-500">Receipt</h2>
          {expense.receiptUrl ? (
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="block w-full overflow-hidden rounded-xl border border-slate-200"
            >
              <img
                src={expense.receiptUrl}
                alt="Receipt"
                className="max-h-80 w-full object-contain bg-slate-100"
              />
            </button>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
              No receipt attached.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={del}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-3 text-sm font-medium text-rose-600 active:scale-[0.99]"
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete purchase
        </button>
      </main>

      {zoom && expense.receiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={expense.receiptUrl}
            alt="Receipt"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

function Row({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{term}</dt>
      <dd className="text-right font-medium text-slate-900">{desc}</dd>
    </div>
  )
}
