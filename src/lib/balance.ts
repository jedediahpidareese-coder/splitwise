import type { Expense, PersonId, Settlement } from '../types'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// How much the NON-payer owes for a single purchase (the full owed amount).
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

// A settlement's effect on the viewer's balance: money you handed over (+)
// moves you toward zero from a debt; money they handed you (-) reduces what
// they owe. (Used for both itemized and general settlements.)
function settlementSigned(s: Settlement, viewerId: PersonId): number {
  return s.fromId === viewerId ? s.amount : -s.amount
}

// Total owed across all purchases, before any payments (viewer-relative).
export function grossBalance(expenses: Expense[], viewerId: PersonId): number {
  let bal = 0
  for (const e of expenses) bal += signedShare(e, viewerId)
  return round(bal)
}

// Net outstanding balance, viewer-relative:
//   > 0 the other owes you, < 0 you owe them, ~0 settled up.
export function computeBalance(
  expenses: Expense[],
  settlements: Settlement[],
  viewerId: PersonId,
): number {
  let bal = grossBalance(expenses, viewerId)
  for (const s of settlements) {
    if (s.status !== 'approved') continue
    bal += settlementSigned(s, viewerId)
  }
  return round(bal)
}

// How much has been paid toward a specific expense (via approved settlements).
export function paidForExpense(expenseId: string, settlements: Settlement[]): number {
  let paid = 0
  for (const s of settlements) {
    if (s.status !== 'approved') continue
    if (s.allocations && typeof s.allocations[expenseId] === 'number') {
      paid += s.allocations[expenseId]
    } else if ((s.expenseIds ?? []).includes(expenseId)) {
      // Legacy fully-settled rows had no allocations.
      paid += Infinity
    }
  }
  return paid
}

// How much is still owed on a specific expense (unsigned, >= 0).
export function remainingForExpense(e: Expense, settlements: Settlement[]): number {
  const share = shareOwedByNonPayer(e)
  const paid = paidForExpense(e.id, settlements)
  return Math.max(0, round(share - paid))
}

// Expenses that still have something owed on them (for the picker / list).
export function outstandingExpenses(
  expenses: Expense[],
  settlements: Settlement[],
): Expense[] {
  return expenses.filter((e) => remainingForExpense(e, settlements) > 0.005)
}

// The net money transfer implied by paying these per-transaction amounts.
// Returns { fromId, toId, amount } from the viewer's standpoint, where paying
// toward a transaction settles its own creditor/debtor direction.
export function transferForAllocations(
  expenses: Expense[],
  allocations: Record<string, number>,
  viewerId: PersonId,
  otherId: PersonId,
): { fromId: PersonId; toId: PersonId; amount: number; net: number } {
  let net = 0 // viewer-relative effect on balance
  for (const e of expenses) {
    const amt = allocations[e.id]
    if (!amt) continue
    // Paying a transaction where you're owed reduces +balance; where you owe,
    // increases it toward zero.
    net += e.paidById === viewerId ? -amt : amt
  }
  net = round(net)
  // net > 0 means you are paying down what you owe (money viewer -> other).
  const fromId = net >= 0 ? viewerId : otherId
  const toId = net >= 0 ? otherId : viewerId
  return { fromId, toId, amount: Math.abs(net), net }
}
