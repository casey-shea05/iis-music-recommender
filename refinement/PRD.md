# IIS Design Brief (PRD)

## Problem and context

People discovering music through recommended playlists can't tell the system why a track missed, so it guesses and keeps missing.

### Problem statement

- **Who and situation:** People use recommended playlists to discover new music, but have little control over what comes next.
- **What's missing:** The reasoning behind a recommendation is rarely visible, and there are few ways to tell the system it got something wrong.
- **Why it goes wrong:** When someone skips, dislikes or removes a track, the system only sees the rejection, not the reason, so it has to infer one from behaviour, and a skip doesn't necessarily mean a dislike.
- **Why it matters:** Later recommendations can keep missing what the user wanted, and satisfaction depends on perceived control as well as on content quality.

### Goal

Let users answer a track's explanation with their own reason for rejecting it, and have that reason shape what comes next.

Every requirement should trace back to one of the four problem-statement parts or to a scenario.

## Users and core scenarios

Two light user types, split by musical sophistication; the listening goal varies across the scenarios.

### User types

|  | Casual explorer | Engaged listener |
| --- | --- | --- |
| **Who** | Likes finding new music but doesn't have the words for why a track is wrong | Knows their taste well and can say exactly what's off |
| **Needs** | Quick preset reasons (chips) | Their own wording when no preset fits (free text) |
| **Risk** | Skips without explaining if it takes effort | Gets frustrated if the system flattens their reason |

Free text is available to everyone when no chip fits; engaged listeners are just the most likely to need it.

### Scenarios

Each scenario becomes one storyboard.

- **Steering with a chip (normal path).** A casual explorer is on a discovery playlist. A track comes up with "picked because you like \[artist\]". It's too slow for right now, so they dislike it and tap "Too slow". The next few tracks pick up the pace, and they can see their reason was used.
- **When no chip fits (free text).** An engaged listener has a specific goal. They like the artist but not their live recordings, which no chip covers, so they type it. The system applies it straight away and shows how it understood it, so they can correct it if needed. *Not demonstrable until free-text interpretation is built (R8).*
- **The system gets it wrong (failure and recovery).** A user stacks several reasons ("Too slow", then "Too intense", then "Too gloomy"). Few tracks fit all of them, so Up next fills with compromises tagged "Closest fit". The user sees the tags, opens the reasons panel, sees which effects are pulling against each other and removes one. Up next recovers.
  - **S3b (parked until free text is built):** a typed reason is misread ("heard this too much" treated as disliking the genre), and the user sees the interpretation and corrects or removes it.

## Scope and requirements

The prototype covers one discovery session, where users steer what comes next by giving reasons when they dislike a track.

### Scope

- **Setting:** music discovery and attentive listening.
- **Steering:** through reasons given when rejecting individual tracks, using chips plus free text.
- **Profile:** may be shown, but not edited directly.

### Non-goals

- No chat interface or back-and-forth with the system.
- No custom-trained model; the prototype uses an existing one.
- No direct profile editing, such as sliders or settings. Users can only remove or correct their own reasons.
- No recommendations based on other users' tastes; the recommender is content-based.
- Not a full music player. Playback only needs to be enough to show the interaction.

### Requirements

Traces to the problem-statement parts (Situation, Missing, Wrong, Matters) or the scenarios in the order listed (S1–S3).

