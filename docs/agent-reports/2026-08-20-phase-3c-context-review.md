# Phase 3C — Context Review Report

**Date:** 2026-08-20  
**Report path:** `docs/agent-reports/2026-08-20-phase-3c-context-review.md`  
**Purpose:** Architecture context review before Phase 3C implementation proceeds.

---

## 1. Current Career Repositioning Architecture

The Career Repositioning system is a multi-stage pipeline built as a sequence of
cooperating, responsibility-separated modules rather than one monolithic agent.

```
SavedCV versions (master-only)
        │
        ▼
useCareerRepositioning (trigger/orchestration hook)
        │  builds cvFingerprint, checks idempotency, runs sliding-window cap
        ▼
session.js → Base44 career_repositioning_agent (background agent)
        │  sends structured REPOSITIONING_INPUT block
        ▼
contract.js → parseRepositioningResult / isUsefulResult
        │  fail-closed: only fully-valid structured output is accepted
        ▼
RepositioningAnalysis entity (Base44)
        │  status: running → ready | no_results | failed
        ▼
Notification entity (only when result is "useful")
        ▼
CareerPaths.jsx (read-only display)
        │  CareerPathCard · OpportunityCard
        ▼
OpportunityCard → Job Tailor (separate system, no CV write from repositioning)
```

**Key principle:** Career Repositioning never modifies the CV. The `openTailor`
bridge in `CareerPaths.jsx` navigates to `JobTailorDialog` which is an
independent system.

---

## 2. What Previous Stages Already Implemented

### Phase 1 — Foundation
- CV Builder with multiple templates (Stockholm, Nordic Minimal, Executive,
  TechPro, CreativeEdge).
- Master/Tailored CV type separation (`cvProfiles.js`): `cvTypeOf`, `isMaster`,
  `isTailored`, `baseCandidates`, `rankBaseCVs`, `pickBestBaseCV`,
  `buildTailoredPayload`, `createTailoredCV`.
- Fast Matching engine (`jobMatcher.js`) for local, LLM-free job scoring.
- CV save-target logic (`cvSaveTarget.js`) — determines whether to update
  master or create tailored.
- Professional review agent (`cv_review_coach`) with evidence pack layer
  (`reviewEvidence.js`), authority selection (`authoritySelection.js`), and
  recommendation parser (`cvReviewParser.js`).

### Phase 2 — Job Tailor + Smart Assistant
- `JobTailorDialog` + `useTailorRecommendations` — dedicated tailoring system.
- `SmartCVAssistantPanel` (`useCVReview`) — in-builder review with streaming.
- `tailorBridge.js` — routes Job Tailor output through the same review-intent
  pipeline without duplicating it.
- `tailoringSession.js` / `tailoredLookup.js` — tailored CV navigation.
- Language guard (`cvLanguageGuard.js`): values written to a Swedish CV must be
  Swedish; fail-closed.

### Phase 3A — Career Repositioning Data Layer
- `src/lib/repositioning/contract.js`:
  - `repositioningFingerprint()` — deterministic hash of `approvedCvId +
    version count + stable-sorted version content`.
  - `extractResultBlock()` / `parseRepositioningResult()` — fail-closed
    structured output parser (OPEN/CLOSE markers, strict schema validation).
  - `isUsefulResult()` — `ready + useful + (paths > 0 || opportunities > 0)`.
- `src/lib/repositioning/session.js`:
  - `createRepositioningConversation()` / `sendRepositioningInput()` — agent
    communication layer.
  - `locationFromCV()` — extracts address from `data.kontakt.adress`.

### Phase 3B — Career Repositioning Orchestration
- `src/lib/repositioning/useCareerRepositioning.js`:
  - Sliding-window cap: `AUTO_THRESHOLD = 20`; analyzes all versions up to 20,
    then the latest 20 if more exist.
  - Idempotency: fingerprint checked against existing `RepositioningAnalysis`
    records before creating a new one.
  - Concurrency protection: `runningRef.current` boolean gate.
  - Duplicate-trigger protection: auto runs blocked if a `auto_20_versions`
    record already exists for this fingerprint.
  - Failure isolation: all errors update the `RepositioningAnalysis` record
    status to `"failed"` without crashing the caller.
  - Timeout: 180 s hard timeout with status `"failed"`.
  - Polling: exponential-interval polling array in addition to subscription.
  - `approve()` (alias for auto trigger) + `runManual()`.
