# IIS Music Recommender

A music recommender prototype in which each track explains why it was chosen, and the listener can answer that explanation with a reason for disliking it (for example "Too slow"). The reason steers what plays next, and the listener can see and undo its effects. Built for the Intelligent Interactive Systems module, Assignment 2.

**Prose word count:** 1,475 (including headings and tables; excluding code, setup commands and link addresses)
**Submitted version:** [`v1.0`](https://github.com/casey-shea05/iis-music-recommender/releases/tag/v1.0)
**Setup:** [docs/SETUP.md](docs/SETUP.md). It runs without any keys.

## Project status

**Implemented**

- A discovery queue built from a catalogue of tracks, with Now playing, five tracks Up next and a Heard list for the session.
- An explanation under every track, naming the top artist it was found from and the one or two audio features closest to the listener's taste.
- A reason panel with paired chips for tempo, intensity, mood and acoustic sound, plus "Not a fan of this artist". Submitting removes the track, confirms in a toast how the reason was understood, and swaps conflicting tracks in Up next for better-scoring ones.
- Reasons lower a track's ranking rather than removing it, so steering cannot empty the queue. Only blocking an artist excludes tracks.
- A Dislikes tab that summarises the active effects and lets the listener remove a dislike, and a Blocked artists tab with Unblock. Dislikes last for the session; blocked artists persist in the browser.
- A skip is neutral: the system records nothing from it.

**Simulated**

- Playback falls back to a fake player when Spotify is not configured, the listener is not logged in, or the account is not Premium. The queue, timing and seek bar behave normally but no audio plays. The committed catalogue lets the whole interaction run this way without keys.
- The catalogue is a fixed snapshot of 341 tracks built offline from the developer's Spotify listening, not a live query.

**Planned (not built)**

- Interpreting free-text reasons with a language model. The text box is present and typed reasons are saved and listed, but they do not steer, and the toast says so.
- Tagging a swapped-in track as a "Closest fit" when nothing better was available, correcting a reason in the listener's own words, liking tracks, logging reasons over time, and disliking tracks from the Heard list.
- Evaluation with other users. The prototype has been tested by the developer only.

## Technology stack

| Technology | Role |
| --- | --- |
| Vite, React 19, TypeScript | The browser app |
| Tailwind CSS, shadcn/ui (Base UI), Sonner, Lucide | Styling, slider, button and toast components, icons |
| Vitest, Testing Library, jsdom | Unit and component tests |
| ESLint, GitHub Actions | Linting, run on every pull request |
| Spotify Web API (PKCE login) | Top tracks and artists for the taste profile; track search when building the catalogue |
| Spotify Web Playback SDK | Real playback in the browser (Premium only) |
| Last.fm API | Similar artists and their top tracks, which choose the catalogue's candidates |
| ReccoBeats API | Audio features (tempo, energy, valence, acousticness), since Spotify closed its own feature endpoint to new apps |

The recommender itself is not a trained model. It is a content-based scorer written in TypeScript (`src/recommender/`): each track's score is its similarity to the averaged features of the listener's top tracks, minus a penalty for each active reason it conflicts with. **Still undecided:** the language model for free-text reasons. The system diagram plans a small Claude model, but the prompt and the mapping onto feature adjustments have not been designed.

## Running or inspecting the work

```sh
npm install
npm run dev     # http://127.0.0.1:5173/
npm test
```

[docs/SETUP.md](docs/SETUP.md) has two pathways: the simulated app with no keys, and real Spotify playback with an optional catalogue built from your own listening. No keys are committed. [`.env.example`](.env.example) lists the variables a reviewer supplies.

## Development record

Each significant change below links to its pull request, which holds the full description and before-and-after evidence. Every pull request was reviewed by the developer and merged only after the tests, type check and lint passed; interface changes were also checked by hand in the browser.

### 1. Research and design

- The [literature review](submissions/literature-review/) defined the problem: recommenders explain little, and listeners can only skip, which the system has to interpret. The research logs record the search, shortlist and related-work map ([commits](https://github.com/casey-shea05/iis-music-recommender/commits/5bd0b69)).
- A [technical spike](docs/adr/0001-technical-spike.md) found that Spotify no longer gives new apps audio features or recommendations. The catalogue is therefore built once, offline, with features from ReccoBeats, and the app reads that file instead of calling APIs during a session.

### 2. Player and queue

- **Two playback engines behind one interface** ([#6](https://github.com/casey-shea05/iis-music-recommender/pull/6)), so the app stays usable without Spotify Premium. Checked by `connectPlayer.test` (falls back when Spotify is not configured, fails or hangs) and `fakePlayer.test`.
- **Queue with Up next and Heard** ([#7](https://github.com/casey-shea05/iis-music-recommender/pull/7), [#8](https://github.com/casey-shea05/iis-music-recommender/pull/8)). Heard moved to the main page while mocking up, to leave the expanded player free for steering. Checked by `queue.test` (tops up without repeating a track) and `usePlayback.test`.
- **Artwork from Spotify's public oEmbed endpoint** ([#9](https://github.com/casey-shea05/iis-music-recommender/pull/9)), because the batch track endpoint refused this app.

### 3. Recommender logic

- **Scoring, reasons and swapping as pure functions** ([#10](https://github.com/casey-shea05/iis-music-recommender/pull/10) to [#14](https://github.com/casey-shea05/iis-music-recommender/pull/14)), kept apart from React so that each rule could be tested directly. A conflicting reason lowers a track's score instead of filtering it out, so stacked reasons cannot empty the queue. Checked by `scoring.test` (a flat plus distance penalty per conflict), `dislikes.test` (the latest reason on a feature wins, and different features combine) and `swap.test` (a track is kept when no candidate scores higher).

### 4. The interaction

- **Explanation wording** ([#15](https://github.com/casey-shea05/iis-music-recommender/pull/15), [#16](https://github.com/casey-shea05/iis-music-recommender/pull/16)) claims that a track is closest to the listener's taste, never that it matches, because the features are estimates. Checked by `explanationText.test`.
- **Reason panel, dislike and swap** ([#17](https://github.com/casey-shea05/iis-music-recommender/pull/17) to [#21](https://github.com/casey-shea05/iis-music-recommender/pull/21)). Nothing is recorded until Submit, and the toast repeats how the chips were understood. Checked by `reasonConfirmationText.test` and `App.test` (a slow Up next track is replaced by a faster one, and nothing changes when no candidate scores higher).

### 5. Changes after the first build (25 November)

- **The effects summary moved into the Dislikes tab** ([#22](https://github.com/casey-shea05/iis-music-recommender/pull/22), [#25](https://github.com/casey-shea05/iis-music-recommender/pull/25)), because an always-visible strip of active reasons overlapped the explanation line. Checked by `effectsSummary.test`.
- **Blocked artists became their own long-term list** ([#23](https://github.com/casey-shea05/iis-music-recommender/pull/23), [#24](https://github.com/casey-shea05/iis-music-recommender/pull/24), [#25](https://github.com/casey-shea05/iis-music-recommender/pull/25)). With one shared list, removing a dislike could silently unblock an artist. Checked by `dislikes.test` (the block survives removing the dislike and ending the session) and `PlayerTabs.test`.
- **The catalogue moved to Last.fm similar artists** ([#26](https://github.com/casey-shea05/iis-music-recommender/pull/26), [ADR 0002](docs/adr/0002-catalogue-source.md)). ReccoBeats recommendations were far from the listener's taste: a seed by Ariana Grande returned country and regional Mexican tracks. Checked by `catalogue.test` (track matching never accepts the same title by a different artist, and duplicate recordings are dropped) and by inspecting the rebuilt catalogue.
- **Free-text interpretation and the Closest fit tag were deferred** ([#27](https://github.com/casey-shea05/iis-music-recommender/pull/27)) to fit the build time. The text box stays so the design can be shown. Checked by `reasonConfirmationText.test` (the toast says typed reasons do not steer).

### 6. Report evidence

- Storyboards, screenshots and diagrams ([#28](https://github.com/casey-shea05/iis-music-recommender/pull/28) to [#31](https://github.com/casey-shea05/iis-music-recommender/pull/31)). For submission, the catalogue was committed so the app runs without keys, and this README and the setup guide were added.

## AI assistance

**Original, reused and assisted work.** The problem, requirements, design decisions and their changes are the developer's own, recorded in the [design brief](docs/PRD.md), the decision records in `docs/adr/` and the Jira tickets behind each pull request. Reused material is limited to open-source libraries, the shadcn/ui component sources in `src/shadcn/` and data from Spotify, Last.fm and ReccoBeats.

- **Claude Code** (Anthropic) wrote most of the code and tests from tickets the developer wrote, one ticket per branch, and drafted the pull request descriptions, documentation and diagram sources. It also captured the report screenshots through its Chrome extension and wrote the script that crops them into flow strips (`submissions/report/screenshots/flows/`). Its output was checked by reviewing every pull request, running the tests, and using the app in the browser.
- **Claude** (claude.ai) helped draft and edit the report.
- **Gemini** generated the storyboard images from panel scripts whose on-screen text was taken from the code. Each panel was checked against its script and fixed with follow-up prompts; [prompts.md](submissions/report/storyboards/prompts.md) records the prompts and fixes.

Examples of checking and changing AI output:

- The first version of the Last.fm catalogue looked up tracks with ReccoBeats' title search. A partial run missed 31% of lookups and kept hitting the rate limit, so the lookup was changed to Spotify search with an artist filter ([ADR 0002](docs/adr/0002-catalogue-source.md)).
- Using the built app showed that removing a dislike could unblock an artist, which led to the separate Blocked artists list ([#23](https://github.com/casey-shea05/iis-music-recommender/pull/23)).
- The first storyboard drafts had garbled labels and a greyscale style; labels that mattered were corrected and the style was changed to pastels.

## Additional files

| Path | Contents |
| --- | --- |
| [`submissions/report/`](submissions/report/) | Figures for the report, which is submitted separately |
| [`submissions/report/diagram/`](submissions/report/diagram/) | System and conceptual-spine diagrams (`.html` source, `.png` in the report) |
| [`submissions/report/storyboards/`](submissions/report/storyboards/) | Three storyboards and the Gemini prompts |
| [`submissions/report/screenshots/`](submissions/report/screenshots/) | `raw/`: 16 screenshots of the built app; `flows/`: the flow strips cropped from them |
| [`submissions/literature-review/`](submissions/literature-review/) | Assignment 1 literature review (PDF) and research logs |
| [`docs/`](docs/) | Design brief, decision records, setup guide |
| [`GLOSSARY.md`](GLOSSARY.md) | Terms used in the code and documents |

There is no ZIP: everything is in the repository.
