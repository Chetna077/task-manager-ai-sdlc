# CodeMie assistants (one assistant per SDLC persona)

Updated 15 Oct 2026. The capstone needs a separate assistant for each persona, joined into one workflow, with a human review after every step. Earlier this project had one assistant (Business Analyst) and the other personas were only prompts inside the workflow. There are now 8 separate assistants in the CodeMie personal space.

| # | Demo-flow step | Assistant (CodeMie name) | Slug | Main job | Human review gate |
|---|---|---|---|---|---|
| 1 | Requirement Assistant | Business Analyst Assistant | business-analyst-assistant | Gap analysis, epics, stories from Jira | Human reviews stories |
| 2 | Plan | Implementation Plan Assistant | implementation-plan-assistant | Implementation plan and PR description | Human reviews plan |
| 3 | Design Assistant | Task Manager SDLC Solution Design Assistant | task-manager-sdlc-solution-design-assistant | Architecture, HLD, LLD, wireframes for Confluence | Human reviews design |
| 4 | Code Assistant | Task Manager SDLC Code Assistant | (generated) | Code and database scripts through Claude Code CLI, commits to git | Human reviews code |
| 5 | Code Review Assistant | SDLC PR Code Review Assistant | (generated) | Pull request review comments in git | Human reviews findings |
| 6 | Test Assistant | Task Manager SDLC Test Assistant | (generated) | Gherkin cases, Playwright scripts, execution report | Human reviews test report |
| 7 | Deployment Assistant | Local Node Deployment Assistant | (generated) | Build script, local deployment, health check | Human reviews deployment |
| 8 | Documentation Assistant | SDLC Documentation Sync Assistant | sdlc-documentation-sync-assistant | Confluence pages and README | Human reviews docs |

Every assistant ends its answer with a "Human Review Required" section and never changes Jira, Confluence or git without approval.

Workflow: "Capstone Project" (CodeMie, Workflows). It runs the personas in the order of the table above with a stop for the human after each step.

## Skills, MCP, orchestrator and token tracking (3 Nov 2026)

The four CodeMie features the capstone expects are all in place. They were configured on 3 Nov 2026 with Claude (Cowork) through the CodeMie API from a human-approved session; the owner reviews them in the CodeMie UI.

### Skills (all 8 assistants have one)

Skill source files are in `codemie-skills/` and are imported in the CodeMie Skills module.

| Assistant | Skill |
|---|---|
| Business Analyst Assistant | jira-story-writing |
| Implementation Plan Assistant | jira-story-writing |
| Task Manager SDLC Solution Design Assistant | confluence-doc-publishing |
| Task Manager SDLC Code Assistant | pr-code-review (self-review checklist before opening a PR) |
| SDLC PR Code Review Assistant | pr-code-review |
| Task Manager SDLC Test Assistant | gherkin-playwright-testing |
| Local Node Deployment Assistant | local-node-deployment |
| SDLC Documentation Sync Assistant | confluence-doc-publishing |

### MCP

- CodeMie: the Test assistant has the catalog server **Playwright MCP** (browser automation for the E2E tests). The other assistants use CodeMie toolkits (Git, Project Management for Jira and Confluence, Codebase Tools).
- Claude Code: `.mcp.json` registers the **Atlassian MCP** (`https://mcp.atlassian.com/v2/mcp`). Claude Code used it through `codemie-claude` to comment on and transition Jira issues and create Confluence content (see `docs/token-usage.md`). The CodeMie catalog has no Atlassian MCP server, so it is not attached to the CodeMie assistants.

### Orchestrator

- **Task Manager SDLC Orchestrator** is a CodeMie assistant with the 8 assistants above as sub-assistants. It delegates one phase at a time and stops for human approval after each phase.
- The workflow `docs/codemie-workflow.yaml` remains the pipeline with `interrupt_before: true` on every state; the orchestrator is the conversational entry point to the same assistants.
- CodeMie does not allow sub-assistants that themselves have sub-assistants, so the orchestrator is one level deep.

### Token tracking

CodeMie has no hook mechanism like Copilot or Claude Code. Token usage and cost come from the CodeMie analytics export and are summarised in `docs/token-usage.md`.
