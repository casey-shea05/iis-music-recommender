import { usePlayback } from '@/hooks/usePlayback.tsx'
import { cn } from '@/shadcn/utils.ts'
import { artistNames } from '@/utils/format.ts'

/** Title and artists of Now playing. */
export function TrackInfo({ large = false, className }: { large?: boolean; className?: string }) {
  const { nowPlaying } = usePlayback()
  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('truncate font-medium', large ? 'text-xl font-semibold' : 'text-sm')}>
        {nowPlaying?.title ?? 'Nothing playing'}
      </p>
      <p className={cn('truncate text-muted-foreground', large ? 'text-base' : 'text-xs')}>
        {nowPlaying ? artistNames(nowPlaying.artists) : '—'}
      </p>
    </div>
  )
}
