# 003 — Phase 3C: Career Repositioning Agent

STATUS: READY

## Mission
Continue the Smart CV Career Repositioning Agent implementation from the exact project state reached after Phase 3B and the deferred Phase 3B.1 real Base44 verification.

Do NOT restart Phase 1 or Phase 2. Do NOT perform the deferred real Base44 verification yet. The user explicitly chose to postpone that verification and continue development.

## Required context
Before changing code, inspect the repository history, existing Career Repositioning Agent implementation, Phase 3A/3B work, reports, PRs, tests, and current architecture. Treat the existing implementation and reports as the source of truth.

## Phase 3C objective
Implement the next planned phase of the Career Repositioning Agent exactly according to the project's existing design. Do not invent a new architecture or replace the existing agent.

The agent must ultimately transform the verified professional capability/evidence layer into defensible career repositioning opportunities, using evidence-backed reasoning rather than generic job-title suggestions.

## Rules
1. Preserve the existing separation between:
   - professional capability/evidence extraction,
   - CV version merge/compare,
   - career repositioning,
   - Job Tailor.
2. Do not modify the CV itself as part of repositioning.
3. Do not create or duplicate Base44 entities unless the existing Phase 3 design explicitly requires it.
4. Preserve idempotency, cvFingerprint logic, sliding-window behavior, and concurrency protections already implemented.
5. Do not remove existing functionality to make tests pass.
6. Keep changes scoped strictly to Phase 3C.
7. Add or update automated tests for every new behavior.
8. Run lint, build, and all relevant tests.
9. Do not claim real Base44 CRUD verification was completed; that verification remains deferred unless it is genuinely available in the execution environment.

## Deliverables
- Implement Phase 3C in the application/repository.
- Add/update tests.
- Add a detailed completion report under:
  docs/agent-reports/YYYY-MM-DD-phase-3c-career-repositioning.md
- The report must state:
  - exact files changed,
  - exact behavior implemented,
  - tests run and their results,
  - what remains deferred,
  - whether Phase 3C is complete.
- Only after the implementation and report are complete, change this prompt to:
  STATUS: COMPLETED

## Important
If the repository contains an explicit Phase 3C specification, follow it exactly. If the specification is missing or ambiguous, do NOT guess. Instead, inspect the previous Phase 3 reports/PR discussions and derive the intended scope from those project artifacts. If it still cannot be determined safely, stop and report the ambiguity rather than inventing requirements.
