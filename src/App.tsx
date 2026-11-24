// PROTOTYPE (IIS-56 pre-step): player bar chosen; queue and track list below are stand-ins (IIS-27).
import { PlayerBar } from './prototype/PlayerBar.tsx'
import { artistNames } from './prototype/format.ts'
import { usePrototypePlayer } from './prototype/usePrototypePlayer.ts'

export default function App() {
  const { view, tracks, playTrack, jumpNearEnd } = usePrototypePlayer()

  return (
    <main className="p-6 pb-32">
      <h1 className="text-xl font-semibold">IIS Music Recommender</h1>

      <PlayerBar p={view} />

      {/* Stand-in for the Heard list (IIS-27): proves play(trackId) works for any track. */}
      <section className="mx-auto mt-10 max-w-xl">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Prototype stand-in: play any track</h2>
        <ul className="text-sm">
          {tracks.map((t) => (
            <li key={t.id}>
              <button className="w-full py-1 text-left hover:underline" onClick={() => playTrack(t.id)}>
                {t.title} · {artistNames(t)}
              </button>
            </li>
          ))}
        </ul>
        <button className="mt-3 text-xs underline" onClick={jumpNearEnd}>Jump to 3s before end</button>
      </section>
    </main>
  )
}
