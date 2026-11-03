# Test and build report - release 1.1.0

Branch: feature/tags-archive-pagination

## Code changes (Claude Code CLI via CodeMie)
| Commit | Stories | Change |
|---|---|---|
| 5d1d2a4 | SCRUM-12, SCRUM-13 | Tags on tasks: create/edit, list display, tag filter |
| 23ce351 | SCRUM-7, SCRUM-8 | Archive and restore instead of hard delete, archived view |
| 7355906 | SCRUM-14 | Pagination on GET /api/tasks with search, filter and sort |
| 06d93ce | SCRUM-16 | Inline validation, keyboard operation, error retry |

## Test results
| Suite | Tool | Result |
|---|---|---|
| Backend unit and API | node:test | 56 passed, 0 failed |
| End-to-end | Playwright | 15 passed, 0 failed, 0 skipped (tests/reports/junit.xml) |

Gherkin scenarios are in tests/features/. The HTML report is in tests/reports/html/.

## Build
Script: scripts/build.ps1
Artefact: dist/task-manager-build-v1.1.0.zip (15 files)

## Local deployment
Extract the artefact, run npm install --prefix backend, then npm start. The app serves on http://localhost:3000 (see docs/deployment.md).
