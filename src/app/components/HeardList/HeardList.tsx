import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { cn } from '@/shadcn/utils.ts'
import { TrackRow } from '../TrackRow/TrackRow.tsx'

/** Tracks already played this session, in the order they were heard. Fills its parent and scrolls when long. */
export function HeardList({ tracks, onSelect }: { tracks: CatalogueTrack[]; onSelect: (track: CatalogueTrack) => void }) {
  const empty = tracks.length === 0
  return (
    <section
      aria-label="Heard"
      className={cn(
        'h-full overflow-y-auto rounded-xl',
        empty ? 'flex items-center justify-center border-2 border-dashed border-muted-foreground/30 p-6' : 'border p-2',
      )}
    >
      {empty ? (
        <p className="text-center text-sm text-muted-foreground">You haven't heard any recommended tracks yet.</p>
      ) : (
        <ul>
          {tracks.map((track, i) => (
            <TrackRow key={`${track.id}-${i}`} track={track} onSelect={onSelect} large />
          ))}
        </ul>
      )}
    </section>
  )
}
