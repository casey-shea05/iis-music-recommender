# 0001 Technical spike: data, playback, stack and scoring

- **Status:** Accepted
- **Date:** 2026-11-23
- **Ticket:** IIS-25 (sub-stories IIS-37 to IIS-41)

## Context

The PRD says what the prototype does but not how. Building time is about a day and a half (build and feature freeze 24 Nov, submission 25 Nov 9pm). Spotify closed its Audio Features and Recommendations endpoints to new apps in Nov 2024, and in Feb 2026 it tightened Development Mode: the app owner needs Premium, each app gets 5 users, and batch lookups, artist top tracks and `popularity` were removed. The developer has Spotify Premium, and the app only needs to run on localhost for a recorded demo.

## Decisions

### 1. Data: Spotify + ReccoBeats, fetched once into a snapshot

| Option | Verdict |
| --- | --- |
| Spotify only | No audio features or recommendations for new apps |
| Static Kaggle dataset | Works, but isn't the developer's own listening history (R1) |
| Deezer | Previews, but `bpm` comes back as 0, and browsers can't call it directly (no CORS) |
| **Spotify (identity, history, playback) + ReccoBeats (features and recommendations), joined on Spotify track ID** | **Chosen** |

ReccoBeats (`api.reccobeats.com`) needs no key, allows browser calls, and returns tempo, energy, acousticness, valence and more for a Spotify track ID. Its `/v1/track/recommendation?seeds=` endpoint returns similar tracks with their Spotify IDs. Both were checked by hand on 2026-11-23.

