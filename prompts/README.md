# SmartCVDsign Agent Prompts

This directory is the controlled queue of instructions for the coding agent.

## Rules

1. A new prompt file is created with a sequential number and a clear phase name.
2. `STATUS: READY` means the prompt is approved for execution.
3. `STATUS: COMPLETED` means the agent has finished it and produced its report.
4. The agent must execute only the next READY prompt and must not jump ahead.
5. Before execution, read `AGENT_REPORT.md` and the latest report under `docs/agent-reports/`.
6. After execution, update the prompt status to `COMPLETED` and write the complete report to both `AGENT_REPORT.md` and `docs/agent-reports/`.
7. If the task is blocked, ambiguous, unsafe, or conflicts with existing architecture, stop and report instead of guessing.
8. Never modify protected agents, contracts, or workflows unless the prompt explicitly authorizes it.

## Automation

The repository workflow watches this directory for new or changed READY prompts and validates the queue. Actual execution by a coding agent requires an agent runner with repository write permission; GitHub Actions alone does not automatically invoke a Copilot coding-agent session merely because a file was added.
