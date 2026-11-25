# IIS Music Recommender

A university Interactive Intelligent Systems project: a music recommender where users answer a track's explanation with their own reason for rejecting it, and that reason shapes later recommendations.

## Repo structure

Before adding or moving a file in `src/`, or importing across its folders, read "Layout" in `docs/adr/0001-technical-spike.md`. It says where components, hooks and logic go, and which folders may use Spotify or React.

Outside `src/`:

- `docs/PRD.md`: the design brief, covering requirements, known limitations and the rationale table.
- `submissions/`: what gets handed in besides the code.
  - `literature-review/`: the literature review and its research logs. `research-papers/` inside it is gitignored.
  - `report/`: the report, with `storyboards/` (and the Gemini prompts that made them), `screenshots/` of the built UI (`raw/` holds the captures, `flows/` the report's flow strips built from them by `build.py` and `render.sh`), and `diagram/` (the system and spine diagrams: each `.html` is the source, the `.png` goes in the report).
- `scripts/`: the catalogue script (`npm run catalogue`). It writes `data/catalogue.json`, which is committed so the app runs without keys (rerunning the script replaces it with the runner's own data): only `src/main.tsx` imports it, and tests use `makeTrack` from `src/testFixtures.tsx`.

## UI verification

To view and interact with the running app, use the Claude in Chrome tools (`mcp__claude-in-chrome__*`, deferred: load them with one `ToolSearch` call). Use Google Chrome, not Dia: the extension connects in Dia, but its tab calls (`tabs_context_mcp`, `navigate`) time out.

1. Start the dev server in the background: `npm run dev -- --host 127.0.0.1` (serves `http://127.0.0.1:5173/`).
2. Run `open -a "Google Chrome" http://127.0.0.1:5173/`, then `list_connected_browsers`. If two browsers are listed and the session is on the wrong one, `select_browser` the newer connection (the one that appeared after Chrome opened) and retry `tabs_context_mcp` with `createIfEmpty: true`. If the dev server's port is already in use, one is already running: reuse it.
3. Drive the page with `browser_batch` (navigate, click, screenshot, `read_console_messages`).
4. When done, close the tab with `tabs_close_mcp` and stop the dev server.

## Agent skills

### Issue tracker

Issues live in Jira (project `IIS`, site `casey-shea.atlassian.net`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.
