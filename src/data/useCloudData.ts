import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Expense, Profile, Settlement } from '../types'
import type { ExpenseStore, NewExpenseInput, Session } from './storeTypes'
import { computeBalance, netOfExpenses } from '../lib/balance'
import { formatCurrency } from '../lib/format'
import { notifyOther } from '../lib/push'

type Status = 'loading' | 'needs-profile' | 'ready' | 'error'

interface ExpenseRow {
  id: string
  amount: number | string
  description: string
  paid_by: string
  split_type: Expense['splitType']
  category: Expense['category']
  note: string | null
  receipt_url: string | null
  created_at: string
}

interface SettlementRow {
  id: string
  amount: number | string
  from_id: string
  to_id: string
  requested_by: string
  status: Settlement['status']
  expense_ids: string[] | null
  created_at: string
  approved_at: string | null
}

interface ProfileRow {
  id: string
  display_name: string
}

function toExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    amount: Number(r.amount),
    description: r.description,
    paidById: r.paid_by,
    splitType: r.split_type,
    category: r.category,
    note: r.note ?? undefined,
    receiptUrl: r.receipt_url ?? undefined,
    createdAt: r.created_at,
  }
}

function toSettlement(r: SettlementRow): Settlement {
  return {
    id: r.id,
    amount: Number(r.amount),
    fromId: r.from_id,
    toId: r.to_id,
    requestedBy: r.requested_by,
    status: r.status,
    expenseIds: r.expense_ids ?? [],
    createdAt: r.created_at,
    approvedAt: r.approved_at ?? undefined,
  }
}

function toProfile(r: ProfileRow): Profile {
  return { id: r.id, displayName: r.display_name }
}

export interface CloudData {
  status: Status
  error: string | null
  session: Session | null
  store: ExpenseStore | null
  createProfile: (displayName: string) => Promise<void>
  signOut: () => Promise<void>
  retry: () => Promise<void>
}

const RECEIPTS_BUCKET = 'receipts'

