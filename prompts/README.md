# Prompt Queue

This directory is only for GitHub Copilot execution prompts.

## Rules

1. Store prompt files only in `/prompts/`.
2. Keep each prompt in its own Markdown file, for example `001-my-task.md`.
3. The first status line must be either `STATUS: READY` or `STATUS: COMPLETED`.
4. Adding or updating a READY prompt triggers the prompt queue workflow.
5. The workflow queues the earliest READY prompt and opens a Copilot task issue for it.
6. Copilot must save the execution report only in `/docs/agent-reports/`.
7. Copilot must update the finished prompt from `STATUS: READY` to `STATUS: COMPLETED`.
8. Reports are output only and must never be created, stored, or treated as prompts inside `/prompts/`.
9. The workflow requires a repository secret named `COPILOT_AGENT_TOKEN` so Actions can assign the task issue to GitHub Copilot.
