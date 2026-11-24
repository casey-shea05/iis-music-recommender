import type { CatalogueTrack } from '../domain/catalogue.ts'

export function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const artistNames = (t: CatalogueTrack) => t.artists.map((a) => a.name).join(', ')
