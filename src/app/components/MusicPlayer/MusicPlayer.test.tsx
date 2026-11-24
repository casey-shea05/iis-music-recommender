import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakePlayer } from '@/playback/fakePlayer.ts'
import type { Player, TrackStartedEvent } from '@/playback/player.ts'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import { MusicPlayer } from './MusicPlayer.tsx'

const tracks = [
  makeTrack({ id: 'a', title: 'Alpha', artists: [{ id: 'x', name: 'Ann' }, { id: 'y', name: 'Bo' }], durationMs: 2000 }),
  makeTrack({ id: 'b', title: 'Bravo', durationMs: 2000 }),
]

const button = (name: string) => screen.getByRole('button', { name })

/** The fake engine, but reporting artwork on track start the way the Spotify engine does. */
function withArtwork(player: FakePlayer): Player {
  return new Proxy(player, {
    get(target, key) {
      if (key === 'onTrackStarted') {
        return (listener: (e: TrackStartedEvent) => void) =>
          target.onTrackStarted((e) => listener({ ...e, artworkUrl: `https://example.test/${e.trackId}.jpg` }))
      }
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

describe('MusicPlayer', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('shows the title and artists of Now playing, with placeholder artwork on the fake engine', async () => {
    await renderWithPlayback(<MusicPlayer />, { tracks })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Ann, Bo')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows artwork when the engine supplies it', async () => {
    await renderWithPlayback(<MusicPlayer />, {
      tracks,
      connection: { mode: 'spotify', player: withArtwork(new FakePlayer(tracks)) },
    })
    fireEvent.click(button('Play'))
    expect(screen.getByRole('img', { name: 'Alpha artwork' })).toHaveAttribute('src', 'https://example.test/a.jpg')
  })

  it('plays, pauses and moves through the queue', async () => {
    await renderWithPlayback(<MusicPlayer />, { tracks })
    expect(button('Previous')).toBeDisabled()

    fireEvent.click(button('Play'))
    expect(button('Pause')).toBeInTheDocument()
    fireEvent.click(button('Pause'))
    expect(button('Play')).toBeInTheDocument()

    fireEvent.click(button('Next'))
    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(button('Next')).toBeDisabled()
    fireEvent.click(button('Previous'))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('keeps volume and mute memory when switching to the full-screen view', async () => {
    await renderWithPlayback(<MusicPlayer />, { tracks })
    // By label, not role: the thumb stays hidden in jsdom until it has been measured, and jsdom has no layout.
    const volumeIn = (container: HTMLElement) => within(container).getByLabelText('Volume', { selector: 'input' })
    const volume = () => volumeIn(document.body)

    fireEvent.change(volume(), { target: { value: '0.6' } })
    fireEvent.click(button('Mute'))
    expect(volume()).toHaveValue('0')

    fireEvent.click(button('Expand player'))
    const fullScreen = screen.getByRole('dialog', { name: 'Now playing' })
    fireEvent.click(within(fullScreen).getByRole('button', { name: 'Unmute' }))
    expect(volumeIn(fullScreen)).toHaveValue('0.6')

    fireEvent.click(within(fullScreen).getByRole('button', { name: 'Collapse player' }))
    expect(volume()).toHaveValue('0.6')
  })

  it('sets the engine volume from the volume slider', async () => {
    const player = new FakePlayer(tracks)
    const setVolume = vi.spyOn(player, 'setVolume')
    await renderWithPlayback(<MusicPlayer />, { tracks, connection: { player } })
    fireEvent.change(screen.getByLabelText('Volume', { selector: 'input' }), { target: { value: '0.3' } })
    expect(setVolume).toHaveBeenLastCalledWith(0.3)
  })

  it('seeks Now playing from the seek slider', async () => {
    const player = new FakePlayer(tracks)
    const seek = vi.spyOn(player, 'seek')
    await renderWithPlayback(<MusicPlayer />, { tracks, connection: { player } })
    fireEvent.click(button('Play'))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    fireEvent.click(button('Expand player'))
    const fullScreen = screen.getByRole('dialog', { name: 'Now playing' })
    expect(within(fullScreen).getByText('0:01')).toBeInTheDocument()

    fireEvent.keyDown(within(fullScreen).getByLabelText('Seek', { selector: 'input' }), { key: 'Home' })

    expect(seek).toHaveBeenLastCalledWith(0)
    expect(within(fullScreen).getByText('0:00')).toBeInTheDocument()
  })

  it('shows elapsed and total time in the full-screen view', async () => {
    await renderWithPlayback(<MusicPlayer />, { tracks })
    fireEvent.click(button('Play'))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    fireEvent.click(button('Expand player'))
    const fullScreen = screen.getByRole('dialog', { name: 'Now playing' })
    expect(within(fullScreen).getByText('0:01')).toBeInTheDocument()
    expect(within(fullScreen).getByText('0:02')).toBeInTheDocument()
  })
})
