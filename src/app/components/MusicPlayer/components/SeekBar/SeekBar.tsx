import { useState } from 'react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { Slider } from '@/shadcn/slider.tsx'
import { formatTime } from '@/utils/format.ts'
import { firstValue } from '@/utils/slider.ts'
import type { PlayerVariant } from '../../variant.ts'

/**
 * Seek slider. In the bar it runs along the top edge: no thumb and no timestamps, but still draggable.
 * Expanded, elapsed and total time sit either side.
 */
export function SeekBar({ variant = 'bar' }: { variant?: PlayerVariant }) {
  const { ready, nowPlaying, positionMs, durationMs, seek } = usePlayback()
  const edge = variant === 'bar'
  // While dragging, show the thumb under the cursor instead of the ticking position.
  const [scrubMs, setScrubMs] = useState<number | null>(null)
  const shownMs = scrubMs ?? positionMs

  const slider = (
    <Slider
      value={[shownMs]}
      max={durationMs || 1}
      disabled={!ready || !nowPlaying}
      onValueChange={(v) => setScrubMs(firstValue(v))}
      onValueCommitted={(v) => {
        seek(firstValue(v))
        setScrubMs(null)
      }}
      aria-label="Seek"
      className={edge ? '[&_[data-slot=slider-thumb]]:opacity-0' : undefined}
    />
  )
  if (edge) return slider

  return (
    <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
      <span className="w-9 text-right tabular-nums">{formatTime(shownMs)}</span>
      {slider}
      <span className="w-9 tabular-nums">{formatTime(durationMs)}</span>
    </div>
  )
}
