---
Phase: Analysis (Human-in-the-Loop checkpoint #1)
Assistant: Business Analyst Assistant (CodeMie)
Source chat: https://codemie.lab.epam.com/chats/6bd71216-6ab4-48e7-b75f-ce51a8d03831
Date: 2026-09-22
---

# Human Review — Analysis Phase

The Business Analyst Assistant identified gaps in the baseline Task Manager app and
asked four scoping questions before generating the final epic/story/task breakdown.
Answers below are the human decision that unblocks the Plan and Design phases.

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Single-user or multi-user (needs login/ownership/assignment)? | **Single-user** | Keeps the demo focused on the SDLC/AI-orchestration process rather than auth complexity, per capstone guidance that app complexity is not the graded dimension. |
| 2 | Delete only, or Archive + Delete? | **Delete only** | Simpler data model and UI for a limited-scope demo app. |
| 3 | Which enhancements are in scope for this release? | **All three: (A) Edit/Delete/Reopen, (B) Due date/Priority/Status, (C) Search/Filter/Sort** | All three were already broken into stories by the BA Assistant; none are large enough to warrant deferral. |
| 4 | Target platform? | **Web** | Matches the available tooling (Express + browser) and is fastest to demo locally. |

**Approved by:** Chetna Deshwal
**Status:** ✅ Confirmed — BA Assistant may finalize backlog (see [jira/backlog.md](jira/backlog.md))
