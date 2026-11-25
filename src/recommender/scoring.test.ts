import { describe, expect, it } from 'vitest'
import { makeTrack } from '@/testFixtures.tsx'
import { distance, explain, score, scoringChooser, similarity } from './scoring.ts'

describe('scoring', () => {
  it('divides tempo by 100 bpm and caps each distance at 1', () => {
    expect(distance('tempo', 90, 120)).toBeCloseTo(0.3)
    expect(distance('tempo', 60, 200)).toBe(1)
    expect(distance('energy', 0.2, 0.7)).toBeCloseTo(0.5)
  })

  it('is 1 for identical features and falls with the mean capped distance', () => {
    const profile = { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 }
    expect(similarity(profile, profile)).toBe(1)
    expect(similarity({ tempo: 220, energy: 0.5, valence: 0.5, acousticness: 0.5 }, profile)).toBeCloseTo(0.75)
  })

  it('explains a track with its anchor artist and the two features closest to the profile', () => {
    const profile = { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 }
    const features = { tempo: 180, energy: 0.55, valence: 0.9, acousticness: 0.5 }
    expect(explain({ anchorArtistId: 'a1', features }, profile)).toEqual({
      anchorArtistId: 'a1',
      features: ['acousticness', 'energy'],
    })
  })

  it('adds the top-artist bonus and subtracts a flat plus distance penalty per conflict', () => {
    const profile = { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 }
    const track = makeTrack({ id: 't', features: profile })
    const top = new Set([track.artists[0].id])
    expect(score(track, profile, top)).toBeCloseTo(1.1)
    // "faster than 140": the track at 120 is 0.2 past the threshold -> 0.1 + 0.2
    expect(score(track, profile, new Set(), [{ feature: 'tempo', direction: 'higher', threshold: 140 }])).toBeCloseTo(0.7)
  })

  it('chooses the best fresh tracks, skipping top tracks, queued and excluded ones', () => {
    const profile = { tempo: 120, energy: 0.5, valence: 0.5, acousticness: 0.5 }
    const near = makeTrack({ id: 'near', features: profile })
    const far = makeTrack({ id: 'far', features: { ...profile, energy: 0 } })
    const top = makeTrack({ id: 'top', isTopTrack: true, features: profile })
    const catalogue = { profile: { features: profile, topArtists: [] }, tracks: [far, top, near] }
    expect(scoringChooser(catalogue)([], 5).map((t) => t.id)).toEqual(['near', 'far'])
    expect(scoringChooser(catalogue, () => [{ track: near, reasons: [] }])([], 5).map((t) => t.id)).toEqual(['far'])
  })
})