- `src/pages/CareerPaths.jsx` — read-only results display page.
- `src/components/repositioning/CareerPathCard.jsx` + `OpportunityCard.jsx`.
- `src/services/courses/service.js` — `CourseDiscoveryRun` with the same
  `repositioningFingerprint` + idempotency pattern.

### Phase 3B.1 — Real Base44 Verification (DEFERRED)
A real Base44 CRUD verification was attempted. It could **not** be completed
because the execution environment did not have the required Base44
tools/access. The verification was **intentionally deferred**. It was NOT
completed and must NOT be claimed as completed.

---

## 3. How the Stages Connect

```
Builder (approve CV)
  └─► useCareerRepositioning.run("manual"|"auto_20_versions")
          └─► base44.entities.SavedCV.list  ← currently lists ALL versions
                                              (master + tailored — BUG in Phase 3B)
          └─► repositioningFingerprint(versions)
          └─► RepositioningAnalysis.create { status: "running" }
          └─► career_repositioning_agent conversation
          └─► RepositioningAnalysis.update { status: "ready", result }
          └─► Notification.create (if useful)
CareerPaths.jsx
  └─► RepositioningAnalysis.list → display CareerPathCard / OpportunityCard
  └─► OpportunityCard.onTailor → navigate to Builder → JobTailorDialog
```

---

## 4. Important Data Flow

| Step | What moves | From → To |
|---|---|---|
| CV save/approve | cvId, SavedCV record | Builder → useCareerRepositioning |
| Version window | up to 20 SavedCV records | SavedCV entity → repositioningFingerprint |
| Fingerprint | deterministic hash string | contract.js → RepositioningAnalysis |
| Agent input | JSON block with cvVersions | session.sendRepositioningInput → agent |
| Agent output | JSON block in assistant message | agent → contract.parseRepositioningResult |
| Stored result | parsed result object | contract → RepositioningAnalysis.result |
| Notification | title + message + targetId | RepositioningAnalysis → Notification entity |
| Display | result.paths, result.opportunities | RepositioningAnalysis → CareerPaths.jsx |
| Tailoring bridge | job object | CareerPaths.jsx → Builder route state → JobTailorDialog |

---

## 5. Entities / Data Contracts and Responsibilities

| Entity / Module | Responsibility |
|---|---|
| `SavedCV` | All CV versions (master + tailored) |
| `RepositioningAnalysis` | One analysis run; fields: cvId, cvFingerprint, status, result, trigger, pathCount, jobCount |
| `Notification` | User notification after a useful result |
| `CourseDiscoveryRun` | Idempotency record for course discovery (same fingerprint pattern) |
| `RecommendedCourse` | Discovered course records |
| `contract.js` | Parse and validate agent output; cvFingerprint |
| `session.js` | Agent communication (create conversation, send input) |
| `useCareerRepositioning.js` | Trigger logic, idempotency, concurrency, polling, failure isolation |
| `cvProfiles.js` | Master/tailored separation, fast matching, tailored payload builder |

---

## 6. Existing Protections

### cvFingerprint
`repositioningFingerprint({ approvedCvId, versions })` — deterministic hash
combining:
- `approvedCvId` (the CV being analyzed)
- Number of versions in the window
- Stable-sorted `id:updated_date:stableStringify(data)` for each version

Any version content change or count change produces a new fingerprint, which
forces a fresh analysis.

### Idempotency
Before creating a new `RepositioningAnalysis`, the hook filters existing
records by `cvFingerprint`. If a `"running"` or `"ready"` (for auto trigger)
record already exists, the run is skipped with a `skipped: true` response.

### Sliding-Window Analysis
`AUTO_THRESHOLD = 20`. With ≤ 20 versions, all are analyzed. With > 20,
only the latest 20 are used. This is a **cap**, not a gate — 1 version is
enough to trigger analysis.

