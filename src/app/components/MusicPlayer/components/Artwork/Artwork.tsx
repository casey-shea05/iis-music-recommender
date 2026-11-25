import { Music } from 'lucide-react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { cn } from '@/shadcn/utils.ts'
import { TrackThumbnail } from '../../../TrackThumbnail/TrackThumbnail.tsx'

/** Now playing's artwork from the engine, or a placeholder coloured from the track id. */
export function Artwork({ className }: { className?: string }) {
  const { nowPlaying, artworkUrl } = usePlayback()

  if (nowPlaying && artworkUrl) {
    return (
      <img
        src={artworkUrl}
        alt={`${nowPlaying.title} artwork`}
        className={cn('shrink-0 rounded-md object-cover', className)}
      />
    )
  }

  if (nowPlaying) {
    return (
      <TrackThumbnail
        track={nowPlaying}
        // The thumbnail defaults to a 40px square; h-auto lets the caller's aspect-square set the height from the width.
        className={cn('h-auto', className)}
        iconClassName="size-1/3"
      />
    )
  }

  return (
    <div aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-md text-white/80', className)} style={{ background: 'var(--muted)' }}>
      <Music className="size-1/3" />
    </div>
  )
}