`scripts/fetch-catalogue.ts` runs once:
1. Get Spotify `/me/top/tracks` and `/me/top/artists`.
2. Ask ReccoBeats for recommendations seeded from them.
3. Get ReccoBeats features for every track. Top tracks ReccoBeats doesn't know by Spotify ID (Spotify can give one recording several IDs) are looked up by ISRC, then by title search with a title and artist match; those it still can't find are skipped (10 of 50 on the developer's account).
4. Write `data/catalogue.json` (about 300–2,000 tracks, under 1 MB).

The app reads the file rather than calling the APIs live, so the demo and tests don't depend on third-party uptime or rate limits. `data/catalogue.json` is gitignored because it holds personal data. No sample catalogue is committed: running the app needs a Spotify login with Premium, which the setup guide covers, and the prototype is also shown in a recorded demo video.

### 2. Taste profile: Spotify top tracks and artists

The profile is the average features of the user's top tracks plus the list of top artists, from Spotify (medium-term range). This replaces the stats.fm export TODO in the PRD: stats.fm uses the same Spotify data, and an export would take days to arrive.

### 3. Playback: Spotify Web Playback SDK, with a fake player as the fallback

The player sits behind a small `Player` interface (play a track, pause, resume, seek, set volume, and progress, track-started and track-ended events) with two engines:

- **Spotify engine:** the Web Playback SDK plays full tracks in the browser tab with Premium, and the Spotify app doesn't need to be open. It's time-boxed to 30 minutes, because a forum report says `connect()` hangs in Development Mode since Feb 2026.
- **Fake engine:** the same controls and events, driven by a timer over the track's duration, with no audio. It is the Vitest test double and the fallback: if `connect()` hangs, the app shows a "Playback unavailable" banner and uses it, so the rest of the app stays usable.

Spotify Connect (controlling the desktop app) was considered as a middle fallback and not built. The desktop app would have to be open, and track endings would have to be found by polling, so it was flakier to demo for little gain.

Spotify needs the redirect URI on `http://127.0.0.1:<port>`; `localhost` is not accepted. The browser handles its own login callback on that URI and keeps tokens in `localStorage` with silent refresh. Without saved tokens, or when a refresh fails, the app starts on the fake engine, and the banner offers a Log in with Spotify button. The app never forces a login on load. The catalogue script and the dev server share the URI, so they can't run at the same time.

### 4. Stack: Vite + React + TypeScript, no server yet

- Next.js was considered and rejected: server rendering doesn't help a local single-user app, and the SDK only runs in the browser.
- .NET was considered and rejected: it would mean two languages and no shared types.
- Spotify login uses PKCE in the browser, so no client secret and no server are needed.
- Tests use Vitest.
- A small Node (Hono) server is added only when free text needs to keep an Anthropic key out of the browser.

Layout (amended 2026-11-24, IIS-56):

- `src/app/`: the single page. Every component gets its own `Name/Name.tsx` folder, and a component's children sit in its own `components/` subfolder. A component lives in the `components/` folder of the closest parent that uses it.
- `src/shadcn/`: vendored shadcn/ui building blocks and their `cn()` helper, kept flat as the CLI generates them (`components.json` points here).
- `src/hooks/`: hooks shared across components, such as `PlaybackProvider` and `usePlayback()`. A hook used by one component sits in that component's folder.
- `src/recommender/`: pure TypeScript logic (catalogue, queue, and later reasons and scoring), no React and no Spotify.
- `src/playback/`: the `Player` interface, the fake engine and engine selection. `src/playback/spotify/` holds all Spotify code (PKCE, browser auth, the SDK engine). Only engine selection in `src/playback/` and the catalogue script in `scripts/` import from it; the rest of the app sees the `Player` interface.
- `src/utils/`: small shared helpers such as formatting.

File names: components are PascalCase, other modules are camelCase, and generated shadcn files keep their lowercase names.

### 5. Free text: accepted but not acted on for now

The text box saves the reason so it shows in the reasons panel, but it doesn't steer. Interpreting free text (R8, R14) comes after the core build: `claude-haiku-5-5` with structured output limited to the fixed set of adjustments, a Console API key in `.env`, and a keyword fallback when no key is set. A Claude subscription doesn't include API access.

### 6. Reasons are soft critiques, not filters

Chips: both sides of tempo, intensity (energy), mood (valence) and acoustic (acousticness) as pairs, where choosing one side deselects the other, plus *Not a fan of this artist*. The side isn't guessed from the disliked track, because "slow" is subjective (amended 2026-11-25, IIS-28). "Not right now" was dropped: it changed nothing and overlapped with skip and dislike.

- A chip creates an adjustment with a **threshold taken from the disliked track** (e.g. "Too slow" on an 85 bpm track means "faster than 85 bpm"). The latest reason on a feature replaces the earlier one; different features combine.
- **Score** = similarity to the profile + a top-artist bonus − a penalty for each conflict, growing with how far the track sits on the wrong side.
- Only *Not a fan of this artist* is a hard exclusion.
- After a reason, an unheard Up next track that conflicts is swapped only for a higher-scoring candidate. A replacement that still conflicts is tagged **Closest fit**.
- **Explanation**: the anchor artist (the top artist the track was recommended from) plus the one or two features closest to the profile.

A hard filter was rejected because stacked reasons can empty a small catalogue, and it would make the recommender behave like a search filter. Treating critiques as soft preferences follows incremental critiquing (see Llorente & Escalera 2011; Chen & Pu 2011). Steering with audio features follows Millecamp et al. 2018. Weakening older reasons over time is left as an idea for a fuller system.

### 7. State: in memory and localStorage, no database

Session effects live in memory, so a reload or Start new queue begins a new session. Long-term artist blocks and liked tracks are saved in `localStorage`, which means they only exist in that one browser.

## Consequences

- The data is real and personal, and running the app doesn't depend on live APIs, but the catalogue is small. Tracks conflict more often than they would with millions of tracks, which is what makes scenario S3 (Closest fit) easy to demonstrate.
- ReccoBeats features are third-party estimates, not Spotify's own values.
- Without free text, scenario S2 can't be demonstrated. S3 changes from a misread of free text to an over-constrained queue; the misread version is parked as S3b.
- Adding the server later is a small change to the codebase, because only the free-text interpreter needs it.
