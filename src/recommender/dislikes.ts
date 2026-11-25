// Dislikes, the reasons given for them, and what they change. Pure TypeScript: no React, no Spotify.
// Dislikes last one session and adjustments are derived from them. Blocked artists are their own long-term list.

import type { CatalogueTrack } from './catalogue.ts'
import type { FeatureName } from './scoring.ts'

export type Direction = 'higher' | 'lower'

/**
 * A chip the user picked (one side of a feature, "Too slow" = tempo higher, or blocking the artist), or their own
 * words. Typed text is stored and listed, but `effects()` ignores it.
 */
export type Reason = { kind: 'feature'; feature: FeatureName; direction: Direction } | { kind: 'artist' } | { kind: 'text'; text: string }

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

/** The chip → adjustment table. The artist chip is a block (see `blockArtist`) and typed text doesn't steer yet. */
export function adjustmentFor(track: CatalogueTrack, reason: Reason): Adjustment | null {
  if (reason.kind !== 'feature') return null
  return { feature: reason.feature, direction: reason.direction, threshold: track.features[reason.feature] }
}

/** Adds a dislike at the end of the list. Disliking a track again replaces its earlier dislike. */
export function addDislike(dislikes: Dislike[], dislike: Dislike): Dislike[] {
  return [...removeDislike(dislikes, dislike.track.id), dislike]
}

/** Removes a dislike with all its reasons, so the track can come up again. It never unblocks an artist. */
export function removeDislike(dislikes: Dislike[], trackId: string): Dislike[] {
  return dislikes.filter((d) => d.track.id !== trackId)
}

/** Ends the session: every dislike goes. Blocked artists are a separate list and stay. */
export function endSession(): Dislike[] {
  return []
}

/** The active adjustments: per feature, the latest reason wins; different features combine. */
export function effects(dislikes: readonly Dislike[]): Adjustment[] {
  const byFeature = new Map<FeatureName, Adjustment>()
  for (const { track, reasons } of dislikes) {
    for (const reason of reasons) {
      const adjustment = adjustmentFor(track, reason)
      if (adjustment) byFeature.set(adjustment.feature, adjustment)
    }
  }
  return [...byFeature.values()]
}

/** A blocked artist (the primary artist of a track) and the track(s) that blocked them. */
export type BlockedArtist = {
  id: string
  name: string
  tracks: { id: string; title: string; imageUrl?: string | null }[]
}

/** Blocks the track's primary artist, or adds the track to the artist's existing block. */
export function blockArtist(blocked: BlockedArtist[], track: CatalogueTrack): BlockedArtist[] {
  const { id, name } = track.artists[0]
  const source = { id: track.id, title: track.title, imageUrl: track.imageUrl }
  const existing = blocked.find((b) => b.id === id)
  if (!existing) return [...blocked, { id, name, tracks: [source] }]
  if (existing.tracks.some((t) => t.id === track.id)) return blocked
  return blocked.map((b) => (b === existing ? { ...b, tracks: [...b.tracks, source] } : b))
}

/**
 * Lifts a block, and strips the artist reason from any session dislike of that artist. A dislike left with no
 * reasons stays (the track is still disliked).
 */
export function unblockArtist(
  blocked: BlockedArtist[],
  dislikes: Dislike[],
  artistId: string,
): { blockedArtists: BlockedArtist[]; dislikes: Dislike[] } {
  return {
    blockedArtists: blocked.filter((b) => b.id !== artistId),
    dislikes: dislikes.map((d) =>
      d.track.artists[0].id === artistId ? { ...d, reasons: d.reasons.filter((r) => r.kind !== 'artist') } : d,
    ),
  }
}

/** True for disliked tracks and any track crediting a blocked artist. */
export function isExcluded(track: CatalogueTrack, dislikes: readonly Dislike[], blocked: readonly BlockedArtist[]): boolean {
  return dislikes.some((d) => d.track.id === track.id) || track.artists.some((a) => blocked.some((b) => b.id === a.id))
}

/**
 * The dislikes the Dislikes panel lists. One whose only reason is "Not a fan of this artist" lives in Blocked
 * artists instead; a dislike with no reasons, or with other reasons too, is listed.
 */
export function listedDislikes(dislikes: readonly Dislike[]): Dislike[] {
  return dislikes.filter((d) => d.reasons.length === 0 || d.reasons.some((r) => r.kind !== 'artist'))
}
