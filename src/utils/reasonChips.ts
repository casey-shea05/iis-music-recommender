import type { Direction } from '@/recommender/dislikes.ts'
import type { FeatureName } from '@/recommender/scoring.ts'

type Side = {
  label: string
  /** What the chip asks for: "Too slow" wants tempo `higher`. */
  direction: Direction
  /** The same ask in the toast's words. */
  effect: string
}

/** The reason chips, one pair per feature: the single source for the panel's labels and the toast's wording. */
export const REASON_CHIPS: { feature: FeatureName; name: string; sides: [Side, Side] }[] = [
  { feature: 'tempo', name: 'Tempo', sides: [{ label: 'Too slow', direction: 'higher', effect: 'faster tempo' }, { label: 'Too fast', direction: 'lower', effect: 'slower tempo' }] },
  { feature: 'energy', name: 'Intensity', sides: [{ label: 'Too mellow', direction: 'higher', effect: 'more intense' }, { label: 'Too intense', direction: 'lower', effect: 'less intense' }] },
  { feature: 'valence', name: 'Mood', sides: [{ label: 'Too gloomy', direction: 'higher', effect: 'more upbeat' }, { label: 'Too upbeat', direction: 'lower', effect: 'gloomier' }] },
  { feature: 'acousticness', name: 'Acoustic', sides: [{ label: 'Too acoustic', direction: 'lower', effect: 'less acoustic' }, { label: 'Too electronic', direction: 'higher', effect: 'more acoustic' }] },
]
