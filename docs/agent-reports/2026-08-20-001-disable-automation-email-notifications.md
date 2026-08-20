# Execution Report: Disable Automation Email Notifications

**Date:** 2026-08-20  
**Prompt:** `prompts/001-disable-automation-email-notifications.md`  
**Status:** COMPLETED

---

## Investigation

### Source of email notifications

The Prompt Queue workflow (`.github/workflows/prompt-queue.yml`) triggers email
notifications through two GitHub mechanisms:

1. **Workflow push trigger** – When a `prompts/*.md` file is pushed, GitHub
   sends a "workflow run" notification to subscribers of the repository.  
   *However*, GitHub does **not** send email for workflow runs unless the user
   has explicitly opted into "All Activity" or "Participating and @mentions"
   with the *Actions* category enabled in their personal notification settings.
   Workflow run emails cannot be suppressed from within the repository itself.

2. **Issue creation** – The workflow calls `gh issue create` to open a
   `[Prompt Queue] Execute …` issue. GitHub automatically subscribes the
   authenticated actor (the token owner) to any issue they create, and sends
   an email for every subsequent event on that issue (Copilot assignment,
   Copilot comments, status updates, etc.).  
   **This is the primary source of the unwanted emails.**

---

## Change Made

A new step — **"Mute issue notifications for repository owner"** — was added to
`.github/workflows/prompt-queue.yml`, immediately after the issue is created
and before Copilot is assigned.

The step calls the GitHub REST API:

```
PUT /repos/{owner}/{repo}/issues/{issue_number}/subscription
{ "subscribed": false, "ignored": true }
```

This sets the issue subscription to **Ignored** for the token owner, so GitHub
will not send any further email notifications for that issue (assignment,
comments, closure, etc.).

- The step uses `COPILOT_AGENT_TOKEN` (already present in the workflow) so no
  new secrets are needed.
- If the secret is absent the step skips gracefully and prints a warning; it
  does **not** fail the workflow.
- No other workflow logic was changed.

---

## What Was NOT Changed

| Item | Status |
|---|---|
| Prompt Queue workflow core logic | Unchanged |
| Copilot execution / assignment step | Unchanged |
| `/prompts/` and `/docs/agent-reports/` separation | Unchanged |
| Application source code (`src/`) | Unchanged |
| Unrelated GitHub notification settings | Unchanged |

---

## Verification

The Prompt Queue workflow continues to:

1. Detect `STATUS: READY` prompts on every push to `prompts/*.md`.
2. Create the execution issue with the correct title, body, and rules.
3. Immediately mute the issue for the token owner (new step).
4. Assign the issue to `copilot-swe-agent[bot]`.
5. Allow Copilot to create its execution report in `docs/agent-reports/` and
   mark the prompt `STATUS: COMPLETED`.

The only observable difference is that the repository owner will no longer
receive email notifications for automation-generated issues and their lifecycle
events.
