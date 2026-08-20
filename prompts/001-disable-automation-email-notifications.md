STATUS: READY

# Disable automation email notifications

The Prompt Queue workflow is working and must remain unchanged in its core behavior.

Task:
Stop unnecessary email notifications caused by this prompt/Copilot automation.

I do NOT want email notifications for:
- a new prompt being received;
- a prompt being queued;
- a GitHub Issue being created or updated for a prompt;
- Copilot receiving or starting a task;
- Copilot finishing a task;
- a report being created;
- a prompt being marked COMPLETED;
- successful or normal workflow runs.

Requirements:
1. First inspect the repository/workflow configuration and identify exactly what is generating these emails.
2. Disable/suppress only the unnecessary automation-related email notifications.
3. Do NOT disable the Prompt Queue workflow.
4. Do NOT disable Copilot execution.
5. Do NOT change the separation between `/prompts/` and `/docs/agent-reports/`.
6. Do NOT move, delete, or rename prompt/report folders.
7. Do NOT modify application code.
8. Do not change unrelated GitHub notification behavior.
9. Make the smallest safe change necessary.
10. Verify that the Prompt Queue still detects READY prompts, creates the execution issue, assigns it to Copilot, and allows the report to be created normally.
11. Save the execution report only in `/docs/agent-reports/`.
12. When finished, change this prompt status from `STATUS: READY` to `STATUS: COMPLETED`.
