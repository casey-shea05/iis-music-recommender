// The Queue: one ordered list of tracks with a cursor on the track Now playing.
// Before the cursor is Heard, after it is Up next (see GLOSSARY.md).
// Pure functions: no React, no Spotify. Every move returns a new queue.

export type Queue<T> = { readonly tracks: readonly T[]; readonly cursor: number }

export function createQueue<T>(tracks: readonly T[]): Queue<T> {
  return { tracks, cursor: 0 }
}

/** The track at the cursor, or null if the queue is empty. */
export function nowPlaying<T>(queue: Queue<T>): T | null {
  return queue.tracks[queue.cursor] ?? null
}

export function hasNext<T>(queue: Queue<T>): boolean {
  return queue.cursor < queue.tracks.length - 1
}

export function hasPrevious<T>(queue: Queue<T>): boolean {
  return queue.cursor > 0 && queue.tracks.length > 0
}

/** Moves to the first Up next track. At the end, returns the same queue. */
export function next<T>(queue: Queue<T>): Queue<T> {
  return hasNext(queue) ? { ...queue, cursor: queue.cursor + 1 } : queue
}

/** Moves the cursor to any track (e.g. replaying a Heard track). Nothing is removed. Out-of-range indexes are ignored. */
export function jumpTo<T>(queue: Queue<T>, index: number): Queue<T> {
  const inRange = Number.isInteger(index) && index >= 0 && index < queue.tracks.length
  return inRange ? { ...queue, cursor: index } : queue
}

/** Moves back to the last Heard track. At the start, returns the same queue. */
export function previous<T>(queue: Queue<T>): Queue<T> {
  return hasPrevious(queue) ? { ...queue, cursor: queue.cursor - 1 } : queue
}

/** How many tracks the queue keeps in Up next. */
export const UP_NEXT_SIZE = 5

/** Returns up to `count` fresh tracks (not in `queued`). The recommender swaps in a smarter one later. */
export type Chooser<T> = (queued: readonly T[], count: number) => T[]

/** First version of the chooser: the next catalogue tracks not already in the queue, in file order. */
export function catalogueChooser<T extends { id: string }>(catalogue: readonly T[]): Chooser<T> {
  return (queued, count) => {
    const seen = new Set(queued.map((t) => t.id))
    return catalogue.filter((t) => !seen.has(t.id)).slice(0, count)
  }
}

/** Adds fresh tracks to the end until there are `size` below the cursor (fewer if the chooser runs out). */
export function topUp<T>(queue: Queue<T>, choose: Chooser<T>, size = UP_NEXT_SIZE): Queue<T> {
  const missing = queue.cursor + 1 + size - queue.tracks.length
  if (missing <= 0) return queue
  const fresh = choose(queue.tracks, missing)
  return fresh.length === 0 ? queue : { ...queue, tracks: [...queue.tracks, ...fresh] }
}

/** The tracks after the cursor. */
export function upNext<T>(queue: Queue<T>): readonly T[] {
  return queue.tracks.slice(queue.cursor + 1)
}

/** Adds a track to Heard unless it is already there (a track is recorded once, however often it is replayed). */
export function recordHeard<T extends { id: string }>(heard: readonly T[], track: T): readonly T[] {
  return heard.some((t) => t.id === track.id) ? heard : [...heard, track]
}

/**
 * Like `jumpTo`, but when jumping forward the tracks skipped over are dropped from the queue unless they are
 * already Heard. Otherwise Previous would walk back into tracks that were never played. Dropped tracks are
 * fresh again, so the chooser can offer them later.
 */
export function jumpToSkipping<T extends { id: string }>(
  queue: Queue<T>,
  index: number,
  heard: readonly T[],
): Queue<T> {
  const jumped = jumpTo(queue, index)
  if (jumped === queue || index <= queue.cursor) return jumped
  const heardIds = new Set(heard.map((t) => t.id))
  const keptSkipped = queue.tracks.slice(queue.cursor + 1, index).filter((t) => heardIds.has(t.id))
  return {
    tracks: [...queue.tracks.slice(0, queue.cursor + 1), ...keptSkipped, ...queue.tracks.slice(index)],
    cursor: queue.cursor + 1 + keptSkipped.length,
  }
}
