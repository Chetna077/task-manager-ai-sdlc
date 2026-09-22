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

## Second review round (multi-angle, 5 reviewers)

Run after the app was demoed and manually verified. Findings below, most
severe first — all fixed and covered by new/updated tests.

6. **`frontend/public/index.html`/`app.js` — description field unreachable from the UI.**
   TM-101's acceptance criteria and `docs/confluence/FRD.md` FR-2 both
   require editing a task's description; the backend fully supported it but
   neither the add form nor the edit form exposed a description input.
   Added a description field to both. **Status:** ✅ Resolved — covered by
   `backend/test/api.test.js` ("persists a description edit") and a new
   Playwright spec ("edit a task description (TM-101)").

7. **`frontend/public/app.js` `isOverdue()` — timezone-inconsistent overdue flag.**
   Compared a UTC-parsed `due_date` against a locally-parsed "today", so
   tasks due "today" could show as overdue for several hours depending on
   the browser's UTC offset. Fixed by comparing plain `YYYY-MM-DD` strings
   instead of mixed `Date` objects. **Status:** ✅ Resolved.

8. **`backend/src/db.js` — search didn't escape SQL `LIKE` wildcards.**
   A `%` or `_` in a search term was treated as a wildcard instead of a
   literal character, returning wrong results. Fixed by escaping both
   characters and adding `ESCAPE '\\'` to the clause. **Status:** ✅
   Resolved — covered by a new unit test with a title containing `%`.

9. **`backend/src/server.js` — a repeated query key crashed `GET /api/tasks`.**
   `?status=a&status=b` makes Express parse `status` as an array, which
   `node:sqlite` rejects as a bind parameter. Fixed by normalizing query
   params to their first value before passing them to `listTasks`.
   **Status:** ✅ Resolved — covered by a new API test.

10. **`backend/src/server.js` — non-validation errors were swallowed with no logging.**
    `POST`/`PUT` caught every error and returned a bare 500 without ever
    logging it, and bypassed the already-defined generic error middleware
    (making it dead code). Fixed by routing unexpected errors through
    `next(err)` to the one shared handler, which now logs via
    `console.error`. **Status:** ✅ Resolved.

11. **`backend/src/validation.js` — `due_date` accepted any `Date`-parseable string.**
    `isValidIsoDate` accepted values like `"2024"` that aren't `YYYY-MM-DD`,
    which an `<input type="date">` then silently rejects on re-render,
    risking an accidental due-date wipe on the next edit. Tightened to
    require the strict format. **Status:** ✅ Resolved.

12. **`frontend/public/app.js` — un-debounced search could show stale results.**
    Every keystroke fired an independent fetch with no sequencing, so a
    slower response for an earlier keystroke could overwrite a newer one.
    Fixed with a request-sequence counter that drops stale responses.
    **Status:** ✅ Resolved.

13. **`backend/src/db.js` — priority sort order duplicated the `PRIORITIES` enum.**
    The severity mapping (high=3/medium=2/low=1) was a hardcoded SQL
    string, independent of `validation.js`'s `PRIORITIES` array — a future
    added priority tier would silently sort as lowest severity. Fixed by
    deriving the `CASE` expression from `PRIORITIES` itself.
    **Status:** ✅ Resolved.

14. **`frontend/public/app.js` — Cancel button reused the Edit button's CSS class.**
    Both buttons shared `.btn-edit`, a latent selector-collision risk for
    future tests/styles. Gave Cancel its own `.btn-cancel` class.
    **Status:** ✅ Resolved.

15. **Dead code — unused `STATUS_LABELS` map; no-op branching in `openDb()`.**
    `STATUS_LABELS` was defined but never read; the UI had no visible
    status text for "In Progress". Wired it into the row template instead
    of deleting it. `openDb()`'s `isNew`/`else` branches ran identical
    code — simplified to one unconditional path. **Status:** ✅ Resolved.
