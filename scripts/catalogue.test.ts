// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Features } from '../src/recommender/catalogue.ts'
import {
  buildCatalogue,
  matchReccoTrack,
  spotifyIdFromHref,
  type ReccoCandidate,
  type SpotifyTrack,
} from './catalogue.ts'

const f = (tempo: number, energy = 0.5, valence = 0.5, acousticness = 0.5): Features => ({
  tempo,
  energy,
  valence,
  acousticness,
})

const track = (id: string, artistId: string, artistName = artistId): SpotifyTrack => ({
  id,
  title: `Track ${id}`,
  artists: [{ id: artistId, name: artistName }],
  durationMs: 200_000,
})

const generatedAt = '2026-11-24T00:00:00.000Z'

describe('spotifyIdFromHref', () => {
  it('extracts the ID from a Spotify track URL', () => {
    expect(spotifyIdFromHref('https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3')).toBe(
      '7qiZfU4dY1lWllzX7mPBI3',
    )
  })

  it('returns undefined for anything else', () => {
    expect(spotifyIdFromHref('https://open.spotify.com/artist/abc')).toBeUndefined()
    expect(spotifyIdFromHref('nonsense')).toBeUndefined()
  })
})

describe('buildCatalogue', () => {
  const topArtists = [
    { id: 'A1', name: 'Artist One' },
    { id: 'A2', name: 'Artist Two' },
  ]

  it('averages the top tracks’ features into the taste profile', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1'), track('t2', 'A2')],
      topArtists,
      recommendations: [],
      features: { t1: f(100, 0.2, 0.4, 0.6), t2: f(140, 0.6, 0.8, 0.2) },
      generatedAt,
    })
    const { tempo, energy, valence, acousticness } = catalogue.profile.features
    expect(tempo).toBeCloseTo(120)
    expect(energy).toBeCloseTo(0.4)
    expect(valence).toBeCloseTo(0.6)
    expect(acousticness).toBeCloseTo(0.4)
    expect(catalogue.profile.topArtists).toEqual(topArtists)
    expect(catalogue.source).toBe('spotify+reccobeats')
    expect(catalogue.generatedAt).toBe(generatedAt)
  })

  it('anchors a recommendation on the top artist of the track that seeded it', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1')],
      topArtists,
      recommendations: [{ seedTrackId: 't1', tracks: [track('r1', 'X9')] }],
      features: { t1: f(100), r1: f(90) },
      generatedAt,
    })
    const rec = catalogue.tracks.find((t) => t.id === 'r1')
    expect(rec).toMatchObject({ anchorArtistId: 'A1', isTopTrack: false })
  })

  it('falls back to the seed’s own artist when it is not a top artist', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'Z5')],
      topArtists,
      recommendations: [{ seedTrackId: 't1', tracks: [track('r1', 'X9')] }],
      features: { t1: f(100), r1: f(90) },
      generatedAt,
    })
    expect(catalogue.tracks.find((t) => t.id === 'r1')?.anchorArtistId).toBe('Z5')
  })

  it('keeps top tracks, flagged and anchored on themselves', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1')],
      topArtists,
      recommendations: [],
      features: { t1: f(100) },
      generatedAt,
    })
    expect(catalogue.tracks).toEqual([
      expect.objectContaining({ id: 't1', isTopTrack: true, anchorArtistId: 'A1', features: f(100) }),
    ])
  })

  it('drops tracks with no features', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1')],
      topArtists,
      recommendations: [{ seedTrackId: 't1', tracks: [track('r1', 'X9'), track('r2', 'X8')] }],
      features: { t1: f(100), r1: f(90) },
      generatedAt,
    })
    expect(catalogue.tracks.map((t) => t.id)).toEqual(['t1', 'r1'])
  })

  it('de-duplicates, keeping the first appearance (top tracks win)', () => {
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1'), track('t2', 'A2')],
      topArtists,
      recommendations: [
        { seedTrackId: 't1', tracks: [track('r1', 'X9'), track('t2', 'A2')] },
        { seedTrackId: 't2', tracks: [track('r1', 'X9')] },
      ],
      features: { t1: f(100), t2: f(110), r1: f(90) },
      generatedAt,
    })
    expect(catalogue.tracks.map((t) => t.id)).toEqual(['t1', 't2', 'r1'])
    expect(catalogue.tracks.find((t) => t.id === 't2')?.isTopTrack).toBe(true)
    expect(catalogue.tracks.find((t) => t.id === 'r1')?.anchorArtistId).toBe('A1')
  })

  it('skips tracks with no artists instead of throwing', () => {
    const noArtists: SpotifyTrack = { id: 'p1', title: 'Podcast', artists: [], durationMs: 1 }
    const catalogue = buildCatalogue({
      topTracks: [track('t1', 'A1'), noArtists],
      topArtists,
      recommendations: [],
      features: { t1: f(100), p1: f(100) },
      generatedAt,
    })
    expect(catalogue.tracks.map((t) => t.id)).toEqual(['t1'])
  })

  it('refuses to build a profile when no top track has features', () => {
    expect(() =>
      buildCatalogue({
        topTracks: [track('t1', 'A1')],
        topArtists,
        recommendations: [],
        features: {},
        generatedAt,
      }),
    ).toThrow(/no audio features/i)
  })
})

