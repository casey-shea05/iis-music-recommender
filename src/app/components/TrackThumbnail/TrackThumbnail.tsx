import { Music } from 'lucide-react'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { cn } from '@/shadcn/utils.ts'

/** A small square placeholder for a track, coloured from its id (the catalogue has no per-track artwork). */
export function TrackThumbnail({
  track,
  className,
  iconClassName,
}: {
  track: CatalogueTrack
  className?: string
  iconClassName?: string
}) {
  const hue = [...track.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360
  return (
    <div
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-md text-white/80', className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 50) % 360} 55% 30%))` }}
    >
      <Music className={cn('size-1/2', iconClassName)} />
    </div>
  )
}
