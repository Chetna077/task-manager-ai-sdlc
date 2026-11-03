# Token usage and cost

Source: CodeMie analytics export, two JSON files in `docs/codemie/analytics/` (generated 23 Oct 2026, range "all", agent `claude`, model `claude-sonnet-5-5`). The JSON files are local inputs and are not committed.

**CodeMie has no hooks, so token tracking comes from this analytics export.** There is no per-step token logging inside the assistants or the workflow. The numbers below are per Claude Code session (run through `codemie-claude`), not per SDLC assistant.

## Sessions

| Session | Title | Duration | Turns | Tool calls (ok / failed) | Total tokens | Cost (USD) |
|---|---|---|---|---|---|---|
| 4006a02e | hi | 2 min 21 s | 3 | 1 (1 / 0) | 122,880 | 0.2259 |
| 86074835 | dir .mcp.json / codemie-claude | 3 h 10 min (wall clock, includes idle time) | 20 | 34 (30 / 4) | 1,374,715 | 0.6096 |
| **Total** | | | **23** | **35 (31 / 4)** | **1,497,595** | **0.8355** |

Both sessions ran on branch `feature/tags-archive-pagination`. Cost is `native-estimate` at standard API token prices, not a billed amount.

## Token breakdown

| Type | Session 4006a02e | Session 86074835 | Total | Share |
|---|---|---|---|---|
| Input | 8 | 52 | 60 | 0.0% |
| Output | 604 | 11,010 | 11,614 | 0.8% |
| Cache read | 70,843 | 1,304,011 | 1,374,854 | 91.8% |
| Cache creation (1 h) | 51,425 | 59,642 | 111,067 | 7.4% |
| **Total** | 122,880 | 1,374,715 | 1,497,595 | 100% |

Cache reads are about 92% of tokens because each turn re-reads the growing conversation context. Cache-read cost was USD 0.0142 and 0.2608 (0.2750 together), about 33% of total cost.

## Atlassian MCP calls (session 86074835)

| Tool | Calls | Succeeded | Failed |
|---|---|---|---|
| `transitionJiraIssue` | 10 | 6 | 4 |
| `addOrEditJiraIssueComment` | 6 | 6 | 0 |
| `executeRead` | 2 | 2 | 0 |
| `createConfluenceContent` | 2 | 2 | 0 |
| `getAccessibleAtlassianResources` | 1 | 1 | 0 |
| **Total** | **21** | **17** | **4** |

All 4 failed tool calls in the export are `transitionJiraIssue`. The export does not record the error text. Session 4006a02e made no MCP calls (one PowerShell call).

## Limits

- The export is per session, so cost cannot be split by SDLC phase or assistant.
- `dispatchesComplete` is `false` for session 86074835, so sub-agent or command cost attribution may be incomplete. Root-session cost is reported as `0.6096` with `unlinkedCostUSD` 0.
- Only these two sessions are covered. Later work needs a new export.

## Human Review Required

- Confirm the two sessions are the full scope you want to report. Anything run after 23 Oct 2026 is not included.
- Check the 3 h 10 min duration. It is wall clock and includes idle time, so it is not working time.
- Decide whether estimated cost (standard API prices) is acceptable for the submission, or whether billed cost from CodeMie or LiteLLM is needed.
- Check the 4 failed `transitionJiraIssue` calls against the Jira board (SCRUM-9, 10, 11, 15) to confirm the intended status changes landed.
