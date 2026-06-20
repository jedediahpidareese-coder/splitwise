import type { Expense, PersonId } from '../types'
import type { Session } from '../data/storeTypes'

// Display name for a person id, from the viewer's perspective.
export function nameFor(session: Session, id: PersonId): string {
  if (id === session.viewerId) return 'You'
  if (session.other && id === session.other.id) return session.other.displayName
  return 'Partner'
}

// The other person's display name (for labels like "Dani owes you").
export function otherName(session: Session): string {
  return session.other?.displayName ?? 'your partner'
}

// One-line description of who paid and how it was split, viewer-relative.
export function describeSplit(e: Expense, session: Session): string {
  const mine = e.paidById === session.viewerId
  const them = otherName(session)
  if (e.splitType === 'owed_full') {
    return mine ? `You lent ${them} · full amount` : `${them} lent you · full amount`
  }
  return mine ? `You paid · split with ${them}` : `${them} paid · split with you`
}
