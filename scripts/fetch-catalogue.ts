// Runs once: Spotify top tracks/artists -> Last.fm similar artists' top tracks -> ReccoBeats IDs + features -> data/catalogue.json.
// Usage: npm run catalogue   (needs SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI and LASTFM_API_KEY in .env)
// See docs/adr/0002-catalogue-source.md (and ADR 0001, decision 2, for the features).
import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { ArtistRef, Features } from '../src/recommender/catalogue.ts'
import { buildAuthorizeUrl, codeChallengeFor, generateCodeVerifier } from '../src/playback/spotify/pkce.ts'
import { SPOTIFY_SCOPES } from '../src/playback/spotify/scopes.ts'
import {
  buildCatalogue,
  matchReccoTrack,
  pickSimilarArtists,
  spotifyIdFromHref,
  type SimilarArtist,
  type ReccoCandidate,
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

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
    if (res.status === 429 && attempt < 5) {
      await sleep((Number(res.headers.get('retry-after')) || 2) * 1000)
      continue
    }
    // Keep the Last.fm key out of error messages, which get logged.
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.replace(/api_key=[^&]+/, 'api_key=***')}: ${await res.text()}`)
    return (await res.json()) as T
  }
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

async function fetchTop(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const base = 'https://api.spotify.com/v1/me/top'
  const tracks = await getJson<{ items: SpotifyApiTrack[] }>(`${base}/tracks?time_range=medium_term&limit=50`, headers)
  const artists = await getJson<{ items: SpotifyApiArtist[] }>(`${base}/artists?time_range=medium_term&limit=20`, headers)
  const topTracks: SpotifyTrack[] = tracks.items.map((t) => ({
    id: t.id,
    title: t.name,
    durationMs: t.duration_ms,
    isrc: t.external_ids?.isrc,
    artists: t.artists.map(({ id, name }) => ({ id, name })),
  }))
  const topArtists: ArtistRef[] = artists.items.map(({ id, name }) => ({ id, name }))
  return { topTracks, topArtists }
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

// Spotify may know a recording under a different ID than ReccoBeats. Look it up by ISRC, else search by title.
// Search returns at most 50 per page and 200 overall, so generic titles need paging. Stop at the first match.
async function findOnReccoBeats(track: SpotifyTrack): Promise<SpotifyTrack | undefined> {
  // An ISRC identifies the recording exactly and ReccoBeats accepts it as an ID, with no paging or result cap.
  if (track.isrc) {
    try {
      const { content } = await getJson<{ content: ReccoTrack[] }>(`${RECCOBEATS}/track?ids=${track.isrc}`)
      const found = content[0] && toSpotifyTrack(content[0])
      if (found) return found
    } catch {
      // Fall through to the name search.
    }
  }

  const candidates: ReccoCandidate[] = []
  const byId = new Map<string, ReccoTrack>()
  try {
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
      const id = matchReccoTrack(track, candidates)
      if (id) return toSpotifyTrack(byId.get(id)!)
      await sleep(200)
    }
  } catch {
    // Treated as "not found"; the caller logs the skip.
  }
  return undefined
}

// --- Last.fm ---

async function lastfm<T>(method: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ method, api_key: lastfmKey!, format: 'json', autocorrect: '1', ...params })
  const data = await getJson<T & { error?: number; message?: string }>(`https://ws.audioscrobbler.com/2.0/?${query}`)
  // Last.fm reports many failures as a 200 with an error code in the body.
  if (data.error) throw new Error(`Last.fm error ${data.error}: ${data.message}`)
  return data
}

