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
