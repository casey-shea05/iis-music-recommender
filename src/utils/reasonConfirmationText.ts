import type { Reason } from '@/recommender/dislikes.ts'
import { REASON_CHIPS } from './reasonChips.ts'

const TYPED_NOTE = "Typed reasons are listed but don't steer yet."

/** The toast after Submit: how the chips were understood. Free text is saved, but it doesn't steer yet. */
export function reasonConfirmationText(reasons: readonly Reason[], text: string): string {
  const typed = text.trim() !== ''
  if (reasons.length === 0) {
    return typed ? `Saved. ${TYPED_NOTE}` : 'Removed. No reason given, so nothing else changes.'
  }
  const effects = reasons.flatMap((r) => (r.kind === 'text' ? [] : [r.kind === 'artist' ? 'artist blocked' : effectOf(r.feature, r.direction)]))
  const noted = `Noted: ${effects.join(', ')}.`
  return typed ? `${noted} ${TYPED_NOTE}` : noted
}

export function effectOf(feature: Extract<Reason, { kind: 'feature' }>['feature'], direction: Extract<Reason, { kind: 'feature' }>['direction']): string {
  const chips = REASON_CHIPS.find((c) => c.feature === feature)
  return chips!.sides.find((s) => s.direction === direction)!.effect
}
