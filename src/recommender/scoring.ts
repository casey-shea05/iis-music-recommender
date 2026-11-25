// The common feature scale, the taste profile and similarity to it.
// Pure TypeScript: no React, no Spotify.

import type { Catalogue, CatalogueTrack, Features } from './catalogue.ts'

export type FeatureName = keyof Features

export const FEATURE_NAMES: readonly FeatureName[] = ['tempo', 'energy', 'valence', 'acousticness']

/** Every number that shapes scoring lives here, so tuning means editing one object. */
export const SCORE = {
  /** Tempo is divided by this so it sits on roughly the same 0–1 scale as the other features. */
  tempoScaleBpm: 100,
  /** The largest distance any one feature can contribute. */
  maxFeatureDistance: 1,
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