// Cloud-mode data: loads profiles/expenses/settlements, keeps them in sync via
// Supabase Realtime, and exposes the same ExpenseStore surface as local mode.
export function useCloudData(user: User): CloudData {
  // supabase is guaranteed non-null in cloud mode (App only renders this then).
  const sb = supabase!
  const userId = user.id

  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  // Stable per-instance channel name + a monotonic refetch token (below).
  const [channelId] = useState(() => crypto.randomUUID())
  const reqSeq = useRef(0)

  const refetch = useCallback(async () => {
    const seq = ++reqSeq.current
    const [p, e, s] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('expenses').select('*').order('created_at', { ascending: false }),
      sb.from('settlements').select('*').order('created_at', { ascending: false }),
    ])
    if (p.error) throw p.error
    if (e.error) throw e.error
    if (s.error) throw s.error
    // Ignore a response that a newer refetch has already superseded, so
    // out-of-order network replies can't overwrite fresher data.
    if (seq !== reqSeq.current) return
    setProfiles(((p.data ?? []) as ProfileRow[]).map(toProfile))
    setExpenses(((e.data ?? []) as ExpenseRow[]).map(toExpense))
    setSettlements(((s.data ?? []) as SettlementRow[]).map(toSettlement))
  }, [sb])

  // Initial load.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refetch()
        if (active) setLoaded(true)
      } catch (err) {
        if (active) setError(messageOf(err))
      }
    })()
    return () => {
      active = false
    }
  }, [refetch])

  // Live updates from either person. Coalesce bursts (and the echo of our own
  // writes) into a single trailing refetch, and use a unique channel name so a
  // remount can't collide with a not-yet-removed channel.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void refetch().catch((err) => console.warn('Background sync failed:', err))
      }, 250)
    }
    const channel = sb
      .channel(`splitwise-db-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, schedule)
      .subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void sb.removeChannel(channel)
    }
  }, [sb, refetch, channelId])

  const createProfile = useCallback(
    async (displayName: string) => {
      const { error: err } = await sb
        .from('profiles')
        .insert({ id: userId, display_name: displayName.trim() })
      if (err) throw err
      await refetch()
    },
    [sb, userId, refetch],
  )

  const uploadReceipt = useCallback(
    async (input: NewExpenseInput): Promise<string | undefined> => {
      if (!input.receipt) return undefined
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error: err } = await sb.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, input.receipt.blob, { contentType: 'image/jpeg' })
      if (err) throw err
      return sb.storage.from(RECEIPTS_BUCKET).getPublicUrl(path).data.publicUrl
    },
    [sb, userId],
  )

  const addExpense = useCallback(
    async (input: NewExpenseInput) => {
      const receiptUrl = await uploadReceipt(input)
      const { error: err } = await sb.from('expenses').insert({
        amount: input.amount,
        description: input.description,
        paid_by: input.paidById,
        split_type: input.splitType,
        category: input.category,
        note: input.note ?? null,
        receipt_url: receiptUrl ?? null,
        created_by: userId,
      })
      if (err) throw err
      await refetch()
      const meName =
        profiles.find((p) => p.id === userId)?.displayName ?? 'Your partner'
      void notifyOther(
        'SplitWise',
        `${meName} added ${input.description} · ${formatCurrency(input.amount)}`,
      )
    },
    [sb, userId, uploadReceipt, refetch, profiles],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      const { error: err } = await sb.from('expenses').delete().eq('id', id)
      if (err) throw err
      await refetch()
    },
    [sb, refetch],
  )

  const settleUp = useCallback(
    async (expenseIds: string[]) => {
      if (settlements.some((s) => s.status === 'pending')) return
      if (expenseIds.length === 0) return
      const other = profiles.find((p) => p.id !== userId)
      if (!other) return
      const net = netOfExpenses(expenses, new Set(expenseIds), userId)
      const fromId = net >= 0 ? other.id : userId
      const toId = net >= 0 ? userId : other.id
      const { error: err } = await sb.from('settlements').insert({
        amount: Math.abs(net),
        from_id: fromId,
        to_id: toId,
        requested_by: userId,
        status: 'pending',
        expense_ids: expenseIds,
        created_by: userId,
      })
      if (err) throw err
      await refetch()
      const meName =
        profiles.find((p) => p.id === userId)?.displayName ?? 'Your partner'
      const n = expenseIds.length
      void notifyOther(
        'SplitWise',
        `${meName} wants to settle up ${n} item${n === 1 ? '' : 's'} · ${formatCurrency(Math.abs(net))}`,
      )
    },
    [sb, userId, expenses, settlements, profiles, refetch],
  )

  const approveSettlement = useCallback(
    async (id: string) => {
      const { error: err } = await sb
        .from('settlements')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', id)
      if (err) throw err
      await refetch()
      const meName =
        profiles.find((p) => p.id === userId)?.displayName ?? 'Your partner'
      void notifyOther('SplitWise', `${meName} approved the settle-up`)
    },
    [sb, userId, profiles, refetch],
  )

  const cancelSettlement = useCallback(
    async (id: string) => {
      const { error: err } = await sb.from('settlements').delete().eq('id', id)
      if (err) throw err
      await refetch()
    },
    [sb, refetch],
  )

  const signOut = useCallback(async () => {
    await sb.auth.signOut()
  }, [sb])

  // Recover from a transient load failure without forcing a sign-out.
  const retry = useCallback(async () => {
    setError(null)
    setLoaded(false)
    try {
      await refetch()
      setLoaded(true)
    } catch (err) {
      setError(messageOf(err))
    }
  }, [refetch])

  const viewer = useMemo(
    () => profiles.find((p) => p.id === userId) ?? null,
    [profiles, userId],
  )
  const other = useMemo(
    () => profiles.find((p) => p.id !== userId) ?? null,
    [profiles, userId],
  )

  const balance = useMemo(
    () => computeBalance(expenses, settlements, userId),
    [expenses, settlements, userId],
  )

  const status: Status = error
    ? 'error'
    : !loaded
      ? 'loading'
      : !viewer
        ? 'needs-profile'
        : 'ready'

  const session: Session | null = viewer
    ? { viewerId: userId, viewer, other, soloDemo: false }
    : null

  const pendingSettlement =
    settlements.find((s) => s.status === 'pending') ?? null

  const store: ExpenseStore | null = viewer
    ? {
        expenses,
        settlements,
        balance,
        pendingSettlement,
        ready: true,
        error,
        addExpense,
        deleteExpense,
        settleUp,
        approveSettlement,
        cancelSettlement,
      }
    : null

  return { status, error, session, store, createProfile, signOut, retry }
}

function messageOf(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}
