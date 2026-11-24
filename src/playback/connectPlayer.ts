// Engine selection (ADR-0001 decision 3): try Spotify, otherwise fall back to the fake engine.
// The app never forces a login: with no saved login it starts on the fake engine.
import { FakePlayer } from './fakePlayer.ts'
import type { PlayableTrack, Player } from './player.ts'
import { spotifyAuth, type GetAccessToken, type SpotifyAuth } from './spotify/auth.ts'
import { connectSpotifyPlayer } from './spotify/spotifyPlayer.ts'

/** Why the fake engine is running. The banner words its message from this. */
export type FallbackReason = 'not-configured' | 'logged-out' | 'unavailable'

export type ConnectedPlayer =
  | { mode: 'spotify'; player: Player }
  | { mode: 'fake'; player: Player; reason: FallbackReason }

export type ConnectOptions = {
  tracks: readonly PlayableTrack[]
  /** Defaults to the login from .env; null when SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI is missing. */
  auth?: Pick<SpotifyAuth, 'completeLogin' | 'getAccessToken'> | null
  connectSpotify?: (getAccessToken: GetAccessToken) => Promise<Player>
  /** How long to wait for the SDK before giving up (a forum report says connect() can hang in Development Mode). */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

/** Sends the browser to Spotify's login page, or null when Spotify isn't configured in .env. */
export const startLogIn: (() => void) | null = spotifyAuth && (() => void spotifyAuth!.startLogin())

export async function connectPlayer({
  tracks,
  auth = spotifyAuth,
  connectSpotify = connectSpotifyPlayer,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ConnectOptions): Promise<ConnectedPlayer> {
  const fake = (reason: FallbackReason): ConnectedPlayer => ({ mode: 'fake', player: new FakePlayer(tracks), reason })

  if (!auth) return fake('not-configured')

  // The time-box covers the token requests too: a stalled login or refresh would otherwise leave the app connecting.
  const attempt = (async () => {
    await auth.completeLogin()
    if (!(await auth.getAccessToken())) return 'logged-out' as const
    return connectSpotify(() => auth.getAccessToken())
  })()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })

  try {
    const winner = await Promise.race([attempt, timedOut])
    if (winner === 'timeout') {
      // If the SDK connects later, release it so it doesn't play alongside the fake engine.
      attempt.then((late) => late !== 'logged-out' && late.disconnect(), () => {})
      return fake('unavailable')
    }
    if (winner === 'logged-out') return fake('logged-out')
    return { mode: 'spotify', player: winner }
  } catch (error) {
    console.warn('Spotify playback unavailable, using the fake engine.', error)
    return fake('unavailable')
  } finally {
    clearTimeout(timer)
  }
}
