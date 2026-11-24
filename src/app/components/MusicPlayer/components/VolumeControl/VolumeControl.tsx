import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { Button } from '@/shadcn/button.tsx'
import { Slider } from '@/shadcn/slider.tsx'
import { cn } from '@/shadcn/utils.ts'
import { firstValue } from '@/utils/slider.ts'
import type { PlayerVariant } from '../../variant.ts'

/** Mute button and volume slider. Mute memory lives in the provider, so it survives switching views. */
export function VolumeControl({ variant = 'bar', className }: { variant?: PlayerVariant; className?: string }) {
  const widthClass = variant === 'expanded' ? 'w-64' : 'w-28'
  const { volume, muted, setVolume, toggleMute } = usePlayback()
  const Icon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="ghost" size="icon" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
        <Icon />
      </Button>
      {/* The wrapper sets the width: the Slider root is w-full, so it collapses without a sized parent. */}
      <div className={widthClass}>
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(v) => setVolume(firstValue(v))}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}
