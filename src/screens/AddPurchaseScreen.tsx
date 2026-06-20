import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { ArrowRight, Camera, ChevronLeft, X } from 'lucide-react'
import type { Category, SplitType } from '../types'
import type { ExpenseStore, ReceiptInput, Session } from '../data/storeTypes'
import { CATEGORIES } from '../lib/categories'
import { formatCurrency } from '../lib/format'
import { otherName } from '../lib/identity'
import { processReceipt } from '../lib/image'
import { useDialog } from '../components/dialog'

interface Props {
  store: ExpenseStore
  session: Session
  onClose: () => void
}

export default function AddPurchaseScreen({ store, session, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paidBy, setPaidBy] = useState<string>(session.viewerId)
  const [splitType, setSplitType] = useState<SplitType>('even')
  const [category, setCategory] = useState<Category>('groceries')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<ReceiptInput | undefined>()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { alert } = useDialog()

  const them = otherName(session)
  const otherId = session.other?.id ?? ''

  const amountNum = Math.round((parseFloat(amount) || 0) * 100) / 100
  const share = splitType === 'even' ? amountNum / 2 : amountNum
  const valid = amountNum > 0 && description.trim().length > 0
  const paidByMe = paidBy === session.viewerId

  const summary = useMemo(() => {
    if (amountNum <= 0) return null
    return paidByMe
      ? `${them} will owe you ${formatCurrency(share)}`
      : `You will owe ${them} ${formatCurrency(share)}`
  }, [paidByMe, share, amountNum, them])

  async function onPickReceipt(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setReceipt(await processReceipt(file))
    } catch {
      await alert({
        title: 'Couldn’t read that image',
        message: 'Please try a different photo.',
      })
    } finally {
      e.target.value = ''
    }
  }

  async function save() {
    if (!valid || busy) return
    setBusy(true)
    try {
      await store.addExpense({
        amount: amountNum,
        description: description.trim(),
        paidById: paidBy,
        splitType,
        category,
        note: note.trim() || undefined,
        receipt,
      })
      onClose()
    } catch (err) {
      setBusy(false)
      await alert({
        title: 'Could not save',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const payers = [
    { id: session.viewerId, label: 'You' },
    { id: otherId, label: them },
  ]

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
        <h1 className="text-lg font-semibold text-slate-900">Add purchase</h1>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-32 pt-2">
        <Field label="Amount">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-teal-600">
            <span className="text-2xl font-semibold text-slate-400">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent py-2.5 pl-1 text-2xl font-semibold outline-none placeholder:text-slate-300"
            />
          </div>
        </Field>

        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it for?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 placeholder:text-slate-400"
          />
        </Field>

        <Field label="Who paid?">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-300">
            {payers.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaidBy(p.id)}
                className={`py-2.5 text-sm font-medium transition-colors ${
                  i === 1 ? 'border-l border-slate-300' : ''
                } ${
                  paidBy === p.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="How to split?">
          <div className="space-y-2">
            <SplitOption
              selected={splitType === 'even'}
              onSelect={() => setSplitType('even')}
              title="Split evenly"
              subtitle="You each owe half"
            />
            <SplitOption
              selected={splitType === 'owed_full'}
              onSelect={() => setSplitType('owed_full')}
              title={paidByMe ? `${them} owes the full amount` : 'You owe the full amount'}
              subtitle={paidByMe ? `You lent it to ${them}` : `${them} lent it to you`}
            />
          </div>
        </Field>

        {summary && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
            <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />
            <span>{summary}</span>
          </div>
        )}

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ key, label, Icon }) => {
              const on = category === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    on
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 placeholder:text-slate-400"
          />
        </Field>

        <Field label="Receipt (optional)">
          {receipt ? (
            <div className="relative inline-block">
              <img
                src={receipt.dataUrl}
                alt="Receipt preview"
                className="max-h-44 rounded-lg border border-slate-200"
              />
              <button
                type="button"
                aria-label="Remove receipt"
                onClick={() => setReceipt(undefined)}
                className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-3.5 text-sm text-slate-500"
            >
              <Camera size={18} aria-hidden="true" />
              Add receipt photo
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickReceipt}
            className="hidden"
          />
        </Field>
      </main>

      <div className="safe-bottom sticky bottom-0 border-t border-slate-200 bg-slate-50 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={save}
          disabled={!valid || busy}
          className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-300"
        >
          {busy ? 'Saving…' : 'Save purchase'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block px-1 text-xs text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function SplitOption({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left ${
        selected ? 'border-2 border-teal-600 bg-teal-50' : 'border border-slate-300 bg-white'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-teal-600' : 'border-slate-300'
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
      </span>
    </button>
  )
}
