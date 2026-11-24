# IIS Music Recommender

A university Interactive Intelligent Systems project: a music recommender where users answer a track's explanation with their own reason for rejecting it, and that reason shapes later recommendations.

## UI verification

To view and interact with the running app, use the Claude in Chrome tools (`mcp__claude-in-chrome__*`, deferred: load them with one `ToolSearch` call). The user's browser is Dia.

1. Start the dev server in the background: `npm run dev -- --host 127.0.0.1` (serves `http://127.0.0.1:5173/`).
2. If `tabs_context_mcp` fails with "No window", run `open -a Dia http://127.0.0.1:5173/` to give Dia a window, then retry with `createIfEmpty: true`.
3. Drive the page with `browser_batch` (navigate, click, screenshot, `read_console_messages`).
4. When done, close the tab with `tabs_close_mcp` and stop the dev server.

## Agent skills

### Issue tracker

Issues live in Jira (project `IIS`, site `casey-shea.atlassian.net`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.
