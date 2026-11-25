import { describe, expect, it } from 'vitest'
import { makeTrack } from '../testFixtures.tsx'
import { addDislike, effects, isExcluded, removeDislike, type Dislike } from './dislikes.ts'

describe('dislikes', () => {
  const slow = makeTrack({ id: 's', features: { tempo: 85, energy: 0.5, valence: 0.5, acousticness: 0.5 } })
  const slower = makeTrack({ id: 't', features: { tempo: 70, energy: 0.2, valence: 0.5, acousticness: 0.5 } })
  const tooSlow = { kind: 'feature', feature: 'tempo', direction: 'higher' } as const
  const tooCalm = { kind: 'feature', feature: 'energy', direction: 'higher' } as const

  it('derives adjustments from the list: latest reason per feature wins, features combine', () => {
    const list: Dislike[] = [
      { track: slow, reasons: [tooSlow] },
      { track: slower, reasons: [tooSlow, tooCalm] },
    ]
    expect(effects(list)).toEqual([
      { feature: 'tempo', direction: 'higher', threshold: 70 },
      { feature: 'energy', direction: 'higher', threshold: 0.2 },
    ])
  })

  it('excludes disliked tracks and a blocked artist, until the dislike is removed', () => {
    const other = makeTrack({ id: 'o', artists: [{ id: 'artist-1', name: 'Some Artist' }] })
    const clean = makeTrack({ id: 'c', artists: [{ id: 'artist-2', name: 'Else' }] })
    const list = addDislike([], { track: slow, reasons: [{ kind: 'artist' }] })
    expect(isExcluded(slow, list)).toBe(true)
    expect(isExcluded(other, list)).toBe(true)
    expect(isExcluded(clean, list)).toBe(false)
    expect(isExcluded(other, removeDislike(list, 's'))).toBe(false)
  })
})
