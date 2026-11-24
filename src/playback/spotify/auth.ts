// Spotify login in the browser: Authorization Code + PKCE, no client secret.
// The browser handles its own callback on SPOTIFY_REDIRECT_URI (the script's loopback server is Node-only).
// Tokens live in localStorage, so a reload doesn't need a new login. See ADR-0001 decision 3.
import { buildAuthorizeUrl, codeChallengeFor, generateCodeVerifier } from './pkce.ts'
import { SPOTIFY_SCOPES } from './scopes.ts'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const TOKENS_KEY = 'spotify.tokens'
// The verifier and state only need to survive the round trip to Spotify, so sessionStorage is enough.
const PENDING_KEY = 'spotify.pendingLogin'
// Refresh a minute early so a token doesn't expire mid-request.
const EXPIRY_MARGIN_MS = 60_000

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number }
/** Saved tokens, or why there are none: Spotify said no, or couldn't be reached. */
type TokenResult = Tokens | 'rejected' | 'unreachable'
type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number }

export type SpotifyAuthConfig = {
  clientId: string
  redirectUri: string
  /** How to leave for Spotify's login page. Defaults to a full-page redirect. */
  navigate?: (url: string) => void
}

/** A valid access token, or null when nobody is logged in. */
export type GetAccessToken = () => Promise<string | null>

export type SpotifyAuth = {
  /** Sends the browser to Spotify's login page. */
  startLogin(): Promise<void>
  /** If the page was loaded from Spotify's callback, swaps the code for tokens and tidies the URL. True on success. */
  completeLogin(): Promise<boolean>
  /** A valid access token, or null when nobody is logged in. */
  getAccessToken(): Promise<string | null>
}

export function createSpotifyAuth({
  clientId,
  redirectUri,
  navigate = (url) => window.location.assign(url),
}: SpotifyAuthConfig): SpotifyAuth {
  let refreshing: Promise<TokenResult> | null = null
  // One exchange per page load: the code and verifier can only be used once.
  let completing: Promise<boolean> | null = null

  /** Spotify may leave out refresh_token on a refresh; then the old one stays valid. */
  async function requestTokens(body: Record<string, string>, oldRefreshToken?: string): Promise<TokenResult> {
    let res: Response
    try {
      res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, ...body }),
      })
    } catch {
      return 'unreachable'
    }
    try {
      if (!res.ok) return 'rejected'
      const json = (await res.json()) as TokenResponse
      const refreshToken = json.refresh_token ?? oldRefreshToken
      if (!json.access_token || !refreshToken) return 'rejected'
      const tokens = {
        accessToken: json.access_token,
        refreshToken,
        expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
      }
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
      return tokens
    } catch {
      return 'rejected'
    }
  }

  async function exchangeCallbackCode(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code && !params.get('error')) return false

    const pending = readJson<{ verifier: string; state: string }>(sessionStorage, PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    history.replaceState(null, '', '/')
    if (!code || !pending || params.get('state') !== pending.state) return false

    const tokens = await requestTokens({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: pending.verifier,
    })
    return typeof tokens === 'object'
  }

  return {
    async startLogin() {
      const verifier = generateCodeVerifier()
      const state = generateCodeVerifier().slice(0, 16)
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state }))
      navigate(
        buildAuthorizeUrl({
          clientId,
          redirectUri,
          scopes: SPOTIFY_SCOPES,
          codeChallenge: await codeChallengeFor(verifier),
          state,
        }),
      )
    },

    completeLogin() {
      completing ??= exchangeCallbackCode()
      return completing
    },

    async getAccessToken() {
      const saved = readJson<Tokens>(localStorage, TOKENS_KEY)
      if (!saved) return null
      if (Date.now() < saved.expiresAt - EXPIRY_MARGIN_MS) return saved.accessToken

      // Share one refresh between callers that ask at the same moment.
      refreshing ??= requestTokens(
        { grant_type: 'refresh_token', refresh_token: saved.refreshToken },
        saved.refreshToken,
      ).finally(() => {
        refreshing = null
      })
      const result = await refreshing
      if (typeof result === 'object') return result.accessToken
      // Only forget the login when Spotify turned it down; a network blip keeps it for the next try.
      if (result === 'rejected') localStorage.removeItem(TOKENS_KEY)
      return null
    },
  }
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** The app's one auth instance, from .env. Null when Spotify isn't configured. */
export const spotifyAuth: SpotifyAuth | null =
  import.meta.env.SPOTIFY_CLIENT_ID && import.meta.env.SPOTIFY_REDIRECT_URI
    ? createSpotifyAuth({
        clientId: import.meta.env.SPOTIFY_CLIENT_ID,
        redirectUri: import.meta.env.SPOTIFY_REDIRECT_URI,
      })
    : null
