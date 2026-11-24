import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakePlayer } from './fakePlayer.ts'

const tracks = [
  { id: 'a', durationMs: 3000 },
  { id: 'b', durationMs: 5000 },
]

describe('FakePlayer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reports the track starting, with no artwork', () => {
    const player = new FakePlayer(tracks)
    const started = vi.fn()
    player.onTrackStarted(started)
    player.play('b')
    expect(started).toHaveBeenCalledWith({ trackId: 'b', artworkUrl: null })
  })

  it('reports progress while playing, and none while paused', () => {
    const player = new FakePlayer(tracks)
    const progress = vi.fn()
    player.onProgress(progress)

    player.play('b')
    vi.advanceTimersByTime(1000)
    expect(progress).toHaveBeenLastCalledWith({ positionMs: 1000, durationMs: 5000 })

    player.pause()
    progress.mockClear()
    vi.advanceTimersByTime(1000)
    expect(progress).not.toHaveBeenCalled()

    player.resume()
    vi.advanceTimersByTime(500)
    expect(progress).toHaveBeenLastCalledWith({ positionMs: 1500, durationMs: 5000 })
  })

  it('seeks within the track', () => {
    const player = new FakePlayer(tracks)
    const progress = vi.fn()
    player.onProgress(progress)
    player.play('b')
    player.seek(4000)
    expect(progress).toHaveBeenLastCalledWith({ positionMs: 4000, durationMs: 5000 })
  })

  it('reports the end once the duration has passed, then stops', () => {
    const player = new FakePlayer(tracks)
    const ended = vi.fn()
    player.onEnded(ended)
    player.play('a')
    vi.advanceTimersByTime(2750)
    expect(ended).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(ended).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(ended).toHaveBeenCalledTimes(1)
  })

  it('reports the end when resumed after being paused and seeked to the end', () => {
    const player = new FakePlayer(tracks)
    const ended = vi.fn()
    player.onEnded(ended)
    player.play('a')
    player.pause()
    player.seek(3000)
    player.resume()
    expect(ended).toHaveBeenCalledTimes(1)
  })

  it('stops listeners hearing events once they unsubscribe', () => {
    const player = new FakePlayer(tracks)
    const progress = vi.fn()
    player.onProgress(progress)()
    player.play('a')
    vi.advanceTimersByTime(1000)
    expect(progress).not.toHaveBeenCalled()
  })

  it('stops the timer when disconnected', () => {
    const player = new FakePlayer(tracks)
    const ended = vi.fn()
    player.onEnded(ended)
    player.play('a')
    player.disconnect()
    vi.advanceTimersByTime(5000)
    expect(ended).not.toHaveBeenCalled()
  })
})
