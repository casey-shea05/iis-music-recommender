// The player: a persistent bottom bar that expands to a full-screen Now playing view.
// Both views read the same playback state, so nothing is lost when switching between them.
import { ChevronDown, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shadcn/button.tsx'
import { UpNextList } from './components/UpNextList/UpNextList.tsx'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import { Artwork } from './components/Artwork/Artwork.tsx'
import { ExplanationText } from './components/ExplanationText/ExplanationText.tsx'
import { SeekBar } from './components/SeekBar/SeekBar.tsx'
import { TrackInfo } from './components/TrackInfo/TrackInfo.tsx'
import { Transport } from './components/Transport/Transport.tsx'
import { VolumeControl } from './components/VolumeControl/VolumeControl.tsx'

export function MusicPlayer() {
  const [expanded, setExpanded] = useState(false)
  const { upNext, playTrack } = usePlayback()

  if (expanded) {
    return (
      <div
        role="dialog"
        aria-modal
        aria-label="Now playing"
        className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" aria-label="Collapse player" onClick={() => setExpanded(false)}>
            <ChevronDown />
          </Button>
          <span className="text-sm text-muted-foreground">Now playing</span>
          <div className="size-9" />
        </div>
        <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 p-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-6">
            <Artwork className="aspect-square w-full max-w-sm rounded-xl" />
            <TrackInfo variant="expanded" className="w-full max-w-sm text-center" />
            <div className="w-full max-w-sm">
              <SeekBar variant="expanded" />
            </div>
            <Transport variant="expanded" />
            <VolumeControl variant="expanded" />
          </div>
          {/* Right half: Up next on top; the lower quarter is left for IIS-28's dislike, reasons and Active reasons (Heard now lives on the main page). */}
          <div className="flex flex-col gap-6">
            <UpNextList tracks={upNext} onSelect={playTrack} />
          </div>
        </div>
        <ExplanationText variant="expanded" />
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 border-t bg-background">
      {/* Seek runs along the top edge of the bar. */}
      <div className="absolute inset-x-0 top-0 -translate-y-1/2">
        <SeekBar variant="bar" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Artwork className="size-14" />
          <TrackInfo />
        </div>
        <Transport />
        <div className="flex items-center justify-end gap-1">
          <VolumeControl />
          <Button variant="ghost" size="icon" aria-label="Expand player" onClick={() => setExpanded(true)}>
            <Maximize2 />
          </Button>
        </div>
      </div>
      <ExplanationText />
    </div>
  )
}
