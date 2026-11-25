// Runs once: Spotify top tracks/artists -> Last.fm similar artists' top tracks -> ReccoBeats IDs + features -> data/catalogue.json.
// Usage: npm run catalogue   (needs SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI and LASTFM_API_KEY in .env)
// See docs/adr/0002-catalogue-source.md (and ADR 0001, decision 2, for the features).
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { ArtistRef, Features } from '../src/recommender/catalogue.ts'
import { buildAuthorizeUrl, codeChallengeFor, generateCodeVerifier } from '../src/playback/spotify/pkce.ts'
import { SPOTIFY_SCOPES } from '../src/playback/spotify/scopes.ts'
import {
  buildCatalogue,
  matchTrack,
  pickSimilarArtists,
  splitArtistNames,
  spotifyIdFromHref,
  type SimilarArtist,
  type TrackCandidate,
  type Recommendation,
  type SpotifyTrack,
} from './catalogue.ts'

const RECCOBEATS = 'https://api.reccobeats.com/v1'
// Tune these to widen or narrow the catalogue (ADR 0002).
const SIMILAR_ARTISTS_PER_ARTIST = 10
const MIN_SIMILARITY = 0.3
const TRACKS_PER_SIMILAR_ARTIST = 3
const FEATURE_BATCH = 40
const IMAGE_CONCURRENCY = 5
// Top artists processed at once. Requests are still spaced per host (below), so this hides latency without bursting.
const ARTIST_CONCURRENCY = 3
// Minimum gap between request starts, per host. Last.fm asks for no more than about 5 requests a second.
// Spotify search runs once per Last.fm track (hundreds), so it is spaced more widely to stay under its rolling limit.
const MIN_GAP_MS: Record<string, number> = {
  'ws.audioscrobbler.com': 250,
  'api.reccobeats.com': 100,
  'open.spotify.com': 100,
  'api.spotify.com': 200,
}
// Spotify search results to check per Last.fm track (development-mode apps may ask for at most 10).
const SEARCH_LIMIT = 10
const CACHE_PATH = 'data/catalogue-cache.json'

// Same variables the browser app reads, so one .env serves both.
const clientId = process.env.SPOTIFY_CLIENT_ID
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI
const lastfmKey = process.env.LASTFM_API_KEY
if (!clientId || !REDIRECT_URI || !lastfmKey) {
  console.error('Missing SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI or LASTFM_API_KEY in .env.')
  process.exit(1)
}
// The script listens on the registered redirect URI, so stop the Vite dev server first if it shares the port.
const redirect = new URL(REDIRECT_URI)
const PORT = Number(redirect.port)
if (!PORT) {
  console.error('SPOTIFY_REDIRECT_URI needs an explicit port, e.g. http://127.0.0.1:5173/callback')
  process.exit(1)
}
const CALLBACK_PATH = redirect.pathname

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const errorText = (error: unknown) => (error instanceof Error ? error.message.slice(0, 120) : String(error))