| ID | Requirement | Traces to | Priority | Approach |
| --- | --- | --- | --- | --- |
| R1 | A discovery queue built from listening history, with three parts: Now playing, Up next (3–5 tracks) and Heard | Situation | Must | Implement |
| R2 | The track playing always shows a short explanation: one artist anchor plus one or two features | Missing, S1 | Must | Implement |
| R3 | A skip is neutral: no prompt, and the system learns nothing from it | Wrong | Must | Implement |
| R4 | A dislike stops the track, removes it and opens a reason prompt | Wrong, S1 | Must | Implement |
| R5 | The prompt shows chips adapted to the track (one side each of tempo, intensity, mood and acoustic, plus Not a fan of this artist) and a free-text box; several can be combined | Missing, S1, S2 | Must | Implement |
| R6 | The prompt can be dismissed; a dislike with no reason only removes the track, and no reason is inferred | Wrong | Must | Implement |
| R7 | Tempo, intensity, mood, acoustic and free text apply for this session only; Not a fan of this artist applies long-term | Wrong, S1 | Must | Implement |
| R8 | Free text is interpreted and applied straight away. Until then, typed reasons are saved and listed but don't steer | S2 | Should | Implement after core build (existing model) |
| R9 | Reasons lower the ranking of conflicting tracks rather than filtering them out (only Not a fan of this artist excludes). After a reason, unheard tracks in Up next that conflict with it are swapped for higher-scoring ones, and a replacement that still conflicts is tagged "Closest fit". The latest reason on a feature wins, and different features combine | Matters, S1, S3 | Must | Implement |
| R10 | An Active reasons strip shows the merged effects steering the session | Matters, S1 | Must | Implement |
| R11 | Tapping the strip opens a reasons panel: each reason is listed under its effect with its source, split into this session and long-term, and can be removed; removing a reason doesn't undo the dislike | Matters, S3 | Must | Implement |
| R12 | Tracks in Heard can be disliked later, the same way as the track playing | Wrong | Won't (yet) | Plan |
| R13 | Start new queue resets all session effects | S1 | Must | Implement |
| R14 | A brief confirmation after each reason, showing how free text was understood | Matters, S2 | Must (chips) / Should (free text) | Implement; the free-text part comes with R8 |
| R15 | A reason can be corrected in the user's own words and re-interpreted | S3b | Won't (yet) | Plan |
| R16 | Tracks can be liked and saved to a liked playlist; a like doesn't steer | Situation | Won't (yet) | Plan |
| R17 | Each dislike is logged with its reasons and how they were interpreted | Matters | Won't (yet) | Plan |
| R18 | Swapped tracks in Up next are tagged with the reason that brought them in | Matters, S1 | Won't (yet) | Plan |
| R19 | A full view of the long-term taste profile | Matters | Won't (yet) | Plan |
| R20 | Seed-based sessions and mood mixes | Situation | Won't (yet) | Plan |
| R21 | Rejecting upcoming tracks before they play | Wrong | Won't (yet) | Plan |
| R22 | Likes and repeated reasons feed the long-term profile, using the reason log | Matters | Won't (yet) | Plan |
| R23 | Follow-up chips for mood and genre | Missing | Won't (yet) | Plan |
| R24 | A disliked track can be set back to neutral | S3 | Won't (yet) | Plan |

R12 and R15–R18 were moved to Planned on 23 Nov to fit the build time. Data, playback and stack decisions are in [ADR 0001](../docs/adr/0001-technical-spike.md): the taste profile comes from Spotify top tracks and artists, features and candidate tracks come from ReccoBeats.

### Known limitations

- Moods beyond happy/sad (valence) still need free text.
- Session-only effects only partly address later recommendations missing.
- The catalogue is a small snapshot (hundreds to a few thousand tracks), so stacked reasons run into Closest fit sooner than they would in a full catalogue.
- Track features are ReccoBeats' estimates, not Spotify's own values.
- Long-term reasons and likes are stored in one browser only (no accounts or server).
- Until R8 is built, typed reasons are saved but don't steer.
- Tested by the developer only, so perceived control isn't measured.

### Ideas for a fuller system

These don't trace to the problem, so they sit outside the requirements.

- Multiple playlists.
- A setting to turn reason prompts off. This works against the problem by bringing back guessing, so it would need care.

## Rationale table

Decisions built with QOC. Criteria are concepts from the IIS Week 1–4 lectures, cited by week and lecture.

