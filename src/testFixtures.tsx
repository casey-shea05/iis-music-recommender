import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { PlaybackProvider, usePlayback } from '@/hooks/usePlayback.tsx'
import type { ConnectedPlayer } from '@/playback/connectPlayer.ts'
import { FakePlayer } from '@/playback/fakePlayer.ts'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'

/** A catalogue track for tests. Only the fields a test cares about need setting. */
export function makeTrack(overrides: Partial<CatalogueTrack> & { id: string }): CatalogueTrack {
  return {
    title: `Track ${overrides.id}`,
    artists: [{ id: 'artist-1', name: 'Some Artist' }],
    durationMs: 180_000,
    features: { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 },
    anchorArtistId: 'artist-1',
    isTopTrack: false,
    imageUrl: null,
    ...overrides,
  }
}

type RenderOptions = {
  tracks: CatalogueTrack[]
  connection?: Partial<ConnectedPlayer>
  logIn?: (() => void) | null
}

/** Renders UI inside a PlaybackProvider on the fake engine and waits for it to connect. */
export async function renderWithPlayback(ui: ReactNode, { tracks, connection, logIn = vi.fn() }: RenderOptions) {
  const player = (connection?.player as FakePlayer | undefined) ?? new FakePlayer(tracks)
  const connect = async () => ({ mode: 'fake', reason: 'logged-out', player, ...connection }) as ConnectedPlayer
  const rendered = render(
    <PlaybackProvider tracks={tracks} connect={connect} logIn={logIn}>
      {ui}
      <ReadyProbe />
    </PlaybackProvider>,
  )
  await screen.findByTestId('playback-ready')
  return { player, ...rendered }
}

/** Test-only marker that appears once the provider has connected an engine. */
function ReadyProbe() {
  return !usePlayback().ready ? null : <span data-testid="playback-ready" hidden />
}
