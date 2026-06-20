import type { Expense, Profile, Settlement } from '../types'

// Local-mode identities. In cloud mode these come from the Supabase profiles
// table instead.
export const LOCAL_ME: Profile = { id: 'me', displayName: 'You' }
export const LOCAL_OTHER: Profile = { id: 'dani', displayName: 'Dani' }

// Demo data shown the first time the app runs (LOCAL mode). It lives only in
// this browser; "Reset demo data" restores it.
export const seedExpenses: Expense[] = [
  {
    id: 'seed-1',
    amount: 50,
    description: 'Cash for nails',
    paidById: LOCAL_ME.id,
    splitType: 'owed_full',
    category: 'other',
    createdAt: '2026-06-18T15:00:00.000Z',
  },
  {
    id: 'seed-2',
    amount: 84.2,
    description: 'Whole Foods',
    paidById: LOCAL_ME.id,
    splitType: 'even',
    category: 'groceries',
    createdAt: '2026-06-17T18:30:00.000Z',
  },
  {
    id: 'seed-3',
    amount: 52,
    description: 'Sushi night',
    paidById: LOCAL_OTHER.id,
    splitType: 'even',
    category: 'dining',
    createdAt: '2026-06-16T01:15:00.000Z',
  },
  {
    id: 'seed-4',
    amount: 18.4,
    description: 'Uber home',
    paidById: LOCAL_ME.id,
    splitType: 'even',
    category: 'transport',
    createdAt: '2026-06-15T04:45:00.000Z',
  },
]

export const seedSettlements: Settlement[] = []
