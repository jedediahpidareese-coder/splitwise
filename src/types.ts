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

// A payback that clears a chosen SET of transactions (e.g. "Dani paid you
// $42.50 for these 3 items"). expenseIds lists exactly which expenses it
// settles; once approved, those expenses drop off the balance.
export interface Settlement {
  id: string
  amount: number // net that changes hands for the selected items
  fromId: PersonId // who hands over the money
  toId: PersonId // who receives it
  requestedBy: PersonId // who tapped "Settle up"
  status: SettlementStatus
  expenseIds: string[] // the transactions being settled
  createdAt: string
  approvedAt?: string
}
