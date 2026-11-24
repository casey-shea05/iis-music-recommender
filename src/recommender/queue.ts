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
