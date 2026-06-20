import { formatCurrency } from '../lib/format'

interface Props {
  balance: number // >0 the other owes you, <0 you owe them
  otherName: string
  onSettle: () => void
}

export default function BalanceCard({ balance, otherName, onSettle }: Props) {
  const settled = Math.abs(balance) < 0.005
  const theyOweYou = balance > 0

  const label = settled
    ? "You're all settled up"
    : theyOweYou
      ? `${otherName} owes you`
      : `You owe ${otherName}`

  const tone = settled
    ? 'bg-slate-200 text-slate-700'
    : theyOweYou
      ? 'bg-teal-600 text-white'
      : 'bg-rose-500 text-white'

  return (
    <div className={`rounded-2xl px-5 py-4 ${tone}`}>
      <div className="text-sm opacity-90">{label}</div>

      {!settled ? (
        <>
          <div className="mt-1 text-3xl font-semibold tracking-tight">
            {formatCurrency(Math.abs(balance))}
          </div>
          <button
            type="button"
            onClick={onSettle}
            className="mt-3 rounded-lg bg-white/95 px-3.5 py-1.5 text-sm font-medium text-slate-800 active:scale-95"
          >
            Settle up
          </button>
        </>
      ) : (
        <div className="mt-1 text-sm opacity-90">Nothing owed either way.</div>
      )}
    </div>
  )
}
