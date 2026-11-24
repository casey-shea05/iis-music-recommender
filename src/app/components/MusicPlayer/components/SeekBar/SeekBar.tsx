import { useState } from 'react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { Slider } from '@/shadcn/slider.tsx'
import { formatTime } from '@/utils/format.ts'
import { firstValue } from '@/utils/slider.ts'

/**
 * Seek slider. `edge` is the minimised bar's version: no thumb and no timestamps, but still draggable.
 * Otherwise elapsed and total time sit either side.
 */
export function SeekBar({ edge = false }: { edge?: boolean }) {
  const { status, nowPlaying, positionMs, durationMs, seek } = usePlayback()
  // While dragging, show the thumb under the cursor instead of the ticking position.
  const [scrubMs, setScrubMs] = useState<number | null>(null)
  const shownMs = scrubMs ?? positionMs

  const slider = (
    <Slider
      value={[shownMs]}
      max={durationMs || 1}
      disabled={status === 'connecting' || !nowPlaying}
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
