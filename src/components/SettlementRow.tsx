import { Check, Trash2 } from 'lucide-react'
import type { Settlement } from '../types'
import type { Session } from '../data/storeTypes'
import { otherName } from '../lib/identity'
import { formatCurrency, formatDate } from '../lib/format'

interface Props {
  settlement: Settlement
  session: Session
  onUndo: (id: string) => void
}

export default function SettlementRow({ settlement, session, onUndo }: Props) {
  const fromMe = settlement.fromId === session.viewerId
  const them = otherName(session)
  const direction = fromMe ? `You paid ${them}` : `${them} paid you`
  const count = settlement.expenseIds.length
  const subtitle =
    count > 0 ? `${count} item${count === 1 ? '' : 's'} · ${direction}` : direction
  const when = settlement.approvedAt ?? settlement.createdAt

  return (
    <div className="flex items-center gap-3 border-t border-slate-100 py-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
        <Check size={18} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">Settled up</div>
        <div className="truncate text-xs text-slate-500">{subtitle}</div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-slate-900">
          {formatCurrency(settlement.amount)}
        </div>
        <div className="text-[11px] text-slate-400">{formatDate(when)}</div>
      </div>

      <button
        type="button"
        aria-label="Undo this settle-up"
        onClick={() => {
          if (confirm('Undo this settle-up? The balance will come back.')) {
            onUndo(settlement.id)
          }
        }}
        className="ml-1 rounded-md p-1 text-slate-300 hover:text-rose-500 active:scale-90"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
