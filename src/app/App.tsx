import { useDislikes } from '@/hooks/useDislikes.tsx'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { HeardList } from './components/HeardList/HeardList.tsx'
import { Header } from './components/Header/Header.tsx'
import { MusicPlayer } from './components/MusicPlayer/MusicPlayer.tsx'
import { PlaybackBanner } from './components/PlaybackBanner/PlaybackBanner.tsx'

export default function App() {
  const { heard, playTrack, startNewQueue } = usePlayback()
  const { endSession } = useDislikes()
  return (
    <div className="flex h-dvh flex-col">
      <PlaybackBanner />
      <Header onStartNewQueue={() => {
          // End the session first, so the new queue is chosen with only the blocked artists left.
          endSession()
          startNewQueue()
        }} />
      {/* Bottom padding clears the fixed player bar; Heard fills the rest and scrolls inside itself. */}
      <main className="min-h-0 flex-1 p-6 pb-28">
        <HeardList tracks={heard} onSelect={playTrack} />
      </main>
      <MusicPlayer />
    </div>
  )
}