const nextSlot = new Map<string, number>()
// Reserves the next free start time for this host, so parallel callers queue up instead of bursting.
async function throttle(host: string, extraDelayMs = 0) {
  const gap = MIN_GAP_MS[host] ?? 0
  const now = Date.now()
  const at = Math.max(now, nextSlot.get(host) ?? 0) + extraDelayMs
  nextSlot.set(host, at + gap)
  if (at > now) await sleep(at - now)
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const host = new URL(url).host
  for (let attempt = 0; ; attempt++) {
    await throttle(host)
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
    if (res.status === 429 && attempt < 5) {
      // Honour the server's Retry-After for every caller of this host, not just this one.
      const wait = (Number(res.headers.get('retry-after')) || 2 ** (attempt + 1)) * 1000
      console.warn(`  rate limited by ${host}, pausing ${wait / 1000}s`)
      nextSlot.set(host, Math.max(nextSlot.get(host) ?? 0, Date.now() + wait))
      continue
    }
    // Keep the Last.fm key out of error messages, which get logged.
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.replace(/api_key=[^&]+/, 'api_key=***')}: ${await res.text()}`)
    return (await res.json()) as T
  }
}

// Results of lookups that cost many requests, kept on disk so a crash or a rerun doesn't repeat them.
const cache: Record<string, unknown> = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {}
function saveCache() {
  mkdirSync('data', { recursive: true })
  writeFileSync(CACHE_PATH, JSON.stringify(cache))
}
async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (key in cache) return cache[key] as T
  const value = await fetcher()
  cache[key] = value
  return value
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i])
      }
    }),
  )
  return results
}

// --- Spotify login (Authorization Code + PKCE, loopback redirect) ---

async function login(): Promise<string> {
  const verifier = generateCodeVerifier()
  const state = generateCodeVerifier().slice(0, 16)
  const url = buildAuthorizeUrl({
    clientId: clientId!,
    redirectUri: REDIRECT_URI!,
    scopes: SPOTIFY_SCOPES,
    codeChallenge: await codeChallengeFor(verifier),
    state,
  })

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const params = new URL(req.url ?? '/', REDIRECT_URI).searchParams
      if (new URL(req.url ?? '/', REDIRECT_URI).pathname !== CALLBACK_PATH) {
        res.writeHead(404).end()
        return
      }
      const error = params.get('error')
      const received = params.get('code')
      res.end(error || !received ? 'Login failed. Check the terminal.' : 'Logged in. You can close this tab.')
      server.close()
      if (error || !received || params.get('state') !== state) {
        reject(new Error(`Spotify login failed: ${error ?? 'missing code or state mismatch'}`))
      } else {
        resolve(received)
      }
    })
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Opening Spotify login. If nothing opens, visit:\n${url}\n`)
      execFile('open', [url], () => {})
    })
    server.on('error', reject)
    setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for the Spotify login (5 minutes)'))
    }, 5 * 60_000).unref()
  })

  const token = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI!,
      client_id: clientId!,
      code_verifier: verifier,
    }),
  })
  if (!token.ok) throw new Error(`Token exchange failed: ${token.status} ${await token.text()}`)
  const { access_token } = (await token.json()) as { access_token?: string }
  if (!access_token) throw new Error('Token response had no access_token')
  return access_token
}

// --- Spotify ---

type SpotifyApiArtist = { id: string; name: string }
type SpotifyApiTrack = {
  id: string
  name: string
  duration_ms: number
  artists: SpotifyApiArtist[]
  external_ids?: { isrc?: string }
}

const toSpotifyTrackFromApi = (t: SpotifyApiTrack): SpotifyTrack => ({
  id: t.id,
  title: t.name,
  durationMs: t.duration_ms,
  isrc: t.external_ids?.isrc,
  artists: t.artists.map(({ id, name }) => ({ id, name })),
})

async function fetchTop(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const base = 'https://api.spotify.com/v1/me/top'
  const tracks = await getJson<{ items: SpotifyApiTrack[] }>(`${base}/tracks?time_range=medium_term&limit=50`, headers)
  const artists = await getJson<{ items: SpotifyApiArtist[] }>(`${base}/artists?time_range=medium_term&limit=20`, headers)
  const topTracks = tracks.items.map(toSpotifyTrackFromApi)
  const topArtists: ArtistRef[] = artists.items.map(({ id, name }) => ({ id, name }))
  return { topTracks, topArtists }
}

