import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSpotifyAuth } from './auth.ts'

const navigate = vi.fn<(url: string) => void>()
const config = { clientId: 'client-123', redirectUri: 'http://127.0.0.1:5173/callback', navigate }

function tokenResponse(body: object, ok = true) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: ok ? 200 : 400 }))
}

/** Simulates Spotify sending the browser back to the redirect URI. */
function arriveFromSpotify(params: Record<string, string>) {
  history.replaceState(null, '', `/callback?${new URLSearchParams(params)}`)
}

describe('Spotify browser auth', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    history.replaceState(null, '', '/')
    fetchMock.mockReset()
    navigate.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('has no access token before anyone logs in', async () => {
    const auth = createSpotifyAuth(config)
    expect(await auth.getAccessToken()).toBeNull()
  })

  it('completes a login from the callback URL and keeps the token across reloads', async () => {
    await createSpotifyAuth(config).startLogin()
    const authorizeUrl = new URL(navigate.mock.calls[0][0])
    expect(authorizeUrl.searchParams.get('scope')).toContain('streaming')

    arriveFromSpotify({ code: 'the-code', state: authorizeUrl.searchParams.get('state')! })
    fetchMock.mockReturnValueOnce(
      tokenResponse({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 }),
    )
    expect(await createSpotifyAuth(config).completeLogin()).toBe(true)
    expect(location.pathname).toBe('/')
    expect(location.search).toBe('')

    // A fresh instance stands in for a page reload.
    expect(await createSpotifyAuth(config).getAccessToken()).toBe('access-1')
  })

  async function logIn() {
    await createSpotifyAuth(config).startLogin()
    const state = new URL(navigate.mock.calls[0][0]).searchParams.get('state')!
    arriveFromSpotify({ code: 'the-code', state })
    fetchMock.mockReturnValueOnce(
      tokenResponse({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 }),
    )
    await createSpotifyAuth(config).completeLogin()
    fetchMock.mockClear()
  }

  it('silently refreshes an expired access token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await logIn()
    vi.advanceTimersByTime(3600 * 1000)

    fetchMock.mockReturnValueOnce(
      tokenResponse({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3600 }),
    )
    expect(await createSpotifyAuth(config).getAccessToken()).toBe('access-2')
    const body = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('refresh-1')

    // The new token is saved, so the next call doesn't refresh again.
    expect(await createSpotifyAuth(config).getAccessToken()).toBe('access-2')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats a failed refresh as logged out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await logIn()
    vi.advanceTimersByTime(3600 * 1000)

    fetchMock.mockReturnValueOnce(tokenResponse({ error: 'invalid_grant' }, false))
    expect(await createSpotifyAuth(config).getAccessToken()).toBeNull()
    expect(await createSpotifyAuth(config).getAccessToken()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the login when a refresh fails only because the network is down', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await logIn()
    vi.advanceTimersByTime(3600 * 1000)

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await createSpotifyAuth(config).getAccessToken()).toBeNull()

    fetchMock.mockReturnValueOnce(
      tokenResponse({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3600 }),
    )
    expect(await createSpotifyAuth(config).getAccessToken()).toBe('access-2')
  })

  it('shares one callback exchange between overlapping calls', async () => {
    await createSpotifyAuth(config).startLogin()
    const state = new URL(navigate.mock.calls[0][0]).searchParams.get('state')!
    arriveFromSpotify({ code: 'the-code', state })
    fetchMock.mockReturnValueOnce(
      tokenResponse({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 }),
    )
    const auth = createSpotifyAuth(config)
    // React's StrictMode mounts twice in development, so the connect effect calls this twice.
    const [first, second] = await Promise.all([auth.completeLogin(), auth.completeLogin()])
    expect([first, second]).toEqual([true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a callback whose state does not match', async () => {
    await createSpotifyAuth(config).startLogin()
    arriveFromSpotify({ code: 'the-code', state: 'forged' })
    expect(await createSpotifyAuth(config).completeLogin()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
