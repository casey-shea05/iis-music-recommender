// The swap rule and Closest fit. Pure TypeScript: no React, no Spotify.

import type { Features } from './catalogue.ts'
import type { Adjustment } from './dislikes.ts'
import type { Queue } from './queue.ts'
import { conflicts } from './scoring.ts'

type Swappable = { id: string; features: Features; isTopTrack: boolean }

/**
 * An unheard Up next track that conflicts with the current effects. Derived, not stored, so the tag clears on its
 * own when a dislike is removed.
 */
export function isClosestFit<T extends Swappable>(
  queue: Queue<T>,
  heard: readonly { id: string }[],
  adjustments: readonly Adjustment[],
  track: T,
): boolean {
  const index = queue.tracks.findIndex((t) => t.id === track.id)
  if (index <= queue.cursor) return false
  return !heard.some((h) => h.id === track.id) && conflicts(track.features, adjustments)
}

/**
 * Replaces each unheard Up next track that conflicts with the best-scoring candidate, only if that candidate scores
 * higher. Candidates are never top tracks, never excluded and never already in the queue. Returns a new queue.
 */
export function swap<T extends Swappable>(
  queue: Queue<T>,
  heard: readonly { id: string }[],
  adjustments: readonly Adjustment[],
  isExcluded: (track: T) => boolean,
  candidates: readonly T[],
  score: (track: T, adjustments: readonly Adjustment[]) => number,
): Queue<T> {
  const heardIds = new Set(heard.map((t) => t.id))
  const used = new Set(queue.tracks.map((t) => t.id))
  const pool = candidates
    .filter((c) => !c.isTopTrack && !used.has(c.id) && !isExcluded(c))
    .map((c) => ({ track: c, score: score(c, adjustments) }))
    .sort((a, b) => b.score - a.score)

  const tracks = queue.tracks.map((track, index) => {
    if (index <= queue.cursor || heardIds.has(track.id) || !conflicts(track.features, adjustments)) return track
    const best = pool.find((c) => !used.has(c.track.id))
    if (!best || best.score <= score(track, adjustments)) return track
    used.add(best.track.id)
    return best.track
  })
  return { ...queue, tracks }
}
