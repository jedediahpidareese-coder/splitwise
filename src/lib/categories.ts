import {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  PartyPopper,
  Home,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from '../types'

export interface CategoryMeta {
  key: Category
  label: string
  Icon: LucideIcon
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'groceries', label: 'Groceries', Icon: ShoppingCart },
  { key: 'dining', label: 'Dining', Icon: UtensilsCrossed },
  { key: 'transport', label: 'Transport', Icon: Car },
  { key: 'fun', label: 'Fun', Icon: PartyPopper },
  { key: 'rent', label: 'Rent', Icon: Home },
  { key: 'other', label: 'Other', Icon: Receipt },
]

export function categoryMeta(key: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}
