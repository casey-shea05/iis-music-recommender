// Chosen variant (was A): persistent bottom bar that expands to a full-screen view.
// Both views read the same PlayerView, so the expanded view is where IIS-27 content can live.
import { ChevronDown, Maximize2, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { artistNames, fmt } from './format.ts'
import { Artwork } from './shared.tsx'
import type { PlayerView } from './usePrototypePlayer.ts'

const one = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0])

function Seek({ p, edge = false }: { p: PlayerView; edge?: boolean }) {
  // While dragging, show the thumb under the cursor instead of the ticking position.
  const [scrubMs, setScrubMs] = useState<number | null>(null)
  const shown = scrubMs ?? p.positionMs
  const slider = (
    <Slider
      value={[shown]}
      max={p.durationMs || 1}
      disabled={!p.track}
      onValueChange={(v) => setScrubMs(one(v))}
      onValueCommitted={(v) => {
        p.seek(one(v))
        setScrubMs(null)
      }}
      aria-label="Seek"
      className={edge ? '[&_[data-slot=slider-thumb]]:opacity-0' : undefined}
    />
  )
  if (edge) return slider
  return (
    <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
      <span className="w-9 text-right tabular-nums">{fmt(shown)}</span>
      {slider}
      <span className="w-9 tabular-nums">{fmt(p.durationMs)}</span>
    </div>
  )
}

function Transport({ p, large = false }: { p: PlayerView; large?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size={large ? 'icon-lg' : 'icon'} aria-label="Previous" disabled={!p.hasPrevious} onClick={p.previous}><SkipBack /></Button>
      <Button size={large ? 'icon-lg' : 'icon'} className={large ? 'size-14 rounded-full' : 'rounded-full'} aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.togglePlay}>
        {p.playing ? <Pause /> : <Play />}
      </Button>
      <Button variant="ghost" size={large ? 'icon-lg' : 'icon'} aria-label="Next" disabled={!p.hasNext} onClick={p.next}><SkipForward /></Button>
    </div>
  )
}

function Volume({ p, widthClass = 'w-28', className = '' }: { p: PlayerView; widthClass?: string; className?: string }) {
  const Icon = p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button variant="ghost" size="icon" aria-label={p.volume === 0 ? 'Unmute' : 'Mute'} onClick={p.toggleMute}><Icon /></Button>
      {/* Wrapper sets the width: the Slider root is w-full, so it collapses without a sized parent. */}
      <div className={widthClass}>
        <Slider value={[p.volume]} min={0} max={1} step={0.01} onValueChange={(v) => p.setVolume(one(v))} aria-label="Volume" />
      </div>
    </div>
  )
}

export function PlayerBar({ p }: { p: PlayerView }) {
  const [expanded, setExpanded] = useState(false)

  if (expanded) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" aria-label="Collapse player" onClick={() => setExpanded(false)}><ChevronDown /></Button>
          <span className="text-sm text-muted-foreground">Now playing</span>
          <div className="size-9" />
        </div>
        <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 p-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-6">
            <Artwork track={p.track} className="aspect-square w-full max-w-sm rounded-xl" />
            <div className="w-full max-w-sm text-center">
              <p className="text-xl font-semibold">{p.track?.title ?? 'Nothing playing'}</p>
              <p className="text-muted-foreground">{p.track ? artistNames(p.track) : '—'}</p>
            </div>
            <div className="w-full max-w-sm"><Seek p={p} /></div>
            <Transport p={p} large />
            <Volume p={p} widthClass="w-64" />
          </div>
          {/* Room for IIS-27: explanation, dislike + reasons, Up next, Heard, Active reasons. */}
          <div className="flex items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            IIS-27 content goes here: explanation, dislike and reasons, Up next, Heard, Active reasons.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t bg-background px-4 py-3">
      {/* Seek runs along the top edge of the bar, thumb straddling the border. */}
      <div className="absolute inset-x-0 top-0 -translate-y-1/2">
        <Seek p={p} edge />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <Artwork track={p.track} className="size-14" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{p.track?.title ?? 'Nothing playing'}</p>
          <p className="truncate text-xs text-muted-foreground">{p.track ? artistNames(p.track) : '—'}</p>
        </div>
      </div>
      <Transport p={p} />
      <div className="flex items-center justify-end gap-1">
        <Volume p={p} />
        <Button variant="ghost" size="icon" aria-label="Expand player" onClick={() => setExpanded(true)}><Maximize2 /></Button>
      </div>
    </div>
  )
}
