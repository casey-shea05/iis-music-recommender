import { describe, expect, it } from 'vitest'
import type { Adjustment } from './dislikes.ts'
import { createQueue } from './queue.ts'
import { score } from './scoring.ts'
import { isClosestFit, swap } from './swap.ts'
import { makeTrack } from '../testFixtures.tsx'

const profile = { tempo: 100, energy: 0.5, valence: 0.5, acousticness: 0.5 }
const faster: Adjustment[] = [{ feature: 'tempo', direction: 'higher', threshold: 100 }]
const rate = (t: Parameters<typeof score>[0], adj: readonly Adjustment[]) => score(t, profile, new Set(), adj)
const track = (id: string, tempo: number, isTopTrack = false) =>
  makeTrack({ id, isTopTrack, features: { ...profile, tempo } })

describe('swap', () => {
  const now = track('now', 120)
  const slow = track('slow', 80)
  const fine = track('fine', 130)
  const queue = { ...createQueue([now, slow, fine]), cursor: 0 }

  it('replaces a conflicting unheard track with a higher-scoring candidate', () => {
    const better = track('better', 105)
    const result = swap(queue, [], faster, () => false, [better], rate)
    expect(result.tracks.map((t) => t.id)).toEqual(['now', 'better', 'fine'])
  })

  it('skips top tracks, excluded tracks and queued tracks, and keeps the track if no candidate scores higher', () => {
    const candidates = [track('top', 105, true), track('blocked', 105), now]
    const result = swap(queue, [], faster, (t) => t.id === 'blocked', candidates, rate)
    expect(result).toEqual(queue)
  })

  it('leaves heard tracks alone', () => {
    const result = swap(queue, [slow], faster, () => false, [track('better', 105)], rate)
    expect(result.tracks).toEqual(queue.tracks)
  })
})

describe('isClosestFit', () => {
  it('is true only for an unheard Up next track that conflicts', () => {
    const slow = track('slow', 80)
    const queue = createQueue([track('now', 120), slow])
    expect(isClosestFit(queue, [], faster, slow)).toBe(true)
    expect(isClosestFit(queue, [slow], faster, slow)).toBe(false)
    expect(isClosestFit(queue, [], [], slow)).toBe(false)
  })
})
