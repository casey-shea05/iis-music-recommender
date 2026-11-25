import { useState } from 'react'
import { usePlayback } from '@/hooks/usePlayback.tsx'
import type { Direction, Reason } from '@/recommender/dislikes.ts'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import type { FeatureName } from '@/recommender/scoring.ts'
import { Button } from '@/shadcn/button.tsx'
import { cn } from '@/shadcn/utils.ts'
import { REASON_CHIPS } from '@/utils/reasonChips.ts'

type Props = {
  track: CatalogueTrack | null
  /** Called on Submit with the picked chips (none is allowed) and the typed text. */
  onSubmit: (reasons: Reason[], text: string) => void
}

/** Dislike a track with reasons. Nothing is recorded until Submit. */
export function ReasonPanel({ track, onSubmit }: Props) {
  // Remount on a new Now playing, so the panel starts clean (no effect needed to reset it).
  return <PanelBody key={track?.id ?? 'none'} track={track} onSubmit={onSubmit} />
}

function PanelBody({ track, onSubmit }: Props) {
  const { nowPlaying } = usePlayback()
  const [picked, setPicked] = useState<Partial<Record<FeatureName, Direction>>>({})
  const [artist, setArtist] = useState(false)
  const [text, setText] = useState('')
  const disabled = !track || !nowPlaying

  function toggle(feature: FeatureName, direction: Direction) {
    setPicked((p) => {
      const { [feature]: current, ...rest } = p
      return current === direction ? rest : { ...rest, [feature]: direction }
    })
  }

  function submit() {
    const reasons: Reason[] = REASON_CHIPS.flatMap(({ feature }) => {
      const direction = picked[feature]
      return direction ? [{ kind: 'feature' as const, feature, direction }] : []
    })
    if (artist) reasons.push({ kind: 'artist' })
    onSubmit(reasons, text)
    setPicked({})
    setArtist(false)
    setText('')
  }

  return (
    <section aria-labelledby="reason-heading" className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <h2 id="reason-heading" className="text-sm font-semibold">
        Not feeling this one?
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {REASON_CHIPS.map(({ feature, name, sides }) => (
          // One joined control per feature: the two sides sit together, so picking one reads as leaving the other.
          <div key={feature} role="group" aria-label={name} className="grid grid-cols-2 gap-0.5 rounded-lg border bg-muted/40 p-0.5">
            {sides.map(({ label, direction }) => (
              <Chip key={label} pressed={picked[feature] === direction} disabled={disabled} onClick={() => toggle(feature, direction)}>
                {label}
              </Chip>
            ))}
          </div>
        ))}
        <Chip className="col-span-2 border-border" outlined pressed={artist} disabled={disabled} onClick={() => setArtist((a) => !a)}>
          Not a fan of this artist
        </Chip>
      </div>
      <textarea
        aria-label="Your own reason"
        placeholder="Or say it in your own words"
        rows={2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      />
      <Button disabled={disabled} onClick={submit}>
        Submit
      </Button>
    </section>
  )
}

function Chip({ pressed, outlined, className, ...props }: { pressed: boolean; outlined?: boolean } & React.ComponentProps<typeof Button>) {
  const idle = outlined ? 'outline' : 'ghost'
  return <Button variant={pressed ? 'default' : idle} size="lg" aria-pressed={pressed} className={cn('px-1 transition-none', className)} {...props} />
}
