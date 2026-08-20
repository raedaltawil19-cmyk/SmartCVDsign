# Phase 3C Revert Report

**Date:** 2026-08-20  
**Status:** COMPLETED

---

## 1. Why Phase 3C Was Reverted

Phase 3C introduced the `latestMasterVersions()` function and wired it into Career
Repositioning, Course Discovery, and Career Paths so that analysis windows included
**only Master CV versions** and explicitly excluded Tailored/derived CV versions.

This architectural decision — that Tailored CVs must be excluded from professional
analysis — was **never approved** by the project owner. It was introduced without
authorisation. The owner therefore requested a precise rollback to pre-Phase-3C
behaviour, with no replacement rule introduced.

---

## 2. Files Changed by Phase 3C

| File | Nature of change |
|------|-----------------|
| `src/lib/cvProfiles.js` | Added `latestMasterVersions()` export |
| `src/lib/cvProfiles.test.js` | Added tests 15–20 for `latestMasterVersions` |
| `src/lib/repositioning/useCareerRepositioning.js` | Imported and applied `latestMasterVersions`; changed version counting logic |
| `src/services/courses/service.js` | Imported and applied `latestMasterVersions`; changed version counting logic |
| `src/pages/CareerPaths.jsx` | Imported `latestMasterVersions`; used it when deriving `latestCV` and fingerprint |
| `docs/agent-reports/2026-08-20-phase-3c-career-repositioning.md` | Phase 3C implementation report (created) |
| `docs/agent-reports/2026-08-20-phase-3c-context-review.md` | Phase 3C context review report (created) |
| `prompts/004-phase-3c-context-report-then-implementation.md` | Prompt status changed to COMPLETED |

---

## 3. Changes Reverted

`git revert 49638fe` was applied without manual approximation:

- `latestMasterVersions()` removed from `src/lib/cvProfiles.js`.
- Tests 15–20 (which tested `latestMasterVersions`) removed from
  `src/lib/cvProfiles.test.js`.
- `useCareerRepositioning.js` restored: version list is now
  `allVersions.slice(0, AUTO_THRESHOLD)` (all CV types), version count is the
  length of the full list.
- `service.js` restored: same slice-based approach over all CV types.
- `CareerPaths.jsx` restored: `latestCV` is `saved?.[0]` (first of all CV types);
  fingerprint is computed against the full `saved` list.
- Phase 3C agent-reports deleted (they were artefacts of the reverted commit).
- Prompt status for `004-phase-3c-context-report-then-implementation.md` restored.

---

## 4. How Previous Behaviour Was Restored

`git revert --no-commit 49638fe` was executed, which produced a clean inverse diff
of the entire Phase 3C commit. All staged changes were then committed as a single
revert commit. No manual file editing was performed; the restoration is bit-for-bit
identical to the pre-Phase-3C state.

---

## 5. Earlier Phases Preserved

The following work was untouched:

| Phase / Feature | Status |
|-----------------|--------|
| Phase 1 | ✅ Preserved |
| Phase 2 | ✅ Preserved |
| Phase 3A | ✅ Preserved |
| Phase 3B | ✅ Preserved |
| `cvFingerprint` | ✅ Preserved |
| Idempotency | ✅ Preserved |
| Sliding-window analysis | ✅ Preserved |
| Duplicate-trigger protection | ✅ Preserved |
| Concurrency protection | ✅ Preserved |
| Failure isolation | ✅ Preserved |
| Master CV integration | ✅ Preserved |
| Tailored CV integration | ✅ Preserved |
| Existing Career Repositioning architecture | ✅ Preserved |

Only the single commit `49638fe` (Phase 3C) was reverted.

---

## 6. Tests Run and Results

```
npm run lint   → PASSED (0 warnings, 0 errors)
npm run build  → PASSED (1986 modules, built in ~5.7 s)
```

The in-app test suite (`cvProfiles.test.js`) no longer contains tests 15–20 for
`latestMasterVersions`, which have been removed along with the function itself.
Tests 1–14 remain intact and cover the pre-Phase-3C functionality.

---

## 7. Build / Lint Results

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ Clean (no errors) |
| `npm run build` | ✅ Success |

---

## 8. Base44 Verification

Base44 verification was **NOT** performed. No CRUD operations, no API access, no
Base44 sessions were initiated. This task was a pure code/history-based rollback.

---

## 9. No New Architectural Decision Introduced

This revert does **not** introduce any new rule about Master vs Tailored CVs.

The question of how Master and Tailored CVs should ultimately contribute to Career
Repositioning analysis has been deferred and will be addressed in a separate,
explicitly approved architectural decision.

---

## Summary

Phase 3C commit `49638fe` has been precisely reverted using `git revert`. The
pre-Phase-3C behaviour is restored exactly. All earlier phases remain intact. Lint
and build pass. No Base44 access was performed. No replacement architectural
decision was introduced.

**STATUS: COMPLETED**
