# 004 — Phase 3C: Context Review Report First, Then Implementation

STATUS: READY

You are continuing the existing Smart CV Career Repositioning Agent project.

This is NOT a new project and NOT a request to redesign the architecture.
The previous implementation work is already accepted.

==================================================
EXACT RESUME POINT
==================================================

The last development point was Phase 3B.1 — the attempted REAL Base44
integration verification.

That verification failed because the available execution environment did not
have the required Base44 access/tools for real CRUD verification.

The decision was to DEFER that Base44 verification and continue development.

IMPORTANT:

DO NOT retry the real Base44 verification.
DO NOT attempt Base44 CRUD.
DO NOT troubleshoot Base44 access.
DO NOT spend time trying to make that verification work.

The deferred Base44 verification must remain deferred.

==================================================
PHASES 1–4: QUICK CODE CONTEXT ONLY
==================================================

Before implementing anything, quickly inspect the existing CODE from the
previous Career Repositioning stages (Phases 1, 2, 3A and 3B).

The purpose is ONLY to understand the existing architectural context:

- how the previous stages work,
- how data flows between them,
- which components are responsible for what,
- which entities/contracts already exist,
- how the Career Repositioning Agent connects to them,
- what has already been implemented,
- and what the next stage is expected to build on.

This is NOT a full repository audit.

Do NOT:
- reimplement previous phases,
- redesign previous phases,
- rerun their complete test suites unnecessarily,
- repeat the deferred Base44 verification,
- or spend significant time investigating unrelated code.

Use the existing code as the architectural context.

==================================================
FIRST DELIVERABLE — CONTEXT / ARCHITECTURE REPORT
==================================================

STOP BEFORE IMPLEMENTING PHASE 3C.

After the quick code review, create a report FIRST:

docs/agent-reports/YYYY-MM-DD-phase-3c-context-review.md

This report must explain what you understood from the existing implementation.

The report MUST include:

1. The current Career Repositioning architecture as implemented.
2. A concise explanation of what each previous stage contributes.
3. The data flow between the stages.
4. The relevant entities/data contracts and their roles.
5. The important existing protections and logic, including where applicable:
   - cvFingerprint
   - idempotency
   - sliding-window behavior
   - concurrency protection
   - Master CV integration
   - Tailored CV integration
6. What is already implemented and should NOT be rebuilt.
7. The exact point where development stopped.
8. The fact that real Base44 verification was attempted and deferred because
   the required tools/access were unavailable.
9. What you understand Phase 3C is intended to accomplish.
10. What you propose to implement in Phase 3C based on the existing project
    architecture and documentation.
11. What you explicitly will NOT touch.

The report must distinguish between:

- implemented code,
- code-level/mock verification,
- and deferred real Base44 verification.

Do NOT claim Base44 verification was completed.

==================================================
THEN — IMPLEMENT PHASE 3C
==================================================

ONLY AFTER the context report has been created, proceed with implementation.

Implement Phase 3C according to the existing project architecture and the
Phase 3C scope recovered from the repository.

Do not invent a new architecture.
Do not redesign the Career Repositioning Agent.
Do not rebuild previous phases.
Do not modify Job Tailor responsibilities.
Do not modify the CV itself as part of repositioning.
Do not duplicate existing entities.
Do not remove working functionality to make tests pass.

Preserve existing:

- professional capability/evidence architecture,
- CV version handling,
- Professional Profile logic,
- Professional Evidence logic,
- Professional Profile Run logic,
- cvFingerprint,
- idempotency,
- sliding-window behavior,
- concurrency protection,
- Master CV integration,
- Tailored CV integration.

Keep changes scoped to Phase 3C.

==================================================
TESTING
==================================================

Add/update appropriate code-level automated tests for Phase 3C.

Run the relevant tests, lint, and build where applicable.

Do NOT run or claim the deferred real Base44 verification.

==================================================
FINAL REPORT
==================================================

After implementation, create:

docs/agent-reports/YYYY-MM-DD-phase-3c-career-repositioning.md

The final report must contain:

1. Phase 3C objective.
2. Exact implementation performed.
3. Files changed.
4. Tests executed and results.
5. Build/lint results.
6. What was intentionally not changed.
7. What remains deferred.
8. Explicit confirmation that real Base44 verification was NOT repeated.
9. Final Phase 3C status.

Reports MUST ONLY be stored under:

docs/agent-reports/

Never create reports under:

prompts/

==================================================
COMPLETION
==================================================

Only after the Phase 3C implementation and final report are complete, change
this prompt from:

STATUS: READY

to:

STATUS: COMPLETED

If the context review cannot determine the intended Phase 3C scope safely,
do NOT invent requirements. Record the ambiguity in the context report and
stop before modifying application code.

==================================================
CORE OBJECTIVE
==================================================

Understand the existing code quickly.

REPORT WHAT YOU UNDERSTOOD FIRST.

Then implement Phase 3C.

Do NOT repeat the failed Base44 verification.
Do NOT restart previous phases.
Do NOT perform a broad architectural audit.
The goal is to continue the existing development, not start it again.
