# Pending Jira changes

Written 23 Nov 2026 while the Atlassian MCP was down (Rovo authentication outage). Apply these, then delete this file.

## 1. Close the technical spike

Comment on **IIS-25**:

> Spike done. Decision note: `docs/adr/0001-technical-spike.md`.
>
> - **Data:** Spotify top tracks/artists + ReccoBeats features and recommendations (no key needed), fetched once into `catalogue.json`; a sample catalogue is committed as the simulated fallback.
> - **Playback:** Web Playback SDK (30 min time-box), then Spotify Connect, then a fake player.
> - **Stack:** Vite + React + TS + Vitest, no server until free text.
> - **LLM:** Haiku 5.5, deferred until after the core build; the text box is a stub for now.
> - **Scoring:** reasons are soft critiques (penalties, not filters); compromises tagged Closest fit.
> - **Chips:** tempo, intensity, mood, acoustic (one side each) + Not a fan of this artist. "Not right now" removed.
> - **PRD:** updated to match (R5, R7, R8, R9, R12, R14–R18, S2, S3, limitations, success criteria). New domain terms in `GLOSSARY.md`.

Move to **✅ Done** (transition id `31`): IIS-25, IIS-37, IIS-38, IIS-39, IIS-40, IIS-41.

## 2. Reorder the Build epic (IIS-3)

Order: sample catalogue and fake player first, Spotify last, so a Spotify problem can't block the core loop. If time runs out, everything up to step 4 is a working prototype on simulated data.

| # | Ticket | Change |
| --- | --- | --- |
| 1 | IIS-26 Project setup | Add: scaffold Vite + React + TS + Vitest; folders `src/domain`, `src/spotify`, `src/state`, `src/ui`, `scripts`, `data`; `data/sample-catalogue.json`; gitignore `data/catalogue.json` and `.env`. Casey creates the Spotify developer app (redirect URI `http://127.0.0.1:5173/callback`) |
| 2 | **New:** Domain core | Pure TypeScript, test-first: profile, scoring (similarity + top-artist bonus − conflict penalties), explanation (anchor artist + 1–2 features), reasons → adjustments → effects, swap rule, Closest fit. Covers the logic for R1, R2, R7, R9; absorbs IIS-46 |
| 3 | IIS-27 Queue and explanations | Re-scope to UI on the sample catalogue with the fake player: Now playing / Up next / Heard, explanation, skip, Start new queue (R1, R2, R3, R13) |
| 4 | IIS-28 Dislike and reasons | Five chips (tempo, intensity, mood, acoustic, Not a fan of this artist); "Not right now" removed; free-text box stored but not steering |
| 4 | IIS-29 Steering the queue | Soft scoring: swap only for higher-scoring tracks; tag Closest fit; Active reasons strip |
| 4 | IIS-31 Reasons panel | Unchanged scope (R11). After step 4, scenarios S1 and S3 work end to end |
| 5 | **New:** Spotify catalogue script | `scripts/fetch-catalogue.ts`: Spotify top tracks/artists → ReccoBeats recommendations + features → `data/catalogue.json` |
| 6 | **New:** Spotify playback | PKCE login + Web Playback SDK (30 min time-box), falling back to Spotify Connect |
| 7 | IIS-30 Free-text reasons | Mark as stretch, after the core build (R8, R14 free-text part). Needs a Console API key + small Hono server |

Also update the **IIS-3** description: R12 and R15–R18 are Planned (already noted); R8 is now Should (after core build).

## 3. Clean up

Once sections 1 and 2 have been applied in Jira:

- [ ] Delete this file (`git rm docs/jira-pending.md`) and commit, e.g. `chore: remove applied jira-pending note`
