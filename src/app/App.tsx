import { MusicPlayer } from './components/MusicPlayer/MusicPlayer.tsx'
import { PlaybackBanner } from './components/PlaybackBanner/PlaybackBanner.tsx'

export default function App() {
  return (
    <>
      <PlaybackBanner />
      <main className="p-6 pb-32">
        <h1 className="text-xl font-semibold">IIS Music Recommender</h1>
      </main>
      <MusicPlayer />
    </>
  )
}
