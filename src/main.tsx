import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import catalogue from '../data/catalogue.json'
import App from './app/App.tsx'
import { PlaybackProvider } from './hooks/usePlayback.tsx'
import './index.css'
import type { Catalogue } from './recommender/catalogue.ts'

// The queue draws fresh tracks from the catalogue in file order (IIS-27 adds the recommender).
const { tracks } = catalogue as Catalogue

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlaybackProvider tracks={tracks}>
      <App />
    </PlaybackProvider>
  </StrictMode>,
)
