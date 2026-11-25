import type { Reason } from '@/recommender/dislikes.ts'
import { REASON_CHIPS } from './reasonChips.ts'

/** A reason as the user saw it on the Reason panel: the chip's label, or their own words in quotes. */
export function reasonLabel(reason: Reason): string {
  if (reason.kind === 'artist') return 'Not a fan of this artist'
  if (reason.kind === 'text') return `“${reason.text}”`
  const sides = REASON_CHIPS.find((c) => c.feature === reason.feature)!.sides
  return sides.find((s) => s.direction === reason.direction)!.label
}
