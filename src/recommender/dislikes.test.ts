import { describe, expect, it } from 'vitest'
import { makeTrack } from '../testFixtures.tsx'
import { addDislike, blockArtist, effects, endSession, isExcluded, removeDislike, unblockArtist, type Dislike } from './dislikes.ts'

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

  const artist = { id: 'artist-1', name: 'Some Artist' }
  const blockedTrack = makeTrack({ id: 'b', artists: [artist] })

  it('adds a block for the primary artist, with the track that blocked them', () => {
    const once = blockArtist([], blockedTrack)
    expect(once).toEqual([{ ...artist, tracks: [{ id: 'b', title: blockedTrack.title }] }])
    expect(blockArtist(once, makeTrack({ id: 'b2', artists: [artist] }))[0].tracks).toHaveLength(2)
  })

  it('excludes disliked tracks and tracks crediting a blocked artist', () => {
    const blocked = blockArtist([], blockedTrack)
    const clean = makeTrack({ id: 'c', artists: [{ id: 'artist-2', name: 'Else' }] })
    expect(isExcluded(makeTrack({ id: 'o', artists: [artist] }), [], blocked)).toBe(true)
    expect(isExcluded(clean, [], blocked)).toBe(false)
    expect(isExcluded(clean, [{ track: clean, reasons: [] }], [])).toBe(true)
  })

  it('keeps the block when the dislike is removed or the session ends', () => {
    const blocked = blockArtist([], blockedTrack)
    const list = addDislike([], { track: blockedTrack, reasons: [{ kind: 'artist' }] })
    expect(removeDislike(list, 'b')).toEqual([])
    expect(endSession()).toEqual([])
    expect(isExcluded(makeTrack({ id: 'o', artists: [artist] }), removeDislike(list, 'b'), blocked)).toBe(true)
  })

  it('unblocks an artist and strips the artist reason from session dislikes', () => {
    const list: Dislike[] = [{ track: blockedTrack, reasons: [tooSlow, { kind: 'artist' }] }]
    const result = unblockArtist(blockArtist([], blockedTrack), list, 'artist-1')
    expect(result.blockedArtists).toEqual([])
    expect(result.dislikes).toEqual([{ track: blockedTrack, reasons: [tooSlow] }])
  })
})
