import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import catalogue from '../data/catalogue.json'
import App from './app/App.tsx'
import { DislikesProvider, useDislikes } from './hooks/useDislikes.tsx'
import { PlaybackProvider } from './hooks/usePlayback.tsx'
import './index.css'
import type { Queue } from './recommender/queue.ts'
import type { Catalogue, CatalogueTrack } from './recommender/catalogue.ts'
import { Toaster } from './shadcn/sonner.tsx'
import { effects, isExcluded } from './recommender/dislikes.ts'
import { score, scoringChooser, tasteProfile } from './recommender/scoring.ts'
import { swap } from './recommender/swap.ts'
import { useMemo } from 'react'

// The queue draws fresh tracks from the catalogue, highest score first, skipping disliked tracks and blocked artists.
const { tracks } = catalogue as Catalogue

// main.tsx only renders; the component sits here because it needs the catalogue, which only this file imports.
// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const { getDislikes } = useDislikes()
  const chooser = useMemo(() => scoringChooser(catalogue as Catalogue, getDislikes), [getDislikes])
  // The swap rule bound to the catalogue, so a dislike replaces conflicting unheard Up next tracks.
  const steer = useMemo(() => {
    const profile = tasteProfile(catalogue as Catalogue)
    const topArtistIds = new Set((catalogue as Catalogue).profile.topArtists.map((a) => a.id))
    return (queue: Queue<CatalogueTrack>, heard: readonly CatalogueTrack[]) => {
      const dislikes = getDislikes()
      return swap(
        queue,
        heard,
        effects([...dislikes]),
        (t) => isExcluded(t, dislikes),
        tracks,
        (t, adjustments) => score(t, profile, topArtistIds, adjustments),
      )
    }
  }, [getDislikes])
  return (
    <PlaybackProvider tracks={tracks} profile={(catalogue as Catalogue).profile} chooser={chooser} steer={steer}>
      <App />
      <Toaster position="top-right" />
    </PlaybackProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DislikesProvider>
      <Root />
    </DislikesProvider>
  </StrictMode>,
)
