import type { Reason } from '@/recommender/dislikes.ts'
import type { FeatureName } from '@/recommender/scoring.ts'
import type { Direction } from '@/recommender/dislikes.ts'

/** What each chip asks for, in the words of the toast. */
const EFFECT_WORDS: Record<FeatureName, Record<Direction, string>> = {
  tempo: { higher: 'faster tempo', lower: 'slower tempo' },
  energy: { higher: 'more intense', lower: 'less intense' },
  valence: { higher: 'more upbeat', lower: 'gloomier' },
  acousticness: { higher: 'more acoustic', lower: 'more electronic' },
}

const TYPED_NOTE = "Typed reasons are listed but don't steer yet."

/** The toast after Submit: how the chips were understood. Free text is saved, but it doesn't steer yet. */
export function reasonConfirmationText(reasons: readonly Reason[], text: string): string {
  const typed = text.trim() !== ''
  if (reasons.length === 0) {
    return typed ? `Saved. ${TYPED_NOTE}` : 'Removed. No reason given, so nothing else changes.'
  }
  const effects = reasons.map((r) => (r.kind === 'artist' ? 'artist blocked' : EFFECT_WORDS[r.feature][r.direction]))
  const noted = `Noted: ${effects.join(', ')}.`
  return typed ? `${noted} ${TYPED_NOTE}` : noted
}
