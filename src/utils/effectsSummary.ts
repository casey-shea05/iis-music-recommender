import type { Adjustment } from '@/recommender/dislikes.ts'
import { effectOf } from './reasonConfirmationText.ts'

/** The Dislikes tab's one-line summary of what is steering Up next. Blocked artists have their own tab. */
export function effectsSummary(adjustments: readonly Adjustment[]): string {
  if (adjustments.length === 0) return 'Nothing is steering Up next yet'
  return `Steering this session: ${adjustments.map((a) => effectOf(a.feature, a.direction)).join(', ')}`
}
