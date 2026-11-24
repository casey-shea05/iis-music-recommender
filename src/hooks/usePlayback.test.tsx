import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectedPlayer } from '@/playback/connectPlayer.ts'
import { FakePlayer } from '@/playback/fakePlayer.ts'
import { makeTrack } from '@/testFixtures.tsx'
import { PlaybackProvider, usePlayback } from './usePlayback.tsx'

const tracks = [
  makeTrack({ id: 'a', title: 'Alpha', durationMs: 2000 }),
  makeTrack({ id: 'b', title: 'Bravo', durationMs: 2000 }),
  makeTrack({ id: 'c', title: 'Charlie', durationMs: 2000 }),
]

function setup(connected?: Partial<ConnectedPlayer>) {
  const player = new FakePlayer(tracks)
  const connect = vi.fn(async (): Promise<ConnectedPlayer> =>
    ({ mode: 'fake', reason: 'logged-out', player, ...connected }) as ConnectedPlayer,
  )
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PlaybackProvider tracks={tracks} connect={connect}>
      {children}
    </PlaybackProvider>
  )
  return { player: (connected?.player ?? player) as FakePlayer, ...renderHook(() => usePlayback(), { wrapper }) }
}

async function connected(connected?: Partial<ConnectedPlayer>) {
  const rendered = setup(connected)
  await waitFor(() => expect(rendered.result.current.status).not.toBe('connecting'))
  return rendered
}

describe('usePlayback', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('connects, then has the first track Now playing but not yet playing', async () => {
    const { result } = await connected()
    expect(result.current.status).toBe('fake')
    expect(result.current.nowPlaying?.title).toBe('Alpha')
    expect(result.current.playing).toBe(false)
  })

  it('plays and pauses Now playing, tracking its position', async () => {
    const { result } = await connected()
    act(() => result.current.togglePlay())
    expect(result.current.playing).toBe(true)

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.positionMs).toBe(1000)
    expect(result.current.durationMs).toBe(2000)

    act(() => result.current.togglePlay())
    expect(result.current.playing).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(result.current.positionMs).toBe(1000)
  })

  it('next and previous play each track, and stop at either end without crashing', async () => {
    const { result, player } = await connected()
    const play = vi.spyOn(player, 'play')

    expect(result.current.hasPrevious).toBe(false)
    act(() => result.current.previous())
    expect(result.current.nowPlaying?.title).toBe('Alpha')

    act(() => result.current.next())
    expect(result.current.nowPlaying?.title).toBe('Bravo')
    expect(result.current.playing).toBe(true)
    act(() => result.current.next())
    expect(result.current.hasNext).toBe(false)
    act(() => result.current.next())
    expect(result.current.nowPlaying?.title).toBe('Charlie')

    act(() => result.current.previous())
    expect(result.current.nowPlaying?.title).toBe('Bravo')
    expect(play.mock.calls.map(([id]) => id)).toEqual(['b', 'c', 'b'])
  })

  it('plays any track in the queue by its position', async () => {
    const { result } = await connected()
    act(() => result.current.playAt(2))
    expect(result.current.nowPlaying?.title).toBe('Charlie')
    expect(result.current.playing).toBe(true)
  })

  it('moves on to the next track when one ends, and stops after the last', async () => {
    const { result } = await connected()
    act(() => result.current.playAt(1))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(result.current.nowPlaying?.title).toBe('Charlie')
    expect(result.current.playing).toBe(true)

    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(result.current.nowPlaying?.title).toBe('Charlie')
    expect(result.current.playing).toBe(false)
  })

  it('plays the last track again from the start when Play is pressed after it ended', async () => {
    const { result } = await connected()
    act(() => result.current.playAt(2))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(result.current.playing).toBe(false)

    act(() => result.current.togglePlay())
    expect(result.current.playing).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(result.current.positionMs).toBe(500)
  })

  it('remembers the volume across a mute and unmute', async () => {
    const { result, player } = await connected()
    const setVolume = vi.spyOn(player, 'setVolume')

    act(() => result.current.setVolume(0.6))
    act(() => result.current.toggleMute())
    expect(result.current.volume).toBe(0)
    expect(result.current.muted).toBe(true)
    expect(setVolume).toHaveBeenLastCalledWith(0)

    act(() => result.current.toggleMute())
    expect(result.current.volume).toBe(0.6)
    expect(setVolume).toHaveBeenLastCalledWith(0.6)
  })

  it('unmutes to the last volume above zero after dragging the slider to zero', async () => {
    const { result } = await connected()
    act(() => result.current.setVolume(0.4))
    act(() => result.current.setVolume(0))
    expect(result.current.muted).toBe(true)
    act(() => result.current.toggleMute())
    expect(result.current.volume).toBe(0.4)
  })

  it('applies its volume to the engine when it connects', async () => {
    const player = new FakePlayer(tracks)
    const setVolume = vi.spyOn(player, 'setVolume')
    await connected({ player })
    expect(setVolume).toHaveBeenCalledWith(1)
  })

  it('seeks within Now playing', async () => {
    const { result } = await connected()
    act(() => result.current.togglePlay())
    act(() => result.current.seek(1500))
    expect(result.current.positionMs).toBe(1500)
  })

  // Spotify reports the new position a moment after a seek; until then the seek bar flashed back to the old one.
  it('shows the seeked-to position before an engine that reports it late', async () => {
    const player = new FakePlayer(tracks)
    vi.spyOn(player, 'seek').mockImplementation(() => {})
    const { result } = await connected({ player })
    act(() => result.current.togglePlay())
    act(() => result.current.seek(1500))
    expect(result.current.positionMs).toBe(1500)
  })
})
