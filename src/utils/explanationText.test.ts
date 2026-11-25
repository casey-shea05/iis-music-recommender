import { describe, expect, it } from 'vitest'
import { explanationText } from './explanationText.ts'

const topArtists = [{ id: 'a1', name: 'Artist X' }]

describe('explanationText', () => {
  it('names the anchor artist and the closest features with user-facing names', () => {
    expect(explanationText({ anchorArtistId: 'a1', features: ['tempo', 'valence'] }, topArtists)).toEqual({
      short: 'Because you listen to Artist X',
      full: 'Because you listen to Artist X. Closest to your taste in tempo and mood',
    })
  })

  it('uses intensity and acoustic for energy and acousticness', () => {
    const { full } = explanationText({ anchorArtistId: 'a1', features: ['energy', 'acousticness'] }, topArtists)
    expect(full).toContain('intensity and acoustic')
  })

  it('cites only the features when the anchor artist is not a top artist', () => {
    const text = 'Closest to your taste in tempo'
    expect(explanationText({ anchorArtistId: 'zz', features: ['tempo'] }, topArtists)).toEqual({ short: text, full: text })
  })
})
