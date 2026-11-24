import type { ArtistRef } from '@/recommender/catalogue.ts'

/** Milliseconds as m:ss, e.g. 61000 -> "1:01". */
export function formatTime(ms: number): string {
  const s = Math.floor(Math.max(ms, 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function artistNames(artists: readonly ArtistRef[]): string {
  return artists.map((a) => a.name).join(', ')
}
