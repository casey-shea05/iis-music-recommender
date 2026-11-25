import type { ArtistRef } from '@/recommender/catalogue.ts'
import type { Explanation, FeatureName } from '@/recommender/scoring.ts'

/** The names users see for each feature. */
const FEATURE_LABELS: Record<FeatureName, string> = {
  tempo: 'tempo',
  energy: 'intensity',
  valence: 'mood',
  acousticness: 'acoustic',
}

/**
 * The wording for an explanation. `short` is the anchor artist alone; `full` adds the closest features.
 * When the anchor isn't one of the user's top artists, the user doesn't necessarily listen to them, so the
 * wording drops the artist and cites the features alone. It claims closeness, never a match: the closest
 * features may not be close in absolute terms.
 */
export function explanationText(
  explanation: Explanation,
  topArtists: readonly ArtistRef[],
): { short: string; full: string } {
  const artist = topArtists.find((a) => a.id === explanation.anchorArtistId)
  const features = explanation.features.map((f) => FEATURE_LABELS[f]).join(' and ')
  const closest = `Closest to your taste in ${features}`
  if (!artist) return { short: closest, full: closest }
  const short = `Because you listen to ${artist.name}`
  return { short, full: `${short}. ${closest}` }
}
