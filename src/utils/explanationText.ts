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
 * The wording for an explanation: the anchor artist, then the closest features.
 * When the anchor isn't one of the user's top artists, the user doesn't necessarily listen to them, so the
 * wording drops the artist and cites the features alone. It claims closeness, never a match: the closest
 * features may not be close in absolute terms.
 */
export function explanationText(explanation: Explanation, topArtists: readonly ArtistRef[]): string {
  const artist = topArtists.find((a) => a.id === explanation.anchorArtistId)
  const features = explanation.features.map((f) => FEATURE_LABELS[f]).join(' and ')
  const closest = `Closest to your taste in ${features}`
  return artist ? `Because you listen to ${artist.name}. ${closest}` : closest
}
