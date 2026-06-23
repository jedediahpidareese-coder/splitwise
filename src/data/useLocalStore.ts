import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Expense, Settlement } from '../types'
import type { ExpenseStore, NewExpenseInput, Session } from './storeTypes'
import { computeBalance, transferForAllocations } from '../lib/balance'
import type { SettleInput } from './storeTypes'
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

  const settleUp = useCallback(async (input: SettleInput) => {
    setState((s) => {
      // Don't allow a second request while one is already pending.
      if (s.settlements.some((x) => x.status === 'pending')) return s

      let fromId = LOCAL_ME.id
      let toId = LOCAL_OTHER.id
      let amount = 0
      let allocations: Record<string, number> = {}

      if (input.kind === 'items') {
        allocations = Object.fromEntries(
          Object.entries(input.allocations).filter(([, v]) => v > 0),
        )
        if (Object.keys(allocations).length === 0) return s
        const t = transferForAllocations(
          s.expenses,
          allocations,
          LOCAL_ME.id,
          LOCAL_OTHER.id,
        )
        fromId = t.fromId
        toId = t.toId
        amount = t.amount
      } else {
        amount = Math.round(input.amount * 100) / 100
        if (amount <= 0) return s
        const bal = computeBalance(s.expenses, s.settlements, LOCAL_ME.id)
        // The debtor pays the creditor.
        fromId = bal > 0 ? LOCAL_OTHER.id : LOCAL_ME.id
        toId = bal > 0 ? LOCAL_ME.id : LOCAL_OTHER.id
      }

      const settlement: Settlement = {
        id: newId(),
        amount,
        fromId,
        toId,
        requestedBy: LOCAL_ME.id,
        status: 'pending',
        expenseIds: Object.keys(allocations),
        allocations,
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