### Concurrency Protection
`runningRef.current` boolean prevents a second parallel invocation of `run()`
within the same hook instance.

### Failure Isolation
All errors inside `run()` are caught; the `RepositioningAnalysis` record
status is set to `"failed"` with the error message. The hook returns
`{ ok: false, error }` rather than throwing.

---

## 7. Current State of the Career Repositioning Agent

The agent is functionally complete from trigger through result storage and
notification. The `CareerPaths.jsx` page reads the latest `RepositioningAnalysis`
and renders paths and opportunities.

**Known issue (Phase 3C target):** The version window used for fingerprinting
and for the agent input currently includes **all** `SavedCV` records — both
master and tailored — without filtering. Career repositioning should analyze
only **master CV versions** (drafts and tailored CVs are excluded), since
tailored CVs are derived artifacts and should not dilute the professional
profile analysis.

---

## 8. Exact Point Where Development Stopped

Development stopped at the end of Phase 3B.1. The orchestration hook
`useCareerRepositioning.js` was implemented. The real Base44 verification
(Phase 3B.1) was attempted and intentionally deferred.

The function `latestMasterVersions()` is referenced in project memory as the
next planned addition to `cvProfiles.js` — it does not yet exist in the
codebase. This is the central Phase 3C deliverable.

---

## 9. Base44 Verification Status

The real Base44 CRUD verification (Phase 3B.1) was attempted. It **could not
be completed** because the execution environment lacked the required Base44
tools/access. The verification was **intentionally deferred** and remains
deferred. It is NOT claimed as completed. Phase 3C does not repeat it.

---

## 10. What Phase 3C Is Supposed to Accomplish

Phase 3C closes the master-only analysis window gap:

> **Career repositioning analysis windows must include only master CV
> versions. Tailored CVs are excluded from professional capability analysis.**

This ensures:
- The fingerprint is stable across tailoring activity (creating a tailored CV
  for a job application no longer triggers a new repositioning analysis).
- The agent receives only canonical professional evidence, not derived tailored
  artifacts.
- Course discovery follows the same master-only window policy.

---

## 11. What Needs to Be Implemented in Phase 3C

1. **`latestMasterVersions(cvList, max = 20)`** in `src/lib/cvProfiles.js`:  
   Accepts a full `SavedCV` list, filters to master-only using `isMaster()`,
   and caps the result at `max` latest records.

2. **Update `src/lib/repositioning/useCareerRepositioning.js`**:  
   Replace the raw `allVersions.slice(0, AUTO_THRESHOLD)` with
   `latestMasterVersions(allVersions)`.

3. **Update `src/services/courses/service.js`**:  
   Replace the raw `allVersions.slice(0, 20)` with
   `latestMasterVersions(allVersions)`.

4. **Update `src/pages/CareerPaths.jsx`**:  
   Set `latestCV` from the first master version rather than `saved?.[0]`.

5. **Tests** for `latestMasterVersions()` in `src/lib/cvProfiles.test.js`.

---

## 12. What Will NOT Be Modified

- `src/lib/repositioning/contract.js` — fingerprint, parser, and result
  validation logic are correct as-is.
- `src/lib/repositioning/session.js` — agent communication is correct.
- `src/components/repositioning/CareerPathCard.jsx` — UI is correct.
- `src/components/repositioning/OpportunityCard.jsx` — UI is correct.
- `src/lib/agent/*` — professional review/evidence layer is not part of
  Phase 3C.
- `src/components/tailor/*` / `JobTailorDialog` — Job Tailor is a separate
  system.
- `src/lib/cvProfiles.js` existing exports — all existing exports remain
  unchanged; `latestMasterVersions` is a pure addition.
- Any Base44 entity schema — no new entities are created.
- The real Base44 verification — it remains deferred.
- Prompt automation workflow — out of scope.

---

**Conclusion:** The existing implementation is architecturally sound. Phase 3C
adds one pure function (`latestMasterVersions`) and applies it in three
places to enforce the master-only analysis window policy. No existing
behavior is removed or weakened.
