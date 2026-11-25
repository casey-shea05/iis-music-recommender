import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import catalogue from '../data/catalogue.json'
import App from './app/App.tsx'
import { DislikesProvider, useDislikes } from './hooks/useDislikes.tsx'
import { PlaybackProvider } from './hooks/usePlayback.tsx'
import './index.css'
import type { Catalogue } from './recommender/catalogue.ts'
import { Toaster } from './shadcn/sonner.tsx'
import { scoringChooser } from './recommender/scoring.ts'
import { useMemo } from 'react'

// The queue draws fresh tracks from the catalogue, highest score first, skipping disliked tracks and blocked artists.
const { tracks } = catalogue as Catalogue

// main.tsx only renders; the component sits here because it needs the catalogue, which only this file imports.
// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const { getDislikes } = useDislikes()
  const chooser = useMemo(() => scoringChooser(catalogue as Catalogue, getDislikes), [getDislikes])
  return (
    <PlaybackProvider tracks={tracks} profile={(catalogue as Catalogue).profile} chooser={chooser}>
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
