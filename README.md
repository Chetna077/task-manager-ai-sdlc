# Task Manager — AI-Assistant-Driven SDLC Capstone

Capstone project: an existing, deliberately limited Task Manager app is
analyzed, planned, designed, built, tested, and deployed through an
AI-assisted SDLC with a human-in-the-loop checkpoint at every phase. See
[docs/demo-flow.md](docs/demo-flow.md) for the full phase-by-phase mapping to
the CodeMie BA Assistant chat this project started from.

## Quick start

```powershell
npm install --prefix backend
npm start --prefix backend
```

Open http://localhost:3000.

## Live artifacts

| Artifact | Where |
|---|---|
| Source + git history | https://github.com/Chetna077/task-manager-ai-sdlc |
| Confluence (FRD, Architecture & Design, Wireframes) | https://chetnadeshwal24.atlassian.net/wiki/spaces/TMC/overview |
| Jira (Epic TM-EPIC-001 + backlog) | https://chetnadeshwal24.atlassian.net/browse/SCRUM-5 |

## Run tests

```powershell
npm test --prefix backend        # unit + API tests (node:test)
npm install                       # installs @playwright/test at repo root
npx playwright install chromium
npm run test:e2e                  # Playwright E2E, auto-starts the app
```

Reports land in `tests/reports/` (HTML + JUnit XML).

## Build a deployable artifact

```powershell
.\scripts\build.ps1
```

## Project layout

```
backend/        Express + node:sqlite REST API
frontend/       Static HTML/CSS/vanilla JS UI
tests/features/ Gherkin scenarios (business-readable spec)
tests/e2e/      Playwright specs automating those scenarios
tests/reports/  Test execution output
scripts/        Build script
docs/jira/      Epic/story/task backlog (Jira-export-style)
docs/confluence/ FRD, architecture, HLD, LLD, wireframes
docs/plan.md, docs/demo-flow.md, docs/code-review.md, docs/deployment.md
```

## Capstone deliverable → artifact map

| Deliverable | Where |
|---|---|
| Analysis (gaps, epics/stories/tasks) | [docs/jira/gap-analysis.md](docs/jira/gap-analysis.md), [docs/jira/backlog.md](docs/jira/backlog.md) |
| Plan | [docs/plan.md](docs/plan.md) |
| Design (architecture/HLD/LLD/wireframes) | [docs/confluence/](docs/confluence/) |
| Development (code + DB scripts, committed) | `backend/`, `frontend/`, `backend/db/schema.sql`, git history |
| Code review | [docs/code-review.md](docs/code-review.md) |
| Documentation | this file + `docs/confluence/`, committed with the code |
| Build (scripts + artifact) | [scripts/build.ps1](scripts/build.ps1), `dist/*.zip` |
| Testing (Gherkin + automated + report) | `tests/features/`, `tests/e2e/`, `tests/reports/` |
| Deployment (local) | [docs/deployment.md](docs/deployment.md) |
| Human-in-the-loop record | [docs/human-review-log.md](docs/human-review-log.md) |

## Features and API

| Feature | Jira | Endpoint / behaviour |
|---|---|---|
| Tags | SCRUM-12, SCRUM-13 | `tags` (array) on POST/PUT; `GET /api/tasks?tag=work` filters by exact tag. Tags are trimmed, lowercased, de-duplicated; max 10 per task, 30 chars each. Click a tag chip in the UI to filter. |
| Archive / restore | SCRUM-7, SCRUM-8 | `POST /api/tasks/:id/archive`, `POST /api/tasks/:id/restore`, `GET /api/tasks?archived=true` (default list excludes archived). `DELETE /api/tasks/:id` is kept as an alias of archive — **nothing hard-deletes rows any more**. UI: Archive button + "Show archived" toggle with Restore. |

Databases created before a column existed are upgraded automatically on start
by `backend/db/migrations/*.sql` (see `openDb()`); no manual step needed.

## Scope

Single-user, web-only; tasks are archived (restorable), never hard-deleted. All three enhancement
groups from the BA Assistant's backlog are in scope: Edit/Delete/Reopen,
Due date/Priority/Status, Search/Filter/Sort. See
[docs/human-review-log.md](docs/human-review-log.md) for the human decisions
behind this scope.
