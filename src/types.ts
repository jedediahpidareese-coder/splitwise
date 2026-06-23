// A person is identified by a stable account id (a Supabase auth user id in
// cloud mode, or a fixed slug in local mode). Storing the ABSOLUTE payer id —
// rather than "me"/"them" relative to one device — is what lets the same row
// read correctly on both people's phones.
export type PersonId = string

export interface Profile {
  id: PersonId
  displayName: string
}

// How a purchase is divided:
//   even      -> the two people each owe half
//   owed_full -> the non-payer owes the entire amount (a loan)
// Room is left to add a 'custom' mode later without a data migration.
export type SplitType = 'even' | 'owed_full'

export type Category =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'fun'
  | 'rent'
  | 'other'

export interface Expense {
  id: string
  amount: number // positive dollars, e.g. 84.2
  description: string
  paidById: PersonId
  splitType: SplitType
  category: Category
  note?: string
  receiptUrl?: string
  createdAt: string // ISO timestamp
}

// A settle-up must be approved by BOTH people before it clears the balance:
//   pending  -> requested by one person, waiting on the other (balance unchanged)
//   approved -> both agreed; it now zeroes out what was owed
export type SettlementStatus = 'pending' | 'approved'

// A payment. Two flavors:
//   • itemized  -> `allocations` maps expenseId -> amount paid toward it
//     (full or partial per transaction). `expenseIds` is kept for older rows.
//   • general   -> empty allocations; just pays `amount` toward the overall
//     balance.
// `amount` is the net money that changes hands (from -> to), in either case.
export interface Settlement {
  id: string
  amount: number
  fromId: PersonId // who hands over the money
  toId: PersonId // who receives it
  requestedBy: PersonId // who tapped "Settle up"
  status: SettlementStatus
  expenseIds: string[] // legacy: fully-settled transactions (older rows)
  allocations: Record<string, number> // expenseId -> amount paid toward it
  createdAt: string
  approvedAt?: string
}
