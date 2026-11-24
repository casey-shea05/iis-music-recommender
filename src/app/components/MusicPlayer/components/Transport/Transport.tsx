import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { Button } from '@/shadcn/button.tsx'

/** Previous, play/pause and next. */
export function Transport({ large = false }: { large?: boolean }) {
  const { status, nowPlaying, playing, hasPrevious, hasNext, togglePlay, previous, next } = usePlayback()
  const ready = status !== 'connecting'
  const skipSize = large ? 'icon-lg' : 'icon'

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size={skipSize} aria-label="Previous" disabled={!ready || !hasPrevious} onClick={previous}>
        <SkipBack />
      </Button>
      <Button
        size={skipSize}
        className={large ? 'size-14 rounded-full' : 'rounded-full'}
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={!ready || !nowPlaying}
        onClick={togglePlay}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button variant="ghost" size={skipSize} aria-label="Next" disabled={!ready || !hasNext} onClick={next}>
        <SkipForward />
      </Button>
    </div>
  )
}
