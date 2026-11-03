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
