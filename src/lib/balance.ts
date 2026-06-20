import type { Expense, PersonId, Settlement } from '../types'

// How much the NON-payer owes for a single purchase.
export function shareOwedByNonPayer(e: Expense): number {
  return e.splitType === 'even' ? e.amount / 2 : e.amount
}

// Signed share from the viewer's perspective:
//   + you paid -> the other owes you
//   - they paid -> you owe them
export function signedShare(e: Expense, viewerId: PersonId): number {
  const share = shareOwedByNonPayer(e)
  return e.paidById === viewerId ? share : -share
}

// IDs of every expense that has been cleared by an APPROVED settle-up.
export function settledExpenseIds(settlements: Settlement[]): Set<string> {
  const ids = new Set<string>()
  for (const s of settlements) {
    if (s.status !== 'approved') continue
    for (const id of s.expenseIds ?? []) ids.add(id)
  }
  return ids
}

// Net of a chosen set of expenses, viewer-relative (used by the picker).
export function netOfExpenses(
  expenses: Expense[],
  ids: Set<string>,
  viewerId: PersonId,
): number {
  let net = 0
  for (const e of expenses) {
    if (ids.has(e.id)) net += signedShare(e, viewerId)
  }
  return Math.round(net * 100) / 100
}

// Outstanding balance, viewer-relative:
//   > 0  the other owes you, < 0 you owe them, ~0 settled up.
// Only counts expenses that haven't been settled. (Legacy whole-balance
// settlements with no expenseIds still subtract as a lump sum.)
export function computeBalance(
  expenses: Expense[],
  settlements: Settlement[],
  viewerId: PersonId,
): number {
  const settled = settledExpenseIds(settlements)

  let bal = 0
  for (const e of expenses) {
    if (settled.has(e.id)) continue
    bal += signedShare(e, viewerId)
  }

  for (const s of settlements) {
    if (s.status !== 'approved') continue
    if ((s.expenseIds ?? []).length > 0) continue // itemized: handled above
    bal += s.fromId === viewerId ? s.amount : -s.amount
  }

  return Math.round(bal * 100) / 100
}
