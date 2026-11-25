// The shape of data/catalogue.json.
// Pure types: no React, no Spotify.

export type Features = {
  /** Beats per minute. */
  tempo: number
  /** 0–1. Shown to users as "intensity". */
  energy: number
  /** 0–1. Shown to users as "mood". */
  valence: number
  /** 0–1. Shown to users as "acoustic". */
  acousticness: number
}

export type ArtistRef = { id: string; name: string }

export type CatalogueTrack = {
  /** Spotify track ID. */
  id: string
  title: string
  artists: ArtistRef[]
  durationMs: number
  features: Features
  /** The top artist the track was recommended from (the artist an explanation cites). Not necessarily one of `artists`. */
  anchorArtistId: string
  /** True if the track came from the user's Spotify top tracks rather than a recommendation. */
  isTopTrack: boolean
  /** The album image (~300px) from Spotify, or null if it has none: the UI shows a placeholder. */
  imageUrl: string | null
}

export type Catalogue = {
  source: 'spotify+reccobeats'
  generatedAt: string
  profile: {
    /** Average features of the user's top tracks. */
    features: Features
    topArtists: ArtistRef[]
  }
  tracks: CatalogueTrack[]
}
