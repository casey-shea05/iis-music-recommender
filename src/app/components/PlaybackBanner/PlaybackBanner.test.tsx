import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FakePlayer } from '@/playback/fakePlayer.ts'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import { PlaybackBanner } from './PlaybackBanner.tsx'

const tracks = [makeTrack({ id: 'a' })]

describe('PlaybackBanner', () => {
  it('offers a Spotify login when nobody is logged in', async () => {
    const logIn = vi.fn()
    await renderWithPlayback(<PlaybackBanner />, { tracks, connection: { mode: 'fake', reason: 'logged-out' }, logIn })
    expect(screen.getByRole('status')).toHaveTextContent(/without sound/i)
    fireEvent.click(screen.getByRole('button', { name: 'Log in with Spotify' }))
    expect(logIn).toHaveBeenCalled()
  })

  it('says playback is unavailable when the SDK fails to connect', async () => {
    await renderWithPlayback(<PlaybackBanner />, { tracks, connection: { mode: 'fake', reason: 'unavailable' } })
    expect(screen.getByRole('status')).toHaveTextContent(/playback unavailable/i)
  })

  it('says playback is unavailable when Spotify is not configured, with no login button', async () => {
    await renderWithPlayback(<PlaybackBanner />, {
      tracks,
      connection: { mode: 'fake', reason: 'not-configured' },
      logIn: null,
    })
    expect(screen.getByRole('status')).toHaveTextContent(/playback unavailable/i)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows nothing while Spotify is playing', async () => {
    await renderWithPlayback(<PlaybackBanner />, {
      tracks,
      connection: { mode: 'spotify', player: new FakePlayer(tracks) },
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
