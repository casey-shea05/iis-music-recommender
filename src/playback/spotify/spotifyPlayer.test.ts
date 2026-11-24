import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SdkNamespace } from './sdk.ts'

/**
 * A stand-in for the Web Playback SDK. The real one breaks if a page creates a second Spotify.Player:
 * the new device reports ready but Spotify answers "Device not found" (seen with React's StrictMode double mount).
 */
function fakeSdk() {
  const players: { disconnect: ReturnType<typeof vi.fn>; listeners: Map<string, Set<(e: unknown) => void>> }[] = []
  const Player = vi.fn(function (this: object) {
    const listeners = new Map<string, Set<(e: unknown) => void>>()
    const player = {
      listeners,
      connect: vi.fn(async () => {
        queueMicrotask(() => listeners.get('ready')?.forEach((cb) => cb({ device_id: `device-${players.length}` })))
        return true
      }),
      disconnect: vi.fn(),
      activateElement: vi.fn(async () => {}),
      addListener: (event: string, cb: (e: unknown) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event)!.add(cb)
        return true
      },
      removeListener: (event: string, cb: (e: unknown) => void) => listeners.get(event)?.delete(cb) ?? false,
      getCurrentState: vi.fn(async () => null),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      seek: vi.fn(async () => {}),
      setVolume: vi.fn(async () => {}),
    }
    players.push(player)
    return player
  })
  window.Spotify = { Player } as unknown as SdkNamespace
  return { Player, players }
}

describe('connectSpotifyPlayer', () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.Spotify
  })

  it('shares one SDK device when connected twice, as StrictMode does in development', async () => {
    const sdk = fakeSdk()
    const { connectSpotifyPlayer } = await import('./spotifyPlayer.ts')
    const getAccessToken = async () => 'token'

    const first = await connectSpotifyPlayer(getAccessToken)
    first.disconnect()
    const second = await connectSpotifyPlayer(getAccessToken)

    expect(sdk.Player).toHaveBeenCalledTimes(1)
    expect(sdk.players[0].disconnect).not.toHaveBeenCalled()

    second.play('track-1')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('device_id=device-1')
  })

  it('stops a disconnected player hearing state changes from the shared device', async () => {
    const sdk = fakeSdk()
    const { connectSpotifyPlayer } = await import('./spotifyPlayer.ts')
    const first = await connectSpotifyPlayer(async () => 'token')
    const started = vi.fn()
    first.onTrackStarted(started)
    first.play('track-1')
    first.disconnect()

    sdk.players[0].listeners.get('player_state_changed')?.forEach((cb) =>
      cb({
        paused: false,
        position: 0,
        duration: 1000,
        track_window: { current_track: { id: 'track-1', uri: 'spotify:track:track-1', album: { images: [] } } },
      }),
    )
    expect(started).not.toHaveBeenCalled()
  })
})

describe('when a track counts as ended', () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(null, { status: 204 }),
  )
  const DURATION = 200_000

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.Spotify
  })

  async function setUp() {
    const sdk = fakeSdk()
    const { connectSpotifyPlayer } = await import('./spotifyPlayer.ts')
    const player = await connectSpotifyPlayer(async () => 'token')
    const ended = vi.fn()
    player.onEnded(ended)
    /** Spotify reporting what this tab's device is doing. */
    const report = (trackId: string, { paused = false, position = 0 } = {}) =>
      sdk.players[0].listeners.get('player_state_changed')?.forEach((cb) =>
        cb({
          paused,
          position,
          duration: DURATION,
          track_window: { current_track: { id: trackId, uri: `spotify:track:${trackId}`, album: { images: [] } } },
        }),
      )
    const requestedTracks = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).uris[0])
    return { player, ended, report, requestedTracks }
  }

  it('ends when Spotify moves on to a track of its own choosing', async () => {
    const { player, ended, report } = await setUp()
    player.play('a')
    report('a')
    report('autoplay-pick')
    expect(ended).toHaveBeenCalledTimes(1)
    player.disconnect()
  })

  // Seen in the browser: after Next, Previous quickly, Spotify played the older request ~300 ms after the newer one.
  it('treats a track it was asked for moments ago as a late request: no end, and asks for the right track again', async () => {
    const { player, ended, report, requestedTracks } = await setUp()
    player.play('a')
    report('a')
    player.play('b')
    report('b')
    await vi.waitFor(() => expect(requestedTracks()).toHaveLength(2))

    report('a')

    expect(ended).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(requestedTracks()).toEqual(['spotify:track:a', 'spotify:track:b', 'spotify:track:b']))
    player.disconnect()
  })

  it('ends when the track plays to its end (Spotify reports paused at 0)', async () => {
    const { player, ended, report } = await setUp()
    player.play('a')
    report('a', { position: DURATION - 1000 })
    report('a', { paused: true, position: 0 })
    expect(ended).toHaveBeenCalledTimes(1)
    player.disconnect()
  })

  it('does not end when a paused track is seeked from near its end back to the start', async () => {
    const { player, ended, report } = await setUp()
    player.play('a')
    report('a')
    report('a', { paused: true, position: 30_000 })
    player.seek(DURATION - 1000)
    report('a', { paused: true, position: DURATION - 1000 })
    player.seek(0)
    report('a', { paused: true, position: 0 })
    expect(ended).not.toHaveBeenCalled()
    player.disconnect()
  })
})
