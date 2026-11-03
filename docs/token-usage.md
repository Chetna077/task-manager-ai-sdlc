# Token usage and cost (CodeMie)

CodeMie has no hook mechanism like GitHub Copilot or Claude Code. Token usage is tracked with the
CodeMie analytics export, which records tokens, cost, tools and models per Claude Code session
that ran through `codemie-claude`. The raw exports stay out of git
(`docs/codemie/analytics/*.json`, generated 2026-10-23); this page is the committed summary.

## Sessions recorded

| Session | Purpose | Duration | Turns | Tool calls (ok / failed) | Total tokens | Cost (USD) |
|---|---|---|---|---|---|---|
| 4006a02e | Connectivity check ("hi") on `feature/tags-archive-pagination` | 2.3 min | 3 | 1 / 0 | 122,880 | 0.2259 |
| 86074835 | Jira and Confluence updates through the Atlassian MCP (comments, transitions, pages) | 190.4 min | 20 | 30 / 4 | 1,374,715 | 0.6096 |
| **Total** | | | 23 | 31 / 4 | **1,497,595** | **0.8355** |

Model for both sessions: `claude-sonnet-5-5`, provider `ai-run-sso`.

## Token breakdown

| Session | Input | Output | Cache read | Cache creation |
|---|---|---|---|---|
| 4006a02e | 8 | 604 | 70,843 | 51,425 |
| 86074835 | 52 | 11,010 | 1,304,011 | 59,642 |

Most tokens are cache reads, which are billed at a lower rate.

## What this shows

- The Atlassian MCP was used in session 86074835: `transitionJiraIssue` (10 calls, 4 failed),
  `addOrEditJiraIssueComment` (6), `createConfluenceContent` (2), `executeRead` (2),
  `getAccessibleAtlassianResources` (1).
- 4 of the 10 `transitionJiraIssue` calls failed (tool success rate 60%). The export does not record
  the cause or whether they were retried; the current Jira statuses are the source of truth.

## Limits

- The analytics cover only Claude Code sessions run through CodeMie. The eight CodeMie assistants'
  own chats and workflow runs are not in these two exports; their usage is visible in the CodeMie
  UI under each chat and workflow run.
- Costs are estimates (`costSource: native-estimate`, standard API token prices).