// Last.fm gives only a title and an artist credit. One Spotify search turns that into the track's Spotify ID,
// ISRC and artist IDs; the result must still match on title and artist, so a cover or namesake isn't taken.
async function findOnSpotify(accessToken: string, title: string, credit: string): Promise<SpotifyTrack | undefined> {
  const names = splitArtistNames(credit)
  // Brackets and "ft." parts of a Last.fm title only narrow the search; the match below ignores them anyway.
  const searchTitle = title.replace(/\s*[([].*$/, '').replace(/\s+(?:feat|ft)\.\s.*$/i, '') || title
  const wanted: SpotifyTrack = { id: '', title, durationMs: 0, artists: names.map((name) => ({ id: '', name })) }
  // Search by the full credit first ("Simon & Garfunkel" is one act); if it was split and that finds nothing,
  // the first credited artist is enough to find a collaboration.
  for (const artist of names.slice(0, 2)) {
    const q = `track:${searchTitle} artist:${artist}`
    const { tracks } = await getJson<{ tracks: { items: (SpotifyApiTrack | null)[] } }>(
      `https://api.spotify.com/v1/search?type=track&market=from_token&limit=${SEARCH_LIMIT}&q=${encodeURIComponent(q)}`,
      { Authorization: `Bearer ${accessToken}` },
    )
    const results = tracks.items.flatMap((t) => (t ? [toSpotifyTrackFromApi(t)] : []))
    const id = matchTrack(wanted, results)
    if (id) return results.find((t) => t.id === id)
  }
  return undefined
}

// --- ReccoBeats ---

type ReccoTrack = {
  trackTitle: string
  durationMs: number
  href: string
  isrc?: string
  artists: { id: string; name: string; href?: string }[]
}

function toSpotifyTrack(t: ReccoTrack): SpotifyTrack | undefined {
  const id = spotifyIdFromHref(t.href)
  if (!id) return undefined
  return {
    id,
    title: t.trackTitle,
    durationMs: t.durationMs,
    isrc: t.isrc,
    artists: t.artists.map((a) => ({ id: /\/artist\/([A-Za-z0-9]+)/.exec(a.href ?? '')?.[1] ?? a.id, name: a.name })),
  }
}

// Spotify may know a recording under a different ID than ReccoBeats. Look it up by ISRC, else (if `byTitle`)
// search by title. That search is loose and returns at most 50 per page and 200 overall, so a miss costs 4
// requests: keep it for the few top tracks, never for the hundreds of recommendations. Stop at the first match.
// A failed final lookup throws, so callers can tell "not found" (which is cached) from "could not look" (which isn't).
async function findOnReccoBeats(track: SpotifyTrack, byTitle: boolean): Promise<SpotifyTrack | undefined> {
  // An ISRC identifies the recording exactly and ReccoBeats accepts it as an ID, with no paging or result cap.
  if (track.isrc) {
    try {
      const { content } = await getJson<{ content: ReccoTrack[] }>(`${RECCOBEATS}/track?ids=${track.isrc}`)
      const found = content[0] && toSpotifyTrack(content[0])
      if (found) return found
    } catch (error) {
      // Fall through to the name search, if there is one.
      if (!byTitle) throw error
    }
  }
  if (!byTitle) return undefined

  const candidates: TrackCandidate[] = []
  const byId = new Map<string, ReccoTrack>()
  for (let page = 0, totalPages = 1; page < totalPages; page++) {
    const result = await getJson<{ content: ReccoTrack[]; totalPages: number }>(
      `${RECCOBEATS}/track/search?searchText=${encodeURIComponent(track.title)}&page=${page}&size=50`,
    )
    totalPages = result.totalPages
    for (const t of result.content) {
      const id = spotifyIdFromHref(t.href)
      if (!id) continue
      byId.set(id, t)
      candidates.push({ id, title: t.trackTitle, artists: t.artists, isrc: t.isrc })
    }
    const id = matchTrack(track, candidates)
    if (id) return toSpotifyTrack(byId.get(id)!)
  }
  return undefined
}

// --- Last.fm ---

function lastfm<T>(method: string, params: Record<string, string>): Promise<T> {
  return cached(`lastfm:${method}:${JSON.stringify(params)}`, async () => {
    const query = new URLSearchParams({ method, api_key: lastfmKey!, format: 'json', autocorrect: '1', ...params })
    const data = await getJson<T & { error?: number; message?: string }>(`https://ws.audioscrobbler.com/2.0/?${query}`)
    // Last.fm reports many failures as a 200 with an error code in the body.
    if (data.error) throw new Error(`Last.fm error ${data.error}: ${data.message}`)
    return data
  })
}

// For each top artist: its closest similar artists, then each one's top tracks, resolved to Spotify tracks by search.
async function fetchRecommendations(accessToken: string, topArtists: ArtistRef[]): Promise<Recommendation[]> {
  return mapLimit(topArtists, ARTIST_CONCURRENCY, async (anchor): Promise<Recommendation> => {
    const tracks: SpotifyTrack[] = []
    try {
      const { similarartists } = await lastfm<{ similarartists: { artist: SimilarArtist[] } }>('artist.getSimilar', {
        artist: anchor.name,
      })
      const similar = pickSimilarArtists(similarartists.artist, {
        limit: SIMILAR_ARTISTS_PER_ARTIST,
        minMatch: MIN_SIMILARITY,
      })
      for (const artist of similar) {
        try {
          const { toptracks } = await lastfm<{ toptracks: { track: { name: string }[] } }>('artist.getTopTracks', {
            artist,
            limit: String(TRACKS_PER_SIMILAR_ARTIST),
          })
          for (const { name } of toptracks.track) {
            try {
              const found = await cached<SpotifyTrack | null>(
                `spotify:${artist}|${name}`,
                async () => (await findOnSpotify(accessToken, name, artist)) ?? null,
              )
              if (found) tracks.push(found)
            } catch (error) {
              console.warn(`    ${artist} - ${name}: skipped (${errorText(error)})`)
            }
          }
        } catch (error) {
          console.warn(`    ${artist}: skipped (${errorText(error)})`)
        }
      }
      console.log(`  ${anchor.name}: ${similar.length} similar artists, ${tracks.length} tracks found`)
    } catch (error) {
      console.warn(`  ${anchor.name}: skipped (${errorText(error)})`)
    }
    saveCache()
    return { anchorArtistId: anchor.id, tracks }
  })
}

async function fetchFeatures(allIds: string[]): Promise<Record<string, Features>> {
  const features: Record<string, Features> = {}
  const ids: string[] = []
  for (const id of allIds) {
    const hit = cache[`features:${id}`] as Features | undefined
    if (hit) features[id] = hit
    else ids.push(id)
  }
  for (let i = 0; i < ids.length; i += FEATURE_BATCH) {
    const batch = ids.slice(i, i + FEATURE_BATCH)
    try {
      const { content } = await getJson<{
        content: { href: string; tempo: number; energy: number; valence: number; acousticness: number }[]
      }>(`${RECCOBEATS}/audio-features?ids=${batch.join(',')}`)
      for (const f of content) {
        const id = spotifyIdFromHref(f.href)
        const values = [f.tempo, f.energy, f.valence, f.acousticness]
        if (id && values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
          features[id] = { tempo: f.tempo, energy: f.energy, valence: f.valence, acousticness: f.acousticness }
          cache[`features:${id}`] = features[id]
        }
      }
    } catch (error) {
      console.warn(`  features batch at ${i} skipped (${error instanceof Error ? error.message.slice(0, 120) : error})`)
    }
  }
  return features
}

// Spotify album art (300x300) by track ID, from the public oEmbed endpoint: it needs no login, and the Web API's
// batch GET /tracks returns 403 for this app. A track that fails is skipped: it just gets no image.
async function fetchImages(ids: string[]): Promise<Record<string, string>> {
  const images: Record<string, string> = {}
  for (let i = 0; i < ids.length; i += IMAGE_CONCURRENCY) {
    await Promise.all(
      ids.slice(i, i + IMAGE_CONCURRENCY).map(async (id) => {
        try {
          const hit = cache[`image:${id}`] as string | undefined
          const { thumbnail_url } = hit
            ? { thumbnail_url: hit }
            : await getJson<{ thumbnail_url?: string }>(
                `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`,
              )
          if (thumbnail_url) {
            images[id] = thumbnail_url
            cache[`image:${id}`] = thumbnail_url
          }
        } catch (error) {
          console.warn(`  image for ${id} skipped (${error instanceof Error ? error.message.slice(0, 100) : error})`)
        }
      }),
    )
  }
  return images
}

// --- Main ---

const accessToken = await login()
console.log('Fetching Spotify top tracks and artists...')
const { topTracks, topArtists } = await fetchTop(accessToken)
console.log(`  ${topTracks.length} top tracks, ${topArtists.length} top artists`)

const features: Record<string, Features> = {}

// The tracks ReccoBeats has features for, keyed by their original Spotify ID. A track it doesn't know by that ID
// is looked up by ISRC (and, if `byTitle`, by title) and keeps Spotify's own metadata: only its ID changes.
async function withFeatures(tracks: SpotifyTrack[], byTitle: boolean): Promise<Map<string, SpotifyTrack>> {
  Object.assign(features, await fetchFeatures(tracks.map((t) => t.id).filter((id) => !features[id])))
  const usable = new Map<string, SpotifyTrack>()
  for (const track of tracks) {
    if (features[track.id]) {
      usable.set(track.id, track)
      continue
    }
    let match: SpotifyTrack | null
    try {
      match = await cached(`recco:${track.id}`, async () => (await findOnReccoBeats(track, byTitle)) ?? null)
    } catch (error) {
      console.warn(`  ${track.title}: ReccoBeats lookup failed, skipped (${errorText(error)})`)
      continue
    }
    if (!match) {
      console.warn(`  ${track.title}: not in ReccoBeats, skipped`)
      continue
    }
    if (!features[match.id]) Object.assign(features, await fetchFeatures([match.id]))
    if (features[match.id]) usable.set(track.id, { ...track, id: match.id })
    else console.warn(`  ${track.title}: matched but has no features, skipped`)
  }
  return usable
}

console.log('Fetching ReccoBeats features for top tracks...')
const usableTop = await withFeatures(topTracks, true)
const usableTracks = [...usableTop.values()]
const remapped = [...usableTop].filter(([id, t]) => t.id !== id).length
console.log(`  ${usableTracks.length} of ${topTracks.length} top tracks usable (${remapped} under a different ID)`)

console.log('Fetching Last.fm similar artists and finding their top tracks on Spotify...')
const found = await fetchRecommendations(accessToken, topArtists)
saveCache()

const recTracks = [...new Map(found.flatMap((r) => r.tracks).map((t) => [t.id, t])).values()]
console.log(`Fetching ReccoBeats features for ${recTracks.length} recommended tracks...`)
const usableRecs = await withFeatures(recTracks, false)
console.log(`  ${usableRecs.size} of ${recTracks.length} recommended tracks have features`)
const recommendations: Recommendation[] = found.map((r) => ({
  anchorArtistId: r.anchorArtistId,
  tracks: r.tracks.flatMap((t) => usableRecs.get(t.id) ?? []),
}))

const imageIds = Object.keys(features)
console.log(`Fetching Spotify images for ${imageIds.length} tracks...`)
const images = await fetchImages(imageIds)

saveCache()

const catalogue = buildCatalogue({
  topTracks: usableTracks,
  topArtists,
  recommendations,
  features,
  images,
  generatedAt: new Date().toISOString(),
})

mkdirSync('data', { recursive: true })
writeFileSync('data/catalogue.json', JSON.stringify(catalogue, null, 2) + '\n')
const withoutImage = catalogue.tracks.filter((t) => !t.imageUrl).length
if (withoutImage > 0) console.warn(`  ${withoutImage} tracks have no image and will show a placeholder`)
console.log(`Wrote data/catalogue.json with ${catalogue.tracks.length} tracks.`)
