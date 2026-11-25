# 0002 Catalogue source: Last.fm picks candidates, ReccoBeats supplies features

- **Status:** Accepted (supersedes step 2 of decision 1 in ADR 0001)
- **Date:** 2026-11-25
- **Ticket:** IIS-82 (IIS-69 is parked until it is done)

## Context

ADR 0001 built the catalogue from ReccoBeats recommendations seeded by the user's top tracks, keeping any track that had audio features. In use, most recommended tracks were far from the user's taste (languages and genres they don't listen to). A probe on 2026-11-25 seeded `/v1/track/recommendation` with Ariana Grande's "Dangerous Woman" and got Morgan Wallen, Eslabon Armado and Tito Double P. Identical calls returned different tracks, and it is unclear whether the extra parameters (energy, tempo, popularity) are honoured. One anchor artist (HOYO-MiX) also supplied 163 of 708 recommended tracks. The audio features themselves are not the problem, and the taste profile is unaffected because it is built from top tracks only.

## Decision

Last.fm chooses which tracks enter the catalogue: for each top artist, `artist.getSimilar` (similarity of at least 0.3, the 10 closest), then each similar artist's top 3 tracks. ReccoBeats is kept only to look up audio features and to resolve a track to its Spotify ID, with the existing ISRC and title matching. The ReccoBeats recommendation step is removed. The anchor artist stays the top artist behind a pick.

## Considered options

- **Filter ReccoBeats output after the fact** (ISRC country allow-list, Last.fm tag gate, per-anchor cap): rejected as a patch over a weak source. Kept as a later step if the new catalogue still has rogue tracks.
- **MusicBrainz:** metadata only (country, genres, ISRC lookup, about 1 request a second). It has no audio features or recommendations, so it could only be an optional tie-breaker.
- **Deezer related artists** (no key reported, unverified): plan B. It uses Deezer IDs, so every track would need matching by ISRC, and ReccoBeats would still supply features.
- **ListenBrainz Labs similar artists:** experimental and incompletely documented.
- **Spotify:** audio features, recommendations and related artists are closed to new apps (see ADR 0001).

## Consequences

- The script needs a free `LASTFM_API_KEY` in `.env`.
- It makes roughly 600 more lookups than before (resolving each track to a Spotify ID and features), which is acceptable for a script that runs once.
- The app can't ask for more tracks during a session. Steering stays a re-ranking of this fixed catalogue.
