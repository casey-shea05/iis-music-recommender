import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectPlayer } from './connectPlayer.ts'
import { FakePlayer } from './fakePlayer.ts'
import type { Player } from './player.ts'

const tracks = [{ id: 'a', durationMs: 3000 }]

function authWith(token: string | null) {
  return { completeLogin: vi.fn(async () => false), getAccessToken: vi.fn(async () => token) }
}

describe('connectPlayer', () => {
  afterEach(() => vi.useRealTimers())

  it('uses the fake engine and asks for a login when nobody is logged in', async () => {
    const connectSpotify = vi.fn()
    const result = await connectPlayer({ tracks, auth: authWith(null), connectSpotify })
    expect(result).toMatchObject({ mode: 'fake', reason: 'logged-out' })
    expect(result.player).toBeInstanceOf(FakePlayer)
    expect(connectSpotify).not.toHaveBeenCalled()
  })

  it('uses the fake engine when Spotify is not configured', async () => {
    const result = await connectPlayer({ tracks, auth: null })
    expect(result).toMatchObject({ mode: 'fake', reason: 'not-configured' })
  })

  it('uses the Spotify engine when a login exists and the SDK connects', async () => {
    const spotify = new FakePlayer(tracks) as Player
    const auth = authWith('token')
    const result = await connectPlayer({ tracks, auth, connectSpotify: async () => spotify })
    expect(result).toEqual({ mode: 'spotify', player: spotify })
    expect(auth.completeLogin).toHaveBeenCalled()
  })

  it('falls back to the fake engine when the SDK fails to connect', async () => {
    const result = await connectPlayer({
      tracks,
      auth: authWith('token'),
      connectSpotify: async () => {
        throw new Error('account_error')
      },
    })
    expect(result).toMatchObject({ mode: 'fake', reason: 'unavailable' })
  })

  it('falls back to the fake engine when the SDK hangs', async () => {
    vi.useFakeTimers()
    const connecting = connectPlayer({
      tracks,
      auth: authWith('token'),
      connectSpotify: () => new Promise(() => {}),
      timeoutMs: 5000,
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect(await connecting).toMatchObject({ mode: 'fake', reason: 'unavailable' })
  })

  it.each([
    ['finishing the login after the redirect', { completeLogin: () => new Promise<boolean>(() => {}), getAccessToken: async () => 'token' }],
    ['refreshing the token on reload', { completeLogin: async () => false, getAccessToken: () => new Promise<string | null>(() => {}) }],
  ])('falls back to the fake engine when %s hangs', async (_step, auth) => {
    vi.useFakeTimers()
    let result: unknown
    void connectPlayer({ tracks, auth, connectSpotify: vi.fn(), timeoutMs: 5000 }).then((r) => (result = r))
    await vi.advanceTimersByTimeAsync(5000)
    expect(result).toMatchObject({ mode: 'fake', reason: 'unavailable' })
  })

  it('disconnects a Spotify engine that connects after the time-box ran out', async () => {
    vi.useFakeTimers()
    const late = new FakePlayer(tracks)
    const disconnect = vi.spyOn(late, 'disconnect')
    const connecting = connectPlayer({
      tracks,
      auth: authWith('token'),
      connectSpotify: () => new Promise((resolve) => setTimeout(() => resolve(late), 8000)),
      timeoutMs: 5000,
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect((await connecting).mode).toBe('fake')
    await vi.advanceTimersByTimeAsync(3000)
    expect(disconnect).toHaveBeenCalled()
  })
})
