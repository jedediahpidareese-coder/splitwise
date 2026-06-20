import type { Category, Expense, PersonId, Profile, Settlement, SplitType } from '../types'

// Who is looking at the app, and who the other person is. Both the local and
// the cloud store provide one of these so the UI can render "You" vs the
// other person's name and compute the balance from the viewer's perspective.
export interface Session {
  viewerId: PersonId
  viewer: Profile
  other: Profile | null // null until the second person has joined (cloud only)
  soloDemo: boolean // local mode: one device plays both people
}

export interface ReceiptInput {
  blob: Blob
  dataUrl: string
}

export interface NewExpenseInput {
  amount: number
  description: string
  paidById: PersonId
  splitType: SplitType
  category: Category
  note?: string
  receipt?: ReceiptInput
}

// The shared surface implemented by both useLocalStore and useCloudStore, so
// the screens don't care which backend is active.
export interface ExpenseStore {
  expenses: Expense[]
  settlements: Settlement[]
  balance: number // viewer-relative: >0 the other owes you, <0 you owe them
  pendingSettlement: Settlement | null
  ready: boolean
  error: string | null
  addExpense: (input: NewExpenseInput) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  settleUp: (expenseIds: string[]) => Promise<void> // pending request for those items
  approveSettlement: (id: string) => Promise<void>
  cancelSettlement: (id: string) => Promise<void> // undo / decline
  resetDemo?: () => void // local mode only
}
