# Demo Flow

Mirrors the capstone statement's Demo Flow, with each AI-Assistant step paired
with its human-in-the-loop review artifact.

| Step | AI Assistant | Tooling | Output | Human review |
|---|---|---|---|---|
| 1. Gaps/enhancements identified | Business Analyst Assistant | CodeMie, Jira | [jira/gap-analysis.md](jira/gap-analysis.md) | Confirmed baseline gaps are accurate |
| 2. Stories generated | Requirement Assistant | CodeMie | [jira/backlog.md](jira/backlog.md) | [human-review-log.md](human-review-log.md) — scope Q&A answered |
| 3. Plan generated / PR created | Plan Assistant | CodeMie, Git | [plan.md](plan.md), PR for this repo | Plan reviewed before coding started |
| 4. Architecture/design created | Design Assistant | Confluence | [confluence/architecture.md](confluence/architecture.md), [confluence/high-level-design.md](confluence/high-level-design.md), [confluence/low-level-design.md](confluence/low-level-design.md), [confluence/wireframes.md](confluence/wireframes.md) | Design reviewed before implementation |
| 5. Code written/committed | Code Assistant | Claude Code CLI, Git | `backend/`, `frontend/`, commit history | Reviewed in [code-review.md](code-review.md) |
| 6. Code reviewed | Code Review Assistant | CodeMie, Git | [code-review.md](code-review.md) | Comments addressed before merge |
| 7. Code validated | Test Assistant | Playwright, Gherkin | `tests/features/`, `tests/e2e/`, `tests/reports/` | Test results reviewed before deploy |
| 8. Deployed | Deployment Assistant | Local deployment | `dist/task-manager-build.zip`, running instance | Verified locally before sign-off |
| 9. Docs updated | Documentation Assistant | Confluence | This `docs/` tree, [../README.md](../README.md) | Final doc pass |

## Status

All nine steps above are represented in this repository's commit history —
each phase lands as its own commit(s) so the SDLC progression is inspectable
with `git log`.