// For each top artist: its closest similar artists, then each one's top tracks, resolved to Spotify tracks via ReccoBeats.
async function fetchRecommendations(topArtists: ArtistRef[]): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = []
  for (const anchor of topArtists) {
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
        await sleep(200)
        try {
          const { toptracks } = await lastfm<{ toptracks: { track: { name: string }[] } }>('artist.getTopTracks', {
            artist,
            limit: String(TRACKS_PER_SIMILAR_ARTIST),
          })
          for (const { name } of toptracks.track) {
            const found = await findOnReccoBeats({ id: '', title: name, durationMs: 0, artists: [{ id: '', name: artist }] })
            if (found) tracks.push(found)
            await sleep(200)
          }
        } catch (error) {
          console.warn(`    ${artist}: skipped (${error instanceof Error ? error.message.slice(0, 120) : error})`)
        }
      }
      console.log(`  ${anchor.name}: ${similar.length} similar artists, ${tracks.length} tracks found`)
    } catch (error) {
      console.warn(`  ${anchor.name}: skipped (${error instanceof Error ? error.message.slice(0, 120) : error})`)
    }
    recommendations.push({ anchorArtistId: anchor.id, tracks })
    await sleep(200)
  }
  return recommendations
}

async function fetchFeatures(ids: string[]): Promise<Record<string, Features>> {
  const features: Record<string, Features> = {}
  for (let i = 0; i < ids.length; i += FEATURE_BATCH) {
    const batch = ids.slice(i, i + FEATURE_BATCH)
    try {
      const { content } = await getJson<{
        content: { href: string; tempo: number; energy: number; valence: number; acousticness: number }[]
      }>(`${RECCOBEATS}/audio-features?ids=${batch.join(',')}`)
      for (const f of content) {
        const id = spotifyIdFromHref(f.href)
        const values = [f.tempo, f.energy, f.valence, f.acousticness]
        if (id && values.every((v) => typeof v === 'number' && Number.isFinite(v))) features[id] = { tempo: f.tempo, energy: f.energy, valence: f.valence, acousticness: f.acousticness }
      }
    } catch (error) {
      console.warn(`  features batch at ${i} skipped (${error instanceof Error ? error.message.slice(0, 120) : error})`)
    }
    await sleep(200)
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
          const { thumbnail_url } = await getJson<{ thumbnail_url?: string }>(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`,
          )
          if (thumbnail_url) images[id] = thumbnail_url
        } catch (error) {
          console.warn(`  image for ${id} skipped (${error instanceof Error ? error.message.slice(0, 100) : error})`)
        }
      }),
    )
    await sleep(200)
  }
  return images
}

// --- Main ---

const accessToken = await login()
console.log('Fetching Spotify top tracks and artists...')
const { topTracks, topArtists } = await fetchTop(accessToken)
console.log(`  ${topTracks.length} top tracks, ${topArtists.length} top artists`)

console.log('Fetching ReccoBeats features for top tracks...')
const features = await fetchFeatures(topTracks.map((t) => t.id))

// Top tracks ReccoBeats doesn't know by Spotify ID: look them up by name instead.
const usableTracks: SpotifyTrack[] = []
let remapped = 0
for (const track of topTracks) {
  if (features[track.id]) {
    usableTracks.push(track)
    continue
  }
  const match = await findOnReccoBeats(track)
  if (!match) {
    console.warn(`  ${track.title}: not in ReccoBeats, skipped`)
    continue
  }
  Object.assign(features, await fetchFeatures([match.id]))
  if (features[match.id]) {
    // Keep Spotify's own artists and metadata for the top track; only the ID differs.
    usableTracks.push({ ...track, id: match.id })
    remapped++
  } else {
    console.warn(`  ${track.title}: matched but has no features, skipped`)
  }
  await sleep(200)
}
console.log(`  ${usableTracks.length} of ${topTracks.length} top tracks usable (${remapped} found by name)`)

console.log('Fetching Last.fm similar artists and their top tracks...')
const recommendations = await fetchRecommendations(topArtists)

const recIds = [...new Set(recommendations.flatMap((r) => r.tracks.map((t) => t.id)))].filter((id) => !features[id])
console.log(`Fetching ReccoBeats features for ${recIds.length} recommended tracks...`)
Object.assign(features, await fetchFeatures(recIds))

const imageIds = Object.keys(features)
console.log(`Fetching Spotify images for ${imageIds.length} tracks...`)
const images = await fetchImages(imageIds)

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
