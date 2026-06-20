import { useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import type { ExpenseStore, Session } from '../data/storeTypes'
import {
  netOfExpenses,
  settledExpenseIds,
  shareOwedByNonPayer,
} from '../lib/balance'
import { categoryMeta } from '../lib/categories'
import { formatCurrency } from '../lib/format'
import { describeSplit, otherName } from '../lib/identity'

interface Props {
  store: ExpenseStore
  session: Session
  onClose: () => void
}

export default function SettleUpScreen({ store, session, onClose }: Props) {
  const settled = settledExpenseIds(store.settlements)
  const outstanding = store.expenses.filter((e) => !settled.has(e.id))

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)

  const them = otherName(session)
  const allSelected = outstanding.length > 0 && selected.size === outstanding.length

  const net = useMemo(
    () => netOfExpenses(outstanding, selected, session.viewerId),
    [outstanding, selected, session.viewerId],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(outstanding.map((e) => e.id)))
  }

  async function submit() {
    if (selected.size === 0 || busy) return
    setBusy(true)
    try {
      await store.settleUp([...selected])
      onClose()
    } catch (err) {
      setBusy(false)
      alert(`Could not start settle-up: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const summary =
    selected.size === 0
      ? null
      : net > 0.005
        ? `${them} will pay you ${formatCurrency(net)}`
        : net < -0.005
          ? `You'll pay ${them} ${formatCurrency(-net)}`
          : 'These cancel out — nothing changes hands'

  return (
    <div className="flex min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 flex items-center gap-2 bg-slate-50/90 px-3 pb-3 pt-4 backdrop-blur">
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

      <main className="flex-1 px-4 pb-32 pt-1">
        {outstanding.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-slate-400">
            Nothing to settle — you’re all settled up.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-sm text-slate-500">Pick what you’re squaring up</p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm font-medium text-teal-700"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>

            <div>
              {outstanding.map((e) => {
                const on = selected.has(e.id)
                const { Icon } = categoryMeta(e.category)
                const share = shareOwedByNonPayer(e)
                const youAreOwed = e.paidById === session.viewerId
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="flex w-full items-center gap-3 border-t border-slate-100 py-2.5 text-left"
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
                        {formatCurrency(share)}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {youAreOwed ? `${them} owes` : 'you owe'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>

      {outstanding.length > 0 && (
        <div className="safe-bottom sticky bottom-0 border-t border-slate-200 bg-slate-50 px-4 pb-4 pt-3">
          {summary && (
            <p className="mb-2 text-center text-sm text-slate-600">{summary}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={selected.size === 0 || busy}
            className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-300"
          >
            {busy
              ? 'Sending…'
              : selected.size === 0
                ? 'Select transactions'
                : `Request settle-up · ${selected.size} item${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
