# Pull Request Review - PR #2 (tags, archive/restore, pagination, accessibility)

Reviewed: backend/src/server.js, db.js, validation.js, db/migrations, frontend/public/app.js, tests.
Prepared with Claude Sonnet 5.5; the final decision is the human reviewer's.

## Summary
Clean, well-scoped change. Queries are parameterized, sort columns are allowlisted, user text is rendered with textContent, and new inputs are validated. Test coverage is good for the new paths.

**Recommendation: Approve with Comments**

## Findings
| Severity | Area | Finding | Suggested fix |
|---|---|---|---|
| Medium | API compatibility | GET /api/tasks now returns { items, total, page, pageSize, totalPages } instead of a bare array. Existing clients will break. | Document it in the README and release notes, or version the endpoint (/api/v2/tasks). |
| Medium | Performance | Tags are stored as comma-separated text and filtered with instr(','||tags||','), which cannot use an index and scans the table. Fine for this size. | For larger data, move to tags and task_tags tables (as in the design) with indexes. |
| Low | API semantics | DELETE /api/tasks/:id now archives and returns 204. Callers expecting a hard delete will be surprised. | Mark DELETE deprecated in the docs and prefer POST /archive. |
| Low | Business rules | PATCH /status does not visibly reject status changes on archived tasks. | Return 409 for archived tasks, or add a test that documents the intended behaviour. |
| Low | Input handling | Path ids use Number(req.params.id) with no explicit integer check. Invalid ids end in 404, which is safe but not explicit. | Validate ids and return 400 for non-integers. |
| Low | Performance | LIMIT/OFFSET gets slower on very deep pages. | Acceptable now; consider keyset pagination if the dataset grows. |
| Info | Hardening | No rate limiting or security headers (helmet); no authentication (known limitation). | Out of scope here; track as a follow-up. |

## Positive observations
- Parameterized SQL everywhere; ORDER BY built from an allowlist; LIKE input escaped.
- Count query and page query share one WHERE/ORDER BY with an id tiebreak, so pages are stable.
- Invalid page and pageSize return 400 instead of silently returning another page.
- Migrations apply automatically to existing databases and have a test.
- Accessibility: inline validation with aria attributes, focus management, aria-live announcements, Retry on network errors.
- Build script now fails when tests fail.

## Tests
56 backend and 15 Playwright tests pass. Suggested additions: a test for status change on an archived task, and one for a non-integer task id.

## Final decision
Approve with Comments
