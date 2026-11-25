# Setup guide

There are two ways to run the prototype. Pathway 1 needs no accounts or keys and shows the whole interaction. Pathway 2 adds real Spotify playback and, optionally, a catalogue built from your own listening.

| | Pathway 1: simulated | Pathway 2: real playback |
| --- | --- | --- |
| Keys or accounts | None | Spotify developer app; Spotify Premium for audio |
| Catalogue | The committed `data/catalogue.json` | The committed one, or your own (`npm run catalogue`) |
| Player | Fake player: the queue, seek bar and timing work, but no audio plays | Spotify Web Playback SDK in the browser |
| Steering, explanations, Dislikes and Blocked artists | Work | Work |

## Requirements

- Node.js 22.18 or later (developed on Node 24). Check with `node -v`.
- A desktop browser. Chrome was used for testing.

## Pathway 1: run it without keys

```sh
git clone https://github.com/casey-shea05/iis-music-recommender.git
cd iis-music-recommender
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>. A banner says that Spotify is not set up, so tracks play without sound. This is expected: the app has fallen back to the fake player.

To try the interaction:

1. Press **Dislike** (thumbs down) in the player bar to open the expanded player.
2. Pick one or more reason chips, such as **Too slow**, and press **Submit**. A toast confirms how the reason was understood, the next track plays, and conflicting tracks in Up next are swapped.
3. Open the **Dislikes** tab to see the active effects, or remove a dislike. **Not a fan of this artist** adds the artist to **Blocked artists**, which persists across reloads.
4. **Start new queue** clears the session's dislikes but keeps blocked artists.

The catalogue in this mode is the developer's own snapshot (341 tracks), so explanations name the developer's top artists, not yours.

### Checks

```sh
npm test          # Vitest unit and component tests
npm run typecheck # TypeScript
npm run lint      # ESLint
npm run build     # production build into dist/
```

## Pathway 2: real playback with Spotify

### 1. Create a Spotify app

1. Sign in at <https://developer.spotify.com/dashboard> and choose **Create app**.
2. Add the redirect URI `http://127.0.0.1:5173/callback` exactly. Spotify rejects `localhost`, which is why the app is served on `127.0.0.1`.
3. Under the APIs used, tick **Web API** and **Web Playback SDK**.
4. Save, then copy the **Client ID**. No client secret is needed: login uses PKCE (a browser login flow that needs no secret).
5. New apps run in development mode, so add the Spotify account you will log in with under **User Management**.

### 2. Add your keys

```sh
cp .env.example .env
```

Fill in `SPOTIFY_CLIENT_ID`. Leave `SPOTIFY_REDIRECT_URI` as it is unless you registered a different one. `.env` is gitignored. Do not put a client secret in it, because every `SPOTIFY_` variable is copied into the browser bundle.

### 3. Run and log in

```sh
npm run dev
```

Choose **Log in with Spotify** in the banner and approve access. With Spotify Premium, tracks then play through a player device called "IIS Music Recommender". Without Premium, or if the player cannot connect within 10 seconds, the app falls back to the fake player and says so in the banner.

### Optional: build a catalogue from your own listening

This replaces `data/catalogue.json` with tracks chosen from your Spotify top tracks and artists. It also needs a free Last.fm API key.

1. Create a key at <https://www.last.fm/api/account/create> and add it to `.env` as `LASTFM_API_KEY`.
2. Stop the dev server, because the script listens on the same port for the Spotify login.
3. Run:

   ```sh
   npm run catalogue
   ```

   A browser window opens for the Spotify login. The script then finds similar artists on Last.fm, looks up each of their top tracks on Spotify, and fetches audio features from ReccoBeats (which needs no key). Requests are spaced to stay under each service's rate limit, so a run takes a few minutes. Lookups are cached in `data/catalogue-cache.json` (gitignored), so a rerun after a crash does not repeat them.
4. Run `npm run dev` again. To return to the committed catalogue, run `git checkout data/catalogue.json`.

### Troubleshooting

- **"INVALID_CLIENT: Invalid redirect URI"**: the URI in `.env` does not exactly match the one registered on the Spotify app.
- **Login works but playback is unavailable**: the account is not Premium, or it has not been added under User Management.
- **Port 5173 is already in use**: another dev server is running. Stop it, because the port is fixed to match the redirect URI.
