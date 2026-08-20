# Prompt Queue Rebuild Report

## Summary

- Removed the previous prompt queue sample and the old validation-only workflow.
- Rebuilt the repository structure around a dedicated `/prompts/` queue and `/docs/agent-reports/` output directory.
- Added a new GitHub Actions workflow that queues the earliest READY prompt, opens a Copilot execution issue, and assigns that issue to GitHub Copilot with `COPILOT_AGENT_TOKEN`.

## Files Changed

- `.github/workflows/prompt-queue.yml`
- `prompts/README.md`
- `docs/agent-reports/README.md`

## Behavior

- New or updated prompt files in `/prompts/` trigger the workflow.
- The workflow never scans `/docs/agent-reports/`, so reports are kept separate from prompts.
- The created issue tells Copilot to write the execution report only into `/docs/agent-reports/` and to mark the prompt `COMPLETED` after finishing.

## Validation

- Workflow YAML parsed successfully with Ruby.
- `npm run lint` passed.
- `npm run build` passed.
