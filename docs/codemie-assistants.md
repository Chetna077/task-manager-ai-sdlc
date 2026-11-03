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

## Skills, MCP and orchestration

### Skills (all 8 assistants)

Each assistant has one CodeMie skill attached.

| Assistant | Skill |
|---|---|
| Business Analyst Assistant | jira-story-writing |
| Implementation Plan Assistant | jira-story-writing |
| Task Manager SDLC Solution Design Assistant | confluence-doc-publishing |
| SDLC Documentation Sync Assistant | confluence-doc-publishing |
| Task Manager SDLC Code Assistant | pr-code-review |
| SDLC PR Code Review Assistant | pr-code-review |
| Task Manager SDLC Test Assistant | gherkin-playwright-testing |
| Local Node Deployment Assistant | local-node-deployment |

### MCP

- **Playwright MCP** is attached to the Test assistant, so it can drive the browser when it runs the Gherkin and Playwright cases.
- **Atlassian MCP** is configured in `.mcp.json` (`https://mcp.atlassian.com/v2/mcp`) for Claude Code. It is used for Jira and Confluence reads and writes from the CLI sessions. It is not set in `.mcp.json` for the CodeMie assistants themselves.

### Orchestrator

The **Task Manager SDLC Orchestrator** assistant has the 8 assistants above as sub-assistants. It calls them in the order of the table at the top of this page. After each phase it stops and waits for human approval before it starts the next one.

## Human Review Required

- Confirm in CodeMie that each skill is attached to the assistant listed above (the skill-to-assistant mapping here comes from your brief, not from a file in this repo).
- Confirm the Orchestrator exists with the exact name "Task Manager SDLC Orchestrator" and that all 8 sub-assistants are linked. This repo has no export of it, and `docs/codemie-workflow.yaml` still describes the "Capstone Project" workflow.
- Confirm the Playwright MCP is enabled on the Test assistant.
- Decide whether the older "Workflow: Capstone Project" line at the top should stay next to the Orchestrator or be marked as replaced.
