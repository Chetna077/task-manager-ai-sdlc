---
Phase: Development → Code Review
Reviewer: Code Review Assistant (CodeMie), human-reviewed
---

# Code Review — Task Manager Enhancements

Review of the `backend/` and `frontend/` changes implementing TM-101…TM-109.

## Comments

1. **`backend/src/db.js` — sort-by-priority was alphabetical, not severity-based.**
   `ORDER BY priority` sorted `high < low < medium` alphabetically, which is
   wrong for a user picking "sort by priority". Fixed with a `CASE`
   expression mapping high/medium/low to 3/2/1 before the initial commit
   landed. Covered by the "sorts by priority severity" unit test in
   `backend/test/db.test.js`.
   **Status:** ✅ Resolved.

2. **`backend/src/db.js` — SQL injection risk via `sortBy`.**
   `sortBy`/`sortDir` come from user-controlled query params. Resolved by
   whitelisting via the `SORT_COLUMNS` map and a strict `asc`/`desc` check
   rather than interpolating the raw query value into the `ORDER BY` clause.
   **Status:** ✅ Resolved (present from first commit).

3. **`frontend/public/app.js` — confirm delete before calling the API.**
   TM-102's acceptance criteria requires a confirmation step; implemented via
   `window.confirm` in `deleteTask`. Acceptable for this scope; a future
   iteration could replace it with a non-blocking modal for testability.
   **Status:** ✅ Resolved, noted as a follow-up for a nicer UX.

4. **`backend/src/server.js` — error handler ordering.**
   Confirmed the generic error-handling middleware is registered after all
   routes (Express requires this to catch thrown errors). No change needed.
   **Status:** ✅ No action.

5. **Test coverage gap — reopen from `done` via the API layer.**
   Unit tests covered `db.setStatus` reopen; added an API-level test
   (`PATCH /api/tasks/:id/status`) exercising `done -> todo` end-to-end so
   the HTTP contract is covered, not just the repository.
   **Status:** ✅ Resolved.
