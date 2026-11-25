# Concepts Shortlist

<aside>
🌷

**Purpose:** the IIS Week 1–4 concepts that can justify design decisions in the brief and the report's rationale table. Grouped into five themes that may become rationale rows. The report has room for roughly 6–8 concepts done properly, so each theme names one **anchor** concept to lead with.

</aside>

**Decisions that shaped this list**

- Steering uses **chips plus a free-text box**: chips for common reasons, text for anything the chips don't cover
- It is a **feedback loop** (per song, over time), not a back-and-forth conversation
- The intelligence is **scoring**: a taste profile built from listening history, used to rank songs; feedback adjusts the profile
- An **LLM translator** only turns typed feedback into the same adjustments the chips make; scoring does the recommending
- QOC (HCI module) is used as a working method for building the rationale table, not cited as an IIS concept

---

## What kind of system

- ⭐ **Four properties** (Week 1, L2): senses, interprets under uncertainty, acts, closes the loop. Shows the recommender counts as an IIS; the feedback loop is the "closes the loop" property
- **Conceptual spine / where inference sits** (Week 1, L2): four inference points: building the profile from history, scoring a song for a playlist, the LLM reading typed feedback, updating the profile from feedback. Feeds the architecture diagram
- **Simplest system that solves the task** (Week 1, L2): justifies scoring over a trained model (no data to train on, two-day build) and keeping the LLM to one small job

---

## Steering and control

- ⭐ **Sense of agency / the thermostat problem** (Week 2, L6): a profile that changes with no visible cause breaks "I did that"; changes must show their cause
- **Automation vs control plane** (Week 1, L3): steering raises control without lowering automation
- **Reading frame** (Week 1, L1): initiative, inference, visibility, reversibility as a lens for judging the steering design
- **Hybrid pattern** (Week 3, L7): the screen holds the state, language carries the exception; justifies chips plus text
- **Recognition over recall** (Week 2, L5): chips show what can be said, instead of a blank box

---

## Showing why

- ⭐ **Explanation dosage** (Week 2, L5, Kulesza et al.): a music recommender study; show what was used, what wasn't, and how to change it
- **Reason on the song card** (Week 4, L11): a recommendation is a claim, so its reason is stored and shown; with scoring, the reason is literally how it was ranked
- **Ranking is never neutral** (Week 2, L6): people mostly take the top result, so order is a design decision
- **Fewer, best first** (Week 4, L11): choose how many songs to show on purpose

---

## Feedback loop and taste profile

- ⭐ **Amershi et al. guidelines, "when wrong" and "over time"** (Week 1, L3): the lecture's own music-recommender example (the borrowed afternoon): learn from feedback, update cautiously, granular feedback, global controls, notify about changes
- **Act, ask or wait** (Week 1, L3): when the profile updates silently and when it checks first
- **Do, confirm or never** (Week 4, L12): re-ranking just happens and is shown; profile updates are reported with undo; overwriting a saved playlist needs confirming
- **Inspectable, editable, forgettable** (Week 4, L10): the taste profile is memory about a person; includes stale memory (old history that is accurate but out of date)

---

## The LLM translator

- ⭐ **Grounding by display** (Week 3, L7): show how the typed reason was read ("Got it: less melancholy here") so it can be checked before it applies
- **Schema: shape, not truth** (Week 3, L9): the LLM's output is limited to a fixed set of adjustments; a valid answer can still be a wrong reading
- **The model only proposes** (Week 4, L12; Week 3, L8): code checks the adjustment is valid before anything changes
- **Decline** (Week 3, L7; Week 4, L11): say plainly when a request can't be handled, and when nothing fits instead of padding with weak matches

---

## Maybe (could join a theme if needed)

- **Expectation gulf** (Week 1, L3; Week 3, L7): a free-text box hints the system understands anything; signal its limits
- **Feedback timing** (Week 2, L4): respond within about a second after a steer
- **Chunking, about 4 items** (Week 2, L5): pairs with "fewer, best first"
- **Two gulfs** (Week 2, L6): a lens for the storyboards
- **Slips vs mistakes** (Week 2, L6): undo for an accidental "not right"
- **Non-determinism** (Week 3, L8): the same typed reason may be read differently each time
- **Signal detection** (Week 2, L4): where the "good enough match" cut-off sits

---

## Ruled out

- **Attention, multiple resources, perceptual limits, cry wolf, modality** (Week 2, L4): suit warnings and driving, not a playlist screen
- **Turn-taking, grounding across turns, Grice's maxims** (Week 3, L7): no back-and-forth conversation
- **Heuristics, automation bias** (Week 2, L6): low stakes for music
- **Context budget and position, RAG pipeline** (Week 4, L10–11): only matter for a large LLM context or document retrieval
- **Tools, connectors, MCP** (Week 4, L12): no external actions beyond the playlist itself
- **Definitions of intelligence** (Week 1, L1): background only

---

## Questions for the brief

- Does feedback on one playlist change the whole profile, or only that playlist? (links to the borrowed-afternoon example)
- Where does the data come from? Spotify's API may restrict song features for new apps; a public dataset plus a seeded listening history may be needed
- Fallback if the build runs short: keyword matching instead of the LLM translator, labelled as such
- How to show the feedback is being used: a before/after of the ranking with the change explained, labelled as simulated if needed