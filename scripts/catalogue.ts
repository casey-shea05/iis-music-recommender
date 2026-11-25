// Pure steps of the catalogue build: no network, no file system.
import type { ArtistRef, Catalogue, CatalogueTrack, Features } from '../src/recommender/catalogue.ts'

export type SpotifyTrack = {
  id: string
  title: string
  artists: ArtistRef[]
  durationMs: number
  /** Used to find the same recording under a different Spotify ID. */
  isrc?: string
}

/** A search result (Spotify or ReccoBeats) that might be the track we want. `id` is its Spotify track ID. */
export type TrackCandidate = {
  id: string
  title: string
  /** `id` is the Spotify artist ID, when the source gives one. */
  artists: { id?: string; name: string }[]
  isrc?: string
}

/** Tracks Last.fm picked as similar to one of the user's top artists. */
export type Recommendation = {
  /** The top artist the similar artists were found from. */
  anchorArtistId: string
  tracks: SpotifyTrack[]
}

/** An entry from Last.fm's `artist.getSimilar`. `match` arrives as a string such as "0.87". */
export type SimilarArtist = { name: string; match: string | number }

/** The closest similar artists: at least `minMatch`, best first, at most `limit`. */
export function pickSimilarArtists(
  similar: SimilarArtist[],
  { limit, minMatch }: { limit: number; minMatch: number },
): string[] {
  return similar
    .map((a) => ({ name: a.name, match: Number(a.match) }))
    .filter((a) => a.match >= minMatch)
    .sort((a, b) => b.match - a.match)
    .slice(0, limit)
    .map((a) => a.name)
}

/**
 * Last.fm often credits several artists as one name ("Jessie J, Ariana Grande & Nicki Minaj"), where Spotify
 * lists them separately. Returns the full name first (some acts have "&" in their name), then each part.
 */
export function splitArtistNames(credit: string): string[] {
  const parts = credit
    .split(/\s*,\s*|\s+&\s+|\s+(?:feat|ft)\.\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? [credit, ...parts] : [credit]
}

export function spotifyIdFromHref(href: string): string | undefined {
  return /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]+)/.exec(href)?.[1]
}

// Unicode-aware, so non-Latin titles and artists (K-pop, J-pop, ...) don't collapse to an empty string.
const normalise = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// Drops "(feat. X)", "ft. X" and " - Remastered 2020" style suffixes before comparing titles. A suffix is only
// dropped if something is left, and " - Part 2" style subtitles are kept because they change the song.
const normaliseTitle = (title: string) => {
  const stripped = title
    .replace(/\s*[([].*$/, '')
    .replace(/\s+(?:feat|ft)\.\s.*$/i, '')
    .replace(/\s+-\s+(?:.*\b(?:remaster(?:ed)?|version|mix|edit|mono|stereo|live|deluxe|bonus|single|radio|slowed|sped)\b.*|\d{4}.*)$/i, '')
  return normalise(normalise(stripped) ? stripped : title)
}

/**
 * The candidate that is this track: by ISRC first, then by title and artist name. Used to pick the right
 * Spotify search result for a Last.fm track, and the ID ReccoBeats knows a recording by (Spotify can give
 * the same recording several IDs: album, single, re-release).
 */
export function matchTrack(track: SpotifyTrack, candidates: TrackCandidate[]): string | undefined {
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
  /** Image URL by Spotify track ID. A track missing here is kept, with no image. */
  images?: Record<string, string>
  generatedAt: string
}): Catalogue {
  const { topTracks, topArtists, recommendations, features, images = {}, generatedAt } = input
  const topArtistIds = new Set(topArtists.map((a) => a.id))

  // A top track's anchor artist is its top artist, else its own first artist.
  const anchorFor = (top: SpotifyTrack) =>
    (top.artists.find((a) => topArtistIds.has(a.id)) ?? top.artists[0])?.id

  const tracks = new Map<string, CatalogueTrack>()
  // Spotify gives one recording several IDs (album, single, deluxe), so a recording is also known by its ISRC.
  const isrcs = new Set<string>()
  const add = (track: SpotifyTrack, anchorArtistId: string | undefined, isTopTrack: boolean) => {
    const trackFeatures = features[track.id]
    if (!anchorArtistId || !trackFeatures || tracks.has(track.id)) return
    if (track.isrc) {
      if (isrcs.has(track.isrc)) return
      isrcs.add(track.isrc)
    }
    tracks.set(track.id, {
      ...track,
      features: trackFeatures,
      anchorArtistId,
      isTopTrack,
      imageUrl: images[track.id] ?? null,
    })
  }

  for (const top of topTracks) add(top, anchorFor(top), true)

  for (const rec of recommendations) {
    for (const track of rec.tracks) add(track, rec.anchorArtistId, false)
  }

  const topFeatures = topTracks.flatMap((t) => (features[t.id] ? [features[t.id]] : []))
  if (topFeatures.length === 0) {
    throw new Error('No audio features for any top track, so no taste profile can be built')
  }

  return {
    source: 'spotify+lastfm+reccobeats',
    generatedAt,
    profile: { features: averageFeatures(topFeatures), topArtists },
    tracks: [...tracks.values()],
  }
}