describe('matchReccoTrack', () => {
  const mine: SpotifyTrack = {
    id: 'mine',
    title: 'Disturbia',
    artists: [{ id: 'RH', name: 'Rihanna' }],
    durationMs: 1,
    isrc: 'USUM70814476',
  }
  const cand = (id: string, title: string, artist: string, isrc?: string): ReccoCandidate => ({
    id,
    title,
    artists: [{ name: artist }],
    isrc,
  })

  it('matches on ISRC', () => {
    expect(matchReccoTrack(mine, [cand('x', 'Other', 'Other', 'USUM70814476')])).toBe('x')
  })

  it('prefers an ISRC match over an earlier name match', () => {
    const candidates = [
      cand('byName', 'Disturbia', 'Rihanna', 'DIFFERENT'),
      cand('byIsrc', 'Disturbia', 'Rihanna', 'USUM70814476'),
    ]
    expect(matchReccoTrack(mine, candidates)).toBe('byIsrc')
  })

  it('falls back to title and artist name when there is no ISRC match', () => {
    const noIsrc = { ...mine, isrc: undefined }
    expect(matchReccoTrack(noIsrc, [cand('x', 'Disturbia', 'Rihanna')])).toBe('x')
    expect(matchReccoTrack(mine, [cand('x', 'Disturbia', 'Rihanna', 'OTHER')])).toBe('x')
  })

  it('ignores case, punctuation, and remaster or feature suffixes', () => {
    expect(matchReccoTrack(mine, [cand('x', 'DISTURBIA (feat. Someone)', 'rihanna!')])).toBe('x')
    expect(matchReccoTrack(mine, [cand('y', 'Disturbia - Remastered 2020', 'Rihanna')])).toBe('y')
  })

  it('matches when any one of several artists matches', () => {
    const collab = { ...mine, artists: [{ id: 'A', name: 'Someone' }, { id: 'RH', name: 'Rihanna' }] }
    expect(matchReccoTrack(collab, [cand('x', 'Disturbia', 'Rihanna')])).toBe('x')
  })

  it('does not match a different song by the same artist', () => {
    expect(matchReccoTrack(mine, [cand('x', 'Umbrella', 'Rihanna')])).toBeUndefined()
  })

  it('does not match the same title by a different artist', () => {
    expect(matchReccoTrack(mine, [cand('x', 'Disturbia', 'Cover Band')])).toBeUndefined()
  })

  it('matches non-Latin titles and artists exactly, and never matches different ones', () => {
    const kpop: SpotifyTrack = { ...mine, title: '사랑', artists: [{ id: 'k', name: '방탄소년단' }], isrc: undefined }
    expect(matchReccoTrack(kpop, [cand('x', '사랑', '방탄소년단')])).toBe('x')
    expect(matchReccoTrack(kpop, [cand('y', '노래', '아이유')])).toBeUndefined()
  })

  it('keeps titles that start with a bracket', () => {
    const t: SpotifyTrack = { ...mine, title: "(What's the Story) Morning Glory?", artists: [{ id: 'o', name: 'Oasis' }], isrc: undefined }
    expect(matchReccoTrack(t, [cand('x', "(What's the Story) Morning Glory?", 'Oasis')])).toBe('x')
    expect(matchReccoTrack(t, [cand('y', '(Some Other Song)', 'Oasis')])).toBeUndefined()
  })

  it('does not treat different parts of a song as the same track', () => {
    const t: SpotifyTrack = { ...mine, title: 'Song - Part 2', isrc: undefined }
    expect(matchReccoTrack(t, [cand('x', 'Song - Part 1', 'Rihanna')])).toBeUndefined()
  })

  it('returns undefined when there are no candidates', () => {
    expect(matchReccoTrack(mine, [])).toBeUndefined()
  })
})
