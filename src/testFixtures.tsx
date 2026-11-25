import { render, screen } from '@testing-library/react'
import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { vi } from 'vitest'
import { DislikesProvider, useDislikes } from '@/hooks/useDislikes.tsx'
import { PlaybackProvider, usePlayback } from '@/hooks/usePlayback.tsx'
import type { ConnectedPlayer } from '@/playback/connectPlayer.ts'
import { FakePlayer } from '@/playback/fakePlayer.ts'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { effects, isExcluded } from '@/recommender/dislikes.ts'
import { catalogueChooser, type Queue } from '@/recommender/queue.ts'
import { score } from '@/recommender/scoring.ts'
import { swap } from '@/recommender/swap.ts'

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
  profile?: ComponentProps<typeof PlaybackProvider>['profile']
}

/** Renders UI inside a PlaybackProvider on the fake engine and waits for it to connect. */
export async function renderWithPlayback(ui: ReactNode, { tracks, connection, logIn = vi.fn(), profile }: RenderOptions) {
  const player = (connection?.player as FakePlayer | undefined) ?? new FakePlayer(tracks)
  const connect = async () => ({ mode: 'fake', reason: 'logged-out', player, ...connection }) as ConnectedPlayer
  const rendered = render(
    <DislikesProvider>
      <Playback tracks={tracks} profile={profile} connect={connect} logIn={logIn}>
        {ui}
        <ReadyProbe />
      </Playback>
    </DislikesProvider>,
  )
  await screen.findByTestId('playback-ready')
  return { player, ...rendered }
}

/** Test-only marker that appears once the provider has connected an engine. */
function ReadyProbe() {
  return !usePlayback().ready ? null : <span data-testid="playback-ready" hidden />
}

/** A PlaybackProvider whose chooser skips Dislikes, as the real one does. */
function Playback({ tracks, ...props }: ComponentProps<typeof PlaybackProvider>) {
  const { getDislikes } = useDislikes()
  const chooser = useMemo(
    () => (queued: readonly CatalogueTrack[], count: number) =>
      catalogueChooser(tracks.filter((t) => !isExcluded(t, getDislikes())))(queued, count),
    [tracks, getDislikes],
  )
  // Scores against a profile of the default fixture features, so a track nearer them ranks higher.
  const steer = useMemo(
    () => (queue: Queue<CatalogueTrack>, heard: readonly CatalogueTrack[]) =>
      swap(queue, heard, effects([...getDislikes()]), (t) => isExcluded(t, getDislikes()), tracks, (t, adj) =>
        score(t, makeTrack({ id: 'profile' }).features, new Set(), adj)),
    [tracks, getDislikes],
  )
  return <PlaybackProvider tracks={tracks} chooser={chooser} steer={steer} {...props} />
}
