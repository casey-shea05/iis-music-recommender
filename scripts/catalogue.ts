// Pure steps of the catalogue build: no network, no file system.
import type { ArtistRef, Catalogue, CatalogueTrack, Features } from '../src/domain/catalogue.ts'

export type SpotifyTrack = {
  id: string
  title: string
  artists: ArtistRef[]
  durationMs: number
  /** Used to find the same recording under a different Spotify ID. */
  isrc?: string
}

/** A track returned by ReccoBeats' title search. `id` is the Spotify ID ReccoBeats knows it by. */
export type ReccoCandidate = {
  id: string
  title: string
  artists: { name: string }[]
  isrc?: string
}

export type Recommendation = {
  /** The top track whose Spotify ID seeded this ReccoBeats request. */
  seedTrackId: string
  tracks: SpotifyTrack[]
}

export function spotifyIdFromHref(href: string): string | undefined {
  return /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]+)/.exec(href)?.[1]
}

// Unicode-aware, so non-Latin titles and artists (K-pop, J-pop, ...) don't collapse to an empty string.
const normalise = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// Drops "(feat. X)" and " - Remastered 2020" style suffixes before comparing titles. A suffix is only
// dropped if something is left, and " - Part 2" style subtitles are kept because they change the song.
const normaliseTitle = (title: string) => {
  const stripped = title
    .replace(/\s*[([].*$/, '')
    .replace(/\s+-\s+(?:.*\b(?:remaster(?:ed)?|version|mix|edit|mono|stereo|live|deluxe|bonus|single|radio|slowed|sped)\b.*|\d{4}.*)$/i, '')
  return normalise(normalise(stripped) ? stripped : title)
}

/**
 * Spotify can give the same recording several IDs (album, single, re-release) and ReccoBeats
 * only knows one. Find it by ISRC first, then by title and artist name.
 */
export function matchReccoTrack(track: SpotifyTrack, candidates: ReccoCandidate[]): string | undefined {
  const byIsrc = track.isrc && candidates.find((c) => c.isrc === track.isrc)
  if (byIsrc) return byIsrc.id

  const title = normaliseTitle(track.title)
  const artists = new Set(track.artists.map((a) => normalise(a.name)).filter(Boolean))
  if (!title || artists.size === 0) return undefined
  return candidates.find(
    (c) => normaliseTitle(c.title) === title && c.artists.some((a) => artists.has(normalise(a.name))),
  )?.id
}

function averageFeatures(all: Features[]): Features {
  const mean = (key: keyof Features) => all.reduce((sum, f) => sum + f[key], 0) / all.length
  return {
    tempo: mean('tempo'),
    energy: mean('energy'),
    valence: mean('valence'),
    acousticness: mean('acousticness'),
  }
}

export function buildCatalogue(input: {
  topTracks: SpotifyTrack[]
  topArtists: ArtistRef[]
  recommendations: Recommendation[]
  features: Record<string, Features>
  generatedAt: string
}): Catalogue {
  const { topTracks, topArtists, recommendations, features, generatedAt } = input
  const topArtistIds = new Set(topArtists.map((a) => a.id))

  // The anchor artist is the top artist behind the seed track, else the seed's own first artist.
  const anchorFor = (seed: SpotifyTrack) =>
    (seed.artists.find((a) => topArtistIds.has(a.id)) ?? seed.artists[0])?.id

  const tracks = new Map<string, CatalogueTrack>()
  const add = (track: SpotifyTrack, anchorArtistId: string | undefined, isTopTrack: boolean) => {
    const trackFeatures = features[track.id]
    if (!anchorArtistId || !trackFeatures || tracks.has(track.id)) return
    tracks.set(track.id, { ...track, features: trackFeatures, anchorArtistId, isTopTrack })
  }

  for (const top of topTracks) add(top, anchorFor(top), true)

  const topById = new Map(topTracks.map((t) => [t.id, t]))
  for (const rec of recommendations) {
    const seed = topById.get(rec.seedTrackId)
    if (!seed) continue
    for (const track of rec.tracks) add(track, anchorFor(seed), false)
  }

  const topFeatures = topTracks.flatMap((t) => (features[t.id] ? [features[t.id]] : []))
  if (topFeatures.length === 0) {
    throw new Error('No audio features for any top track, so no taste profile can be built')
  }

  return {
    source: 'spotify+reccobeats',
    generatedAt,
    profile: { features: averageFeatures(topFeatures), topArtists },
    tracks: [...tracks.values()],
  }
}
