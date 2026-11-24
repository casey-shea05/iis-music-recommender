import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { cn } from '@/shadcn/utils.ts'
import { artistNames, formatTime } from '@/utils/format.ts'
import { TrackThumbnail } from '../TrackThumbnail/TrackThumbnail.tsx'

/** One clickable track in a list: title, artists and duration. `large` is for lists with room to spare. */
export function TrackRow({
  track,
  onSelect,
  large = false,
}: {
  track: CatalogueTrack
  onSelect: (track: CatalogueTrack) => void
  large?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(track)}
        className={cn(
          'flex w-full items-center rounded-md text-left hover:bg-muted',
          large ? 'gap-4 px-4 py-3' : 'gap-3 px-3 py-2',
        )}
      >
        <TrackThumbnail track={track} className={large ? 'size-16' : undefined} />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate font-medium', large ? 'text-base' : 'text-sm')}>{track.title}</span>
          <span className={cn('block truncate text-muted-foreground', large ? 'text-sm' : 'text-xs')}>
            {artistNames(track.artists)}
          </span>
        </span>
        <span className={cn('text-muted-foreground tabular-nums', large ? 'text-sm' : 'text-xs')}>
          {formatTime(track.durationMs)}
        </span>
      </button>
    </li>
  )
}
