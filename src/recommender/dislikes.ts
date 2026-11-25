// Dislikes, the reasons given for them, and what they change. Pure TypeScript: no React, no Spotify.
// The ordered list of dislikes is the only stored state; adjustments and exclusions are derived from it.

import type { CatalogueTrack } from './catalogue.ts'
import type { FeatureName } from './scoring.ts'

export type Direction = 'higher' | 'lower'

/** A chip the user picked: one side of a feature ("Too slow" = tempo higher), or blocking the artist. */
export type Reason = { kind: 'feature'; feature: FeatureName; direction: Direction } | { kind: 'artist' }

/** A disliked track and the reasons given for it (none is allowed). */
export type Dislike = {
  track: CatalogueTrack
  reasons: Reason[]
}

/** What a reason asks for: the feature should go `direction` of `threshold`, the disliked track's own value. */
export type Adjustment = {
  feature: FeatureName
  direction: Direction
  threshold: number
}

/** The chip → adjustment table. The artist chip has no adjustment: it is a block, see `blockedArtistIds`. */
export function adjustmentFor(track: CatalogueTrack, reason: Reason): Adjustment | null {
  if (reason.kind === 'artist') return null
  return { feature: reason.feature, direction: reason.direction, threshold: track.features[reason.feature] }
}

/** Adds a dislike at the end of the list. Disliking a track again replaces its earlier dislike. */
export function addDislike(dislikes: Dislike[], dislike: Dislike): Dislike[] {
  return [...removeDislike(dislikes, dislike.track.id), dislike]
}

/** Removes a dislike with all its reasons, so the track (and an artist it blocked) can come up again. */
export function removeDislike(dislikes: Dislike[], trackId: string): Dislike[] {
  return dislikes.filter((d) => d.track.id !== trackId)
}

/** The active adjustments: per feature, the latest reason wins; different features combine. */
export function effects(dislikes: Dislike[]): Adjustment[] {
  const byFeature = new Map<FeatureName, Adjustment>()
  for (const { track, reasons } of dislikes) {
    for (const reason of reasons) {
      const adjustment = adjustmentFor(track, reason)
      if (adjustment) byFeature.set(adjustment.feature, adjustment)
    }
  }
  return [...byFeature.values()]
}

/** The primary artists blocked by a "Not a fan of this artist" reason. */
export function blockedArtistIds(dislikes: Dislike[]): Set<string> {
  return new Set(dislikes.filter((d) => d.reasons.some((r) => r.kind === 'artist')).map((d) => d.track.artists[0].id))
}

/** True for disliked tracks and any track crediting a blocked artist. */
export function isExcluded(track: CatalogueTrack, dislikes: Dislike[]): boolean {
  const blocked = blockedArtistIds(dislikes)
  return dislikes.some((d) => d.track.id === track.id) || track.artists.some((a) => blocked.has(a.id))
}
