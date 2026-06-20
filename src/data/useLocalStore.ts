import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Expense, Settlement } from '../types'
import type { ExpenseStore, NewExpenseInput, Session } from './storeTypes'
import { computeBalance } from '../lib/balance'
import {
  LOCAL_ME,
  LOCAL_OTHER,
  seedExpenses,
  seedSettlements,
} from './sampleData'

const KEY = 'splitwise.v2'

interface Persisted {
  expenses: Expense[]
  settlements: Settlement[]
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>
      return {
        expenses: parsed.expenses ?? [],
        settlements: parsed.settlements ?? [],
      }
    }
  } catch {
    // Corrupt or unavailable storage -> fall back to demo data.
  }
  return { expenses: seedExpenses, settlements: seedSettlements }
}

const SESSION: Session = {
  viewerId: LOCAL_ME.id,
  viewer: LOCAL_ME,
  other: LOCAL_OTHER,
  soloDemo: true,
}

// LOCAL-mode store (no sign-in, data only on this device). Implements the same
// ExpenseStore surface as the cloud store so the screens are backend-agnostic.
export function useLocalStore(): { store: ExpenseStore; session: Session } {
  const [state, setState] = useState<Persisted>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked: keep working in-memory for this session.
    }
  }, [state])

  const addExpense = useCallback(async (input: NewExpenseInput) => {
    const expense: Expense = {
      id: newId(),
      createdAt: new Date().toISOString(),
      amount: input.amount,
      description: input.description,
      paidById: input.paidById,
      splitType: input.splitType,
      category: input.category,
      note: input.note,
      receiptUrl: input.receipt?.dataUrl,
    }
    setState((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
  }, [])

  const deleteExpense = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }))
  }, [])

  const settleUp = useCallback(async () => {
    setState((s) => {
      // Don't allow a second request while one is already pending.
      if (s.settlements.some((x) => x.status === 'pending')) return s
      const bal = computeBalance(s.expenses, s.settlements, LOCAL_ME.id)
      if (Math.abs(bal) < 0.005) return s
      const settlement: Settlement = {
        id: newId(),
        amount: Math.abs(bal),
        fromId: bal > 0 ? LOCAL_OTHER.id : LOCAL_ME.id,
        toId: bal > 0 ? LOCAL_ME.id : LOCAL_OTHER.id,
        requestedBy: LOCAL_ME.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      return { ...s, settlements: [settlement, ...s.settlements] }
    })
  }, [])

  const approveSettlement = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      settlements: s.settlements.map((x) =>
        x.id === id
          ? { ...x, status: 'approved', approvedAt: new Date().toISOString() }
          : x,
      ),
    }))
  }, [])

  const cancelSettlement = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      settlements: s.settlements.filter((x) => x.id !== id),
    }))
  }, [])

  const resetDemo = useCallback(() => {
    setState({ expenses: seedExpenses, settlements: seedSettlements })
  }, [])

  const balance = useMemo(
    () => computeBalance(state.expenses, state.settlements, LOCAL_ME.id),
    [state],
  )

  const pendingSettlement =
    state.settlements.find((s) => s.status === 'pending') ?? null

  const store: ExpenseStore = {
    expenses: state.expenses,
    settlements: state.settlements,
    balance,
    pendingSettlement,
    ready: true,
    error: null,
    addExpense,
    deleteExpense,
    settleUp,
    approveSettlement,
    cancelSettlement,
    resetDemo,
  }

  return { store, session: SESSION }
}
