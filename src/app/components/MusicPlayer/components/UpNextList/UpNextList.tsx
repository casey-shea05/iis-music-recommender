import { useEffect } from 'react'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { TrackRow } from '../../../TrackRow/TrackRow.tsx'

const SHOWN = 5

/** The first few tracks after Now playing. */
export function UpNextList({ tracks, onSelect }: { tracks: readonly CatalogueTrack[]; onSelect: (track: CatalogueTrack) => void }) {
  // Fetch the images ahead of time (including the one that appears after the next skip), so none pop in late.
  useEffect(() => {
    for (const { imageUrl } of tracks.slice(0, SHOWN + 1)) {
      if (imageUrl) new Image().src = imageUrl
    }
  }, [tracks])

  return (
    <section aria-labelledby="up-next-heading">
      <h2 id="up-next-heading" className="mb-2 text-sm font-semibold">
        Up next
      </h2>
      <ul>
        {tracks.slice(0, SHOWN).map((track) => (
          <TrackRow key={track.id} track={track} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  )
}
