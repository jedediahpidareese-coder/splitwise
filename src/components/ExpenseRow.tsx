import { Trash2 } from 'lucide-react'
import type { Expense } from '../types'
import type { Session } from '../data/storeTypes'
import { categoryMeta } from '../lib/categories'
import { shareOwedByNonPayer } from '../lib/balance'
import { formatCurrency, formatDate } from '../lib/format'
import { describeSplit } from '../lib/identity'
import { useDialog } from './dialog'

interface Props {
  expense: Expense
  session: Session
  onDelete: (id: string) => void
  onOpen: (id: string) => void
  remaining?: number // amount still owed on this transaction, if partially paid
}

export default function ExpenseRow({ expense, session, onDelete, onOpen, remaining }: Props) {
  const { Icon } = categoryMeta(expense.category)
  const { confirm } = useDialog()
  const share = shareOwedByNonPayer(expense)
  const partiallyPaid =
    typeof remaining === 'number' && remaining > 0.005 && remaining < share - 0.005

  return (
    <div className="flex items-center border-t border-slate-100">
      <button
        type="button"
        onClick={() => onOpen(expense.id)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left active:bg-slate-50"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon size={18} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-900">
            {expense.description}
          </div>
          <div className="truncate text-xs text-slate-500">
            {describeSplit(expense, session)}
            {partiallyPaid && (
              <span className="text-amber-600">
                {' '}
                · {formatCurrency(remaining as number)} left
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">
            {formatCurrency(expense.amount)}
          </div>
          <div className="text-[11px] text-slate-400">
            {formatDate(expense.createdAt)}
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={`Delete ${expense.description}`}
        onClick={async () => {
          const ok = await confirm({
            title: 'Delete this purchase?',
            message: `“${expense.description}” will be removed for both of you.`,
            confirmLabel: 'Delete',
            destructive: true,
          })
          if (ok) onDelete(expense.id)
        }}
        className="ml-1 rounded-md p-1 text-slate-300 hover:text-rose-500 active:scale-90"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
