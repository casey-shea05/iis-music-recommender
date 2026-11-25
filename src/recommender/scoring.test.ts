import { describe, expect, it } from 'vitest'
import { distance, similarity } from './scoring.ts'

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
})
