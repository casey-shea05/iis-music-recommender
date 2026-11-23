# Issue tracker: Jira

Issues and tickets for this repo live in Jira, accessed through the Atlassian MCP connector (not a CLI).

- Site: `casey-shea.atlassian.net` (cloudId `c4cd8566-8b65-4ea3-98e7-1cf605821cd0`)
- Project key: `IIS`
- Epics: `IIS-1` Discovery (done), `IIS-2` Refinement (done), `IIS-3` Build, `IIS-4` Test and iterate, `IIS-5` Write-up and submit.
- Most implementation tickets belong under `IIS-3` (Build) and `IIS-4` (Test and iterate). Set the parent epic when creating a ticket.
- Workflow statuses (all transitions are global, so any status can move to any other): `🌱 Backlog`, `🌷 Refinement`, `👩🏻‍💻 In Development`, `🔍 Testing`, `🚫 Blocked`, `✅ Done`. Status names include the emoji, so match them exactly.

## Conventions

- **Create an issue**: `createJiraIssue` with project `IIS`; set the epic as parent.
- **Read an issue**: `getJiraIssue` (with comments via `listJiraIssueComments`).
- **List/search**: `searchJiraIssuesUsingJql`, e.g. `project = IIS AND labels = needs-triage`.
- **Comment**: `addOrEditJiraIssueComment`.
- **Apply/remove labels**: `editJiraIssue` (Jira labels field).
- **Close**: `transitionJiraIssue` to `✅ Done` (transition id `31`), with a comment explaining why when it is `wontfix`.

Issue references like `IIS-12` mean the Jira key. This repo has no external PRs, so PRs are not a triage surface.

## When a skill says "publish to the issue tracker"

Create a Jira issue in project `IIS`.

## When a skill says "fetch the relevant ticket"

Run `getJiraIssue` for the key, including comments.
