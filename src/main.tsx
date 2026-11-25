import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import catalogue from '../data/catalogue.json'
import App from './app/App.tsx'
import { PlaybackProvider } from './hooks/usePlayback.tsx'
import './index.css'
import type { Catalogue } from './recommender/catalogue.ts'
import { Toaster } from './shadcn/sonner.tsx'
import { scoringChooser } from './recommender/scoring.ts'

// The queue draws fresh tracks from the catalogue, highest score first.
const { tracks } = catalogue as Catalogue
const chooser = scoringChooser(catalogue as Catalogue)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlaybackProvider tracks={tracks} profile={(catalogue as Catalogue).profile} chooser={chooser}>
      <App />
      <Toaster position="top-right" />
    </PlaybackProvider>
  </StrictMode>,
)
