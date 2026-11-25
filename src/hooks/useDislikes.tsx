// The user's Dislikes for the whole app. DislikesProvider owns the list; only Dislikes that block an artist are
// saved to localStorage, so they come back after a reload. Everything else lasts until the session ends.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDislike, endSession, removeDislike, type Dislike } from '@/recommender/dislikes.ts'

export const DISLIKES_STORAGE_KEY = 'dislikes'

export type Dislikes = {
  dislikes: readonly Dislike[]
  /** The current list, read when called. Stable, so a chooser can hold it without being rebuilt. */
  getDislikes(): readonly Dislike[]
  add(dislike: Dislike): void
  remove(trackId: string): void
  /** Ends the session: keeps only artist blocks. Call before starting a new queue. */
  endSession(): void
}

const DislikesContext = createContext<Dislikes | null>(null)

function load(): Dislike[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(DISLIKES_STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? endSession(saved as Dislike[]) : []
  } catch {
    return []
  }
}

function save(dislikes: Dislike[]) {
  try {
    localStorage.setItem(DISLIKES_STORAGE_KEY, JSON.stringify(endSession(dislikes)))
  } catch {
    // Storage can be blocked or full; the dislikes still work for this page load.
  }
}

export function DislikesProvider({ children }: { children: ReactNode }) {
  const [dislikes, setDislikes] = useState<Dislike[]>(load)
  // Updated synchronously, so a read straight after a change (the chooser topping up) sees it.
  const ref = useRef(dislikes)

  const update = useCallback((change: (list: Dislike[]) => Dislike[]) => {
    ref.current = change(ref.current)
    setDislikes(ref.current)
    save(ref.current)
  }, [])

  const value = useMemo<Dislikes>(
    () => ({
      dislikes,
      getDislikes: () => ref.current,
      add: (dislike) => update((list) => addDislike(list, dislike)),
      remove: (trackId) => update((list) => removeDislike(list, trackId)),
      endSession: () => update(endSession),
    }),
    [dislikes, update],
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
