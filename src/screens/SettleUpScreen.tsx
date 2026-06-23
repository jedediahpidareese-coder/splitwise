import { useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import {
  outstandingExpenses,
  remainingForExpense,
  transferForAllocations,
} from '../lib/balance'
import { categoryMeta } from '../lib/categories'
import { formatCurrency } from '../lib/format'
import { describeSplit, otherName } from '../lib/identity'
import { useDialog } from '../components/dialog'

type Mode = 'items' | 'general'

export default function SettleUpScreen({
  store,
  session,
  onClose,
}: {
  store: ExpenseStore
  session: Session
  onClose: () => void
}) {
  const { alert } = useDialog()
  const them = otherName(session)
  const otherId = session.other?.id ?? ''

  const outstanding = outstandingExpenses(store.expenses, store.settlements)

  const [mode, setMode] = useState<Mode>('items')
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState(() => Math.abs(store.balance).toFixed(2))
  const [busy, setBusy] = useState(false)

  function toggle(id: string, remaining: number) {
    setAmounts((prev) => {
      const next = { ...prev }
      if (id in next) delete next[id]
      else next[id] = remaining.toFixed(2)
      return next
    })
  }

  // Clamped per-item amounts (0 < amount <= remaining).
  const allocations = useMemo(() => {
    const a: Record<string, number> = {}
    for (const e of outstanding) {
      if (!(e.id in amounts)) continue
      const rem = remainingForExpense(e, store.settlements)
      let v = parseFloat(amounts[e.id]) || 0
      v = Math.min(Math.max(0, v), rem)
      v = Math.round(v * 100) / 100
      if (v > 0) a[e.id] = v
    }
    return a
  }, [amounts, outstanding, store.settlements])

  const itemsTransfer = useMemo(
    () => transferForAllocations(store.expenses, allocations, session.viewerId, otherId),
    [allocations, store.expenses, session.viewerId, otherId],
  )

  const generalAmt = Math.min(
    Math.max(0, parseFloat(general) || 0),
    Math.abs(store.balance),
  )
  const youOwe = store.balance < 0

  async function submit() {
    if (busy) return
    try {
      if (mode === 'items') {
        if (Object.keys(allocations).length === 0) return
        setBusy(true)
        await store.settleUp({ kind: 'items', allocations })
      } else {
        if (generalAmt <= 0) return
        setBusy(true)
        await store.settleUp({ kind: 'general', amount: generalAmt })
      }
      onClose()
    } catch (err) {
      setBusy(false)
      await alert({
        title: 'Could not start settle-up',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const itemsSummary =
    itemsTransfer.amount < 0.005
      ? null
      : itemsTransfer.fromId === session.viewerId
        ? `You'll pay ${them} ${formatCurrency(itemsTransfer.amount)}`
        : `${them} will pay you ${formatCurrency(itemsTransfer.amount)}`

  const generalSummary =
    generalAmt < 0.005
      ? null
      : youOwe
        ? `You'll pay ${them} ${formatCurrency(generalAmt)}`
        : `${them} will pay you ${formatCurrency(generalAmt)}`

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 bg-slate-50/90 px-3 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.75rem)' }}
      >
        <button
          type="button"
          aria-label="Cancel"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 active:scale-90"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Settle up</h1>
      </header>

      <main className="flex-1 px-4 pb-32 pt-2">
        <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-300">
          {(['items', 'general'] as Mode[]).map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-2 text-sm font-medium ${i === 1 ? 'border-l border-slate-300' : ''} ${
                mode === m ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
              }`}
            >
              {m === 'items' ? 'Specific transactions' : 'Whole balance'}
            </button>
          ))}
        </div>

        {mode === 'items' ? (
          outstanding.length === 0 ? (
            <p className="px-1 py-10 text-center text-sm text-slate-400">
              Nothing to settle — you’re all settled up.
            </p>
          ) : (
            <div>
              <p className="px-1 pb-1 text-sm text-slate-500">
                Pick transactions; pay the full amount or type a partial amount.
              </p>
              {outstanding.map((e) => {
                const on = e.id in amounts
                const rem = remainingForExpense(e, store.settlements)
                const { Icon } = categoryMeta(e.category)
                const youAreOwed = e.paidById === session.viewerId
                return (
                  <div key={e.id} className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggle(e.id, rem)}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                          on ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {on && <Check size={14} aria-hidden="true" />}
                      </span>
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {e.description}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {describeSplit(e, session)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-medium text-slate-900">
                          {formatCurrency(rem)}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {youAreOwed ? `${them} owes` : 'you owe'}
                        </span>
                      </span>
                    </button>
                    {on && (
                      <div className="flex items-center gap-2 pb-2.5 pl-8">
                        <span className="text-xs text-slate-500">Pay</span>
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white px-2">
                          <span className="text-sm text-slate-400">$</span>
                          <input
                            value={amounts[e.id]}
                            onChange={(ev) =>
                              setAmounts((p) => ({ ...p, [e.id]: ev.target.value }))
                            }
                            inputMode="decimal"
                            className="w-20 bg-transparent py-1.5 pl-1 text-sm outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAmounts((p) => ({ ...p, [e.id]: rem.toFixed(2) }))
                          }
                          className="text-xs font-medium text-teal-700"
                        >
                          Full
                        </button>
                        <span className="text-xs text-slate-400">
                          of {formatCurrency(rem)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : Math.abs(store.balance) < 0.005 ? (
          <p className="px-1 py-10 text-center text-sm text-slate-400">
            You’re all settled up.
          </p>
        ) : (
          <div className="px-1">
            <p className="text-sm text-slate-600">
              {youOwe ? `You owe ${them}` : `${them} owes you`}{' '}
              <span className="font-medium">{formatCurrency(Math.abs(store.balance))}</span>
            </p>
            <label className="mb-1.5 mt-4 block text-xs text-slate-500">
              Amount to pay
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3">
              <span className="text-xl font-semibold text-slate-400">$</span>
              <input
                value={general}
                onChange={(e) => setGeneral(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent py-2.5 pl-1 text-xl font-semibold outline-none"
              />
              <button
                type="button"
                onClick={() => setGeneral(Math.abs(store.balance).toFixed(2))}
                className="text-xs font-medium text-teal-700"
              >
                Full
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Pay any amount up to {formatCurrency(Math.abs(store.balance))}.
            </p>
          </div>
        )}
      </main>

      <div className="safe-bottom sticky bottom-0 border-t border-slate-200 bg-slate-50 px-4 pb-4 pt-3">
        {(mode === 'items' ? itemsSummary : generalSummary) && (
          <p className="mb-2 text-center text-sm text-slate-600">
            {mode === 'items' ? itemsSummary : generalSummary}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            (mode === 'items'
              ? Object.keys(allocations).length === 0
              : generalAmt <= 0)
          }
          className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-300"
        >
          {busy ? 'Sending…' : 'Request settle-up'}
        </button>
      </div>
    </div>
  )
}
