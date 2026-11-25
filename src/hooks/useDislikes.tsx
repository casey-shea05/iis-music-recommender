// The user's Dislikes and Blocked artists for the whole app. DislikesProvider owns both. Dislikes last until the
// session ends; only the blocked artists are saved to localStorage, so they come back after a reload.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addDislike,
  blockArtist,
  endSession,
  isExcluded,
  removeDislike,
  unblockArtist,
  type BlockedArtist,
  type Dislike,
} from '@/recommender/dislikes.ts'
import type { CatalogueTrack } from '@/recommender/catalogue.ts'

export const BLOCKED_ARTISTS_STORAGE_KEY = 'blockedArtists'

export type Dislikes = {
  dislikes: readonly Dislike[]
  blockedArtists: readonly BlockedArtist[]
  /** The current lists, read when called. Stable, so a chooser can hold them without being rebuilt. */
  getDislikes(): readonly Dislike[]
  getBlockedArtists(): readonly BlockedArtist[]
  /** True for a disliked track or one crediting a blocked artist. Stable, reads the current lists. */
  isExcluded(track: CatalogueTrack): boolean
  /** Records the dislike; one with the artist reason also blocks the track's primary artist. */
  add(dislike: Dislike): void
  /** Removes a dislike. Never unblocks an artist. */
  remove(trackId: string): void
  unblock(artistId: string): void
  /** Ends the session: clears all dislikes and keeps blocks. Call before starting a new queue. */
  endSession(): void
}

const DislikesContext = createContext<Dislikes | null>(null)

function load(): BlockedArtist[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BLOCKED_ARTISTS_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(saved)) return []
    // Drop anything that isn't a block in the current shape, so stale data can't break exclusion.
    return saved.filter((b): b is BlockedArtist => typeof b?.id === 'string' && typeof b?.name === 'string' && Array.isArray(b?.tracks))
  } catch {
    return []
  }
}

function save(blocked: BlockedArtist[]) {
  try {
    localStorage.setItem(BLOCKED_ARTISTS_STORAGE_KEY, JSON.stringify(blocked))
  } catch {
    // Storage can be blocked or full; the blocks still work for this page load.
  }
}

type State = { dislikes: Dislike[]; blockedArtists: BlockedArtist[] }

export function DislikesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ dislikes: [], blockedArtists: load() }))
  // Updated synchronously, so a read straight after a change (the chooser topping up) sees it.
  const ref = useRef(state)

  const update = useCallback((change: (s: State) => State) => {
    const before = ref.current
    ref.current = change(before)
    setState(ref.current)
    if (ref.current.blockedArtists !== before.blockedArtists) save(ref.current.blockedArtists)
  }, [])

  const value = useMemo<Dislikes>(
    () => ({
      ...state,
      getDislikes: () => ref.current.dislikes,
      getBlockedArtists: () => ref.current.blockedArtists,
      isExcluded: (track) => isExcluded(track, ref.current.dislikes, ref.current.blockedArtists),
      add: (dislike) =>
        update((s) => ({
          dislikes: addDislike(s.dislikes, dislike),
          blockedArtists: dislike.reasons.some((r) => r.kind === 'artist') ? blockArtist(s.blockedArtists, dislike.track) : s.blockedArtists,
        })),
      remove: (trackId) => update((s) => ({ ...s, dislikes: removeDislike(s.dislikes, trackId) })),
      unblock: (artistId) =>
        update((s) => {
          const next = unblockArtist(s.blockedArtists, s.dislikes, artistId)
          return { dislikes: next.dislikes, blockedArtists: next.blockedArtists }
        }),
      endSession: () => update((s) => ({ ...s, dislikes: endSession() })),
    }),
    [state, update],
  )
  return <DislikesContext.Provider value={value}>{children}</DislikesContext.Provider>
}

// The provider and its hook belong together (ADR-0001 layout); fast refresh falls back to a full reload here.
// eslint-disable-next-line react-refresh/only-export-components
export function useDislikes(): Dislikes {
  const dislikes = useContext(DislikesContext)
  if (!dislikes) throw new Error('useDislikes() must be used inside <DislikesProvider>')
  return dislikes
}
