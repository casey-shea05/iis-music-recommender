import { Music } from 'lucide-react'
import { useState } from 'react'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { cn } from '@/shadcn/utils.ts'

/**
 * A small square for a track: its catalogue image, or a placeholder coloured from its id when it has none
 * or the image fails to load. `imageUrl` overrides the track's own, for callers with a better source.
 */
export function TrackThumbnail({
  track,
  imageUrl = track.imageUrl,
  alt = '',
  className,
  iconClassName,
}: {
  track: CatalogueTrack
  imageUrl?: string | null
  alt?: string
  className?: string
  iconClassName?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (imageUrl && imageUrl !== failedUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        onError={() => setFailedUrl(imageUrl)}
        className={cn('size-10 shrink-0 rounded-md object-cover', className)}
      />
    )
  }

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
