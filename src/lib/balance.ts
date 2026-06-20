import type { Expense, PersonId, Settlement } from '../types'

// How much the NON-payer owes for a single purchase.
export function shareOwedByNonPayer(e: Expense): number {
  return e.splitType === 'even' ? e.amount / 2 : e.amount
}

// Net balance from the VIEWER's perspective:
//   > 0  => the other person owes you this much
//   < 0  => you owe the other person this much
//   ~ 0  => settled up
//
// Each purchase: if you paid, the other owes you their share (+). If they
// paid, you owe your share (-). Each settlement moves the balance toward zero.
export function computeBalance(
  expenses: Expense[],
  settlements: Settlement[],
  viewerId: PersonId,
): number {
  let bal = 0

  for (const e of expenses) {
    const share = shareOwedByNonPayer(e)
    bal += e.paidById === viewerId ? share : -share
  }

  for (const s of settlements) {
    // You pay them -> reduces what you owe (toward +).
    // They pay you -> reduces what they owe (toward -).
    bal += s.fromId === viewerId ? s.amount : -s.amount
  }

  // Avoid floating-point dust like 42.499999999.
  return Math.round(bal * 100) / 100
}
