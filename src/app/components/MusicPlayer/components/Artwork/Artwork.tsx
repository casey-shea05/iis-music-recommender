import { Music } from 'lucide-react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { cn } from '@/shadcn/utils.ts'

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

  const hue = nowPlaying ? [...nowPlaying.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360 : 0
  return (
    <div
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-md text-white/80', className)}
      style={{
        background: nowPlaying
          ? `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 50) % 360} 55% 30%))`
          : 'var(--muted)',
      }}
    >
      <Music className="size-1/3" />
    </div>
  )
}