| Question | Options (chosen in bold) | Criteria → concept | Reqs |
| --- | --- | --- | --- |
| How do users give a reason? | Chips only / free text only / **chips + free text** | Chips show what can be said instead of a blank box (recognition over recall, W2 L5); the screen holds the common options and language covers the exceptions (hybrid pattern, W3 L7); a text box on its own suggests the system understands anything (expectation gulf, W1 L3) | R4, R5, R8 |
| What does the system learn without a reason? | Infer from skips / **a skip is neutral; a dislike with no reason only removes the track** | A skip has too many possible causes to guess from (interprets under uncertainty, W1 L2); better to wait than act on a weak signal (act, ask or wait, W1 L3); likes don't steer, so only reasons the user gives change the queue | R3, R6, R16 |
| How is typed feedback applied? | Confirm first / **apply now, show how it was read, allow fixing** / keyword match | Low stakes and undoable, so do it and show it (do, confirm or never, W4 L12); showing the reading lets a misread be caught (grounding by display, W3 L7) | R8, R14, R15 |
| How far does a reason reach? | All long-term / all session / **split: tempo, intensity, mood, acoustic and free text for this session; artist long-term** | "Too slow" is about the moment, not taste, and making it permanent causes the borrowed-afternoon problem (Amershi et al. "update cautiously", cited in W1 L3); old moods turn into stale memory (W4 L10) | R7, R13, R22 |
| How is the effect made visible? | Silent re-rank / regenerate the whole queue / **swap only conflicting unheard tracks, tag them, show the strip** | A change with no visible cause breaks "I did that" (thermostat problem, W2 L6); tell users about changes (Amershi et al., cited in W1 L3); order shapes what gets heard, so only conflicting tracks move (ranking is never neutral, W2 L6) | R9, R10, R18 |
| How much does each track explain, and how many are shown? | No explanation / full feature breakdown / **artist anchor + 1–2 features; Up next 3–5 tracks** | Enough to judge and steer, not everything (explanation dosage, Kulesza et al., cited in W2 L5); a recommendation is a claim, so its reason is shown, and with scoring the reason is how the track was ranked (W4 L11); fewer, best first (W4 L11) | R1, R2 |
| How do users inspect and undo? | Direct profile editing / no control / **reasons panel with removal and correction** | Reasons are the only input, so removing one undoes its effect without editing the profile (inspectable, editable, forgettable, W4 L10); covers both slips and misreads (slips vs mistakes, W2 L6); adds control without reducing automation (W1 L3). Full profile view left out of the prototype: the reasons panel already shows session and long-term reasons; a full view belongs in a fuller system | R11, R15, R19, R24 |
| Does a reason filter or steer? | Hard filter (exclude conflicting tracks) / **soft critique: conflicts lower the score, only an artist veto excludes, and compromises are tagged Closest fit** | A filter can empty the queue, which turns a recommender into a search filter; treating critiques as soft preferences combines how well a track meets them with how similar it is (incremental critiquing, Llorente & Escalera 2011; Chen & Pu 2011); steering through audio features follows Millecamp et al. 2018; tagging compromises keeps the change visible (thermostat problem, W2 L6). **TODO:** link to a lecture concept | R9, R11 |
| Where does the intelligence sit? | Trained model / LLM recommends / **scoring, plus an LLM that only translates typed reasons** | No training data and a short build (simplest system that solves the task, W1 L2); keeps inference to a few known points (where inference sits, W1 L2); the LLM proposes an adjustment from a fixed set and code checks it (schema: shape, not truth, W3 L9; the model only proposes, W4 L12) | R1, R8 |

## Success criteria and open questions

The prototype succeeds if steering visibly works, takes little effort and recovers from misreads. All checks are run by the developer.

| Criterion | Traces to | How checked |
| --- | --- | --- |
| **Steering works:** after a reason, most swapped tracks in Up next fit it, and each shows the reason that brought it in | Matters, S1 | Trace, then manual test |
| **Giving a reason is low effort:** a chip reason takes at most 2 taps after a dislike, and dismissing the prompt takes 1 | Wrong, S1 | Manual walkthrough |
| **Typed reasons are understood** (only once R8 is built): at least 8 of 10 prepared phrasings map to the intended adjustment, across 2–3 runs | S2 | Automated test set |
| **Over-steering can be recovered:** after stacked reasons push Up next into Closest fit, removing one effect in the reasons panel brings fitting tracks back | S3 | Manual test |

### Open questions

- [x] Should the taste profile be shown, and how much of it? Showing it may be needed so users can see their reasons changing what comes next. The reasons panel already shows long-term reasons, and a full profile view is a Could. **TODO:** decide during interaction design; possible rationale table row.

  Decided: not in the prototype; see rationale row 7.

---

*Supporting evidence for the problem is in the Assignment 1 literature review. Evidence for each design decision goes in the rationale table.*
