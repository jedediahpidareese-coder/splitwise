import { Trash2 } from 'lucide-react'
import type { Expense } from '../types'
import type { Session } from '../data/storeTypes'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatDate } from '../lib/format'
import { describeSplit } from '../lib/identity'

interface Props {
  expense: Expense
  session: Session
  onDelete: (id: string) => void
}

export default function ExpenseRow({ expense, session, onDelete }: Props) {
  const { Icon } = categoryMeta(expense.category)

  return (
    <div className="group flex items-center gap-3 border-t border-slate-100 py-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon size={18} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {expense.description}
        </div>
        <div className="truncate text-xs text-slate-500">
          {describeSplit(expense, session)}
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

      <button
        type="button"
        aria-label={`Delete ${expense.description}`}
        onClick={() => {
          if (confirm(`Delete "${expense.description}"?`)) onDelete(expense.id)
        }}
        className="ml-1 rounded-md p-1 text-slate-300 hover:text-rose-500 active:scale-90"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
