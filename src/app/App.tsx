import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { HeardList } from './components/HeardList/HeardList.tsx'
import { Header } from './components/Header/Header.tsx'
import { MusicPlayer } from './components/MusicPlayer/MusicPlayer.tsx'
import { PlaybackBanner } from './components/PlaybackBanner/PlaybackBanner.tsx'

// TODO(IIS-61): mock data for the UI mock-up; replace with the Heard record from playback.
const MOCK_HEARD: CatalogueTrack[] = Array.from({ length: 12 }, (_, i) => ({
  id: `heard-${i}`,
  title: `Heard track ${i + 1}`,
  artists: [{ id: 'a', name: 'Some Artist' }],
  durationMs: 150_000 + i * 17_000,
  features: { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 },
  anchorArtistId: 'a',
  isTopTrack: false,
}))

export default function App() {
  return (
    <div className="flex h-dvh flex-col">
      <PlaybackBanner />
      <Header onStartNewQueue={() => {}} />
      {/* Bottom padding clears the fixed player bar; Heard fills the rest and scrolls inside itself. */}
      <main className="min-h-0 flex-1 p-6 pb-28">
        <HeardList tracks={MOCK_HEARD} onSelect={() => {}} />
      </main>
      <MusicPlayer />
    </div>
  )
}
