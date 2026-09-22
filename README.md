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

## Scope

Single-user, delete-only (no archive), web-only. All three enhancement
groups from the BA Assistant's backlog are in scope: Edit/Delete/Reopen,
Due date/Priority/Status, Search/Filter/Sort. See
[docs/human-review-log.md](docs/human-review-log.md) for the human decisions
behind this scope.
