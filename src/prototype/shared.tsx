import { Music } from 'lucide-react'
import type { CatalogueTrack } from '../domain/catalogue.ts'

/** Placeholder artwork: colour derived from the track id. */
export function Artwork({ track, className = '' }: { track: CatalogueTrack | null; className?: string }) {
  const hue = track ? [...track.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 0
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md text-white/80 ${className}`}
      style={{ background: track ? `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 50) % 360} 55% 30%))` : '#888' }}
    >
      <Music className="size-1/3" />
    </div>
  )
}
