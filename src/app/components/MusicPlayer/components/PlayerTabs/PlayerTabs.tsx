import { useState } from 'react'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'
import { useDislikes } from '@/hooks/useDislikes.tsx'
import { listedDislikes, type Reason } from '@/recommender/dislikes.ts'
import { cn } from '@/shadcn/utils.ts'
import { ReasonPanel } from '../ReasonPanel/ReasonPanel.tsx'
import { BlockedArtistsList } from './components/BlockedArtistsList/BlockedArtistsList.tsx'
import { DislikesList } from './components/DislikesList/DislikesList.tsx'

type Tab = 'reason' | 'dislikes' | 'blocked'

type Props = {
  track: CatalogueTrack | null
  onSubmit: (reasons: Reason[], text: string) => void
}

/**
 * Reason, Dislikes and Blocked artists share one space. It opens on Reason and returns there when Now playing
 * changes (which includes a dislike, since that moves the queue on).
 */
export function PlayerTabs({ track, onSubmit }: Props) {
  // Remount on a new Now playing, so the tab resets without an effect.
  return <TabsBody key={track?.id ?? 'none'} track={track} onSubmit={onSubmit} />
}

function TabsBody({ track, onSubmit }: Props) {
  const { dislikes, blockedArtists } = useDislikes()
  const [chosen, setChosen] = useState<Tab>('reason')
  // An empty tab can't be opened, but one already open stays open when its last row is removed, so edits can be batched.
  const empty: Record<Tab, boolean> = { reason: false, dislikes: listedDislikes(dislikes).length === 0, blocked: blockedArtists.length === 0 }
  const tabs: { id: Tab; label: string; disabled: boolean }[] = [
    { id: 'reason', label: 'Reason', disabled: false },
    { id: 'dislikes', label: 'Dislikes', disabled: empty.dislikes && chosen !== 'dislikes' },
    { id: 'blocked', label: 'Blocked artists', disabled: empty.blocked && chosen !== 'blocked' },
  ]
  const active = chosen

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div role="tablist" className="grid shrink-0 grid-cols-3 gap-0.5 rounded-lg border bg-muted/40 p-0.5">
        {tabs.map(({ id, label, disabled }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={active === id}
            aria-controls="player-tabpanel"
            disabled={disabled}
            onClick={() => setChosen(id)}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm font-medium disabled:opacity-40',
              active === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="player-tabpanel" aria-labelledby={`tab-${active}`} className="min-h-0 overflow-y-auto">
        {/* Kept mounted, so chips picked on Reason survive a look at another tab. */}
        <div hidden={active !== 'reason'}>
          <ReasonPanel track={track} onSubmit={onSubmit} />
        </div>
        {active === 'dislikes' && <DislikesList />}
        {active === 'blocked' && <BlockedArtistsList />}
      </div>
    </div>
  )
}
