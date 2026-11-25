// The common feature scale, the taste profile and similarity to it.
// Pure TypeScript: no React, no Spotify.

import type { Catalogue, CatalogueTrack, Features } from './catalogue.ts'
import { effects, isExcluded, type Adjustment, type Dislike } from './dislikes.ts'
import type { Chooser } from './queue.ts'

export type FeatureName = keyof Features

export const FEATURE_NAMES: readonly FeatureName[] = ['tempo', 'energy', 'valence', 'acousticness']

/** Every number that shapes scoring lives here, so tuning means editing one object. */
export const SCORE = {
  /** Tempo is divided by this so it sits on roughly the same 0–1 scale as the other features. */
  tempoScaleBpm: 100,
  /** The largest distance any one feature can contribute. */
  maxFeatureDistance: 1,
  /** Added to the score of a track whose own credited artists include a top artist. */
  topArtistBonus: 0.1,
  /** Taken off for each conflict with an adjustment, however slight. */
  conflictFlatPenalty: 0.1,
  /** Multiplies the capped distance past the threshold, so a track further on the wrong side loses more. */
  conflictDistanceWeight: 1,
} as const

/** The taste profile: the average features of the user's top tracks, computed by the catalogue script. */
export function tasteProfile(catalogue: Pick<Catalogue, 'profile'>): Features {
  return catalogue.profile.features
}

/** A feature's value on the common scale. */
export function scaled(feature: FeatureName, value: number): number {
  return feature === 'tempo' ? value / SCORE.tempoScaleBpm : value
}

/** How far apart two values of a feature are on the common scale, capped at 1. */
export function distance(feature: FeatureName, a: number, b: number): number {
  return Math.min(Math.abs(scaled(feature, a) - scaled(feature, b)), SCORE.maxFeatureDistance)
}

/** 1 minus the mean capped distance across the four features: 1 is identical, 0 is as far as possible. */
export function similarity(track: Features, profile: Features): number {
  const total = FEATURE_NAMES.reduce((sum, name) => sum + distance(name, track[name], profile[name]), 0)
  return 1 - total / FEATURE_NAMES.length
}

/** What an explanation cites: the anchor artist and the features closest to the profile. UI turns this into wording. */
export type Explanation = {
  anchorArtistId: string
  /** The one or two features closest to the profile, closest first. */
  features: FeatureName[]
}

/** The most features an explanation cites. */
const EXPLAIN_FEATURE_COUNT = 2

/** Data for explaining a track: its anchor artist plus the features closest to the profile (scaled distance). */
export function explain(track: Pick<CatalogueTrack, 'anchorArtistId' | 'features'>, profile: Features): Explanation {
  const features = [...FEATURE_NAMES]
    .sort((a, b) => distance(a, track.features[a], profile[a]) - distance(b, track.features[b], profile[b]))
    .slice(0, EXPLAIN_FEATURE_COUNT)
  return { anchorArtistId: track.anchorArtistId, features }
}

/** How far past the threshold the track sits on the wrong side (capped distance), or null if it doesn't conflict. */
export function conflictDistance(track: Features, adjustment: Adjustment): number | null {
  const { feature, direction, threshold } = adjustment
  const wrongSide = direction === 'higher' ? track[feature] <= threshold : track[feature] >= threshold
  return wrongSide ? distance(feature, track[feature], threshold) : null
}

/** The sum of conflict penalties: a flat amount per conflict plus a weighted capped distance past the threshold. */
export function conflictPenalty(track: Features, adjustments: readonly Adjustment[]): number {
  return adjustments.reduce((sum, adjustment) => {
    const d = conflictDistance(track, adjustment)
    return d === null ? sum : sum + SCORE.conflictFlatPenalty + SCORE.conflictDistanceWeight * d
  }, 0)
}

/** True if the track conflicts with at least one adjustment. */
export function conflicts(track: Features, adjustments: readonly Adjustment[]): boolean {
  return adjustments.some((a) => conflictDistance(track, a) !== null)
}

/** Similarity to the profile, plus the top-artist bonus, minus conflict penalties. */
export function score(
  track: Pick<CatalogueTrack, 'features' | 'artists'>,
  profile: Features,
  topArtistIds: ReadonlySet<string>,
  adjustments: readonly Adjustment[] = [],
): number {
  const bonus = track.artists.some((a) => topArtistIds.has(a.id)) ? SCORE.topArtistBonus : 0
  return similarity(track.features, profile) + bonus - conflictPenalty(track.features, adjustments)
}

/**
 * The scoring chooser: the highest-scoring fresh tracks first, never top tracks and never excluded tracks.
 * `getDislikes` is read on every call, so the chooser follows the user's reasons without being rebuilt.
 */
export function scoringChooser(
  catalogue: Pick<Catalogue, 'profile' | 'tracks'>,
  getDislikes: () => readonly Dislike[] = () => [],
): Chooser<CatalogueTrack> {
  const profile = tasteProfile(catalogue)
  const topArtistIds = new Set(catalogue.profile.topArtists.map((a) => a.id))
  return (queued, count) => {
    const seen = new Set(queued.map((t) => t.id))
    const dislikes = [...getDislikes()]
    const adjustments = effects(dislikes)
    return catalogue.tracks
      .filter((t) => !t.isTopTrack && !seen.has(t.id) && !isExcluded(t, dislikes))
      .map((t) => ({ t, s: score(t, profile, topArtistIds, adjustments) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, count)
      .map(({ t }) => t)
  }
}
