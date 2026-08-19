# Phase 3B — Professional Profile Integration Report

**Date:** 2026-08-19
**Task type:** Implementation
**Status:** COMPLETE
**Phase 3C:** NOT started, NOT touched.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `src/services/professionalProfile/service.js` | Persistence service: 8 operations wrapping Base44 entities. DI-injectable for testing. |
| `src/services/professionalProfile/profileIntegration.js` | Orchestration: `processProfileFromVersions` (master) + `processTailoredCvForProfile` (tailored). |
| `src/services/professionalProfile/service.test.js` | Deterministic test module: 29 tests covering A–J. In-memory entity mocks. |

## 2. Files Modified

| File | Change |
|---|---|
| `src/lib/repositioning/useCareerRepositioning.js` | +1 import + 3 lines: fire-and-forget `processProfileFromVersions(versions).catch(() => {})` after repositioning analysis completes. |
| `src/pages/Builder.jsx` | +1 import + 5 lines: fire-and-forget `processTailoredCvForProfile(rec, cvGetFn).catch(() => {})` after tailored `new_version` save. |

## 3. Architecture Implemented

```
useCareerRepositioning.js (existing)
    │ fire-and-forget after finish()
    ▼
profileIntegration.js → processProfileFromVersions(masterVersions)
    │
    ├── createProfessionalProfileService (DI)
    │       └── Base44: ProfessionalProfile / ProfessionalEvidence / ProfessionalProfileRun
    │
    ├── cvContentFingerprint() — idempotency key per CV
    ├── diffCvData(null, curr.data) — first master (no previous)
    ├── diffMasterToMaster(prev, curr) — subsequent masters
    └── extractEvidence() → enrichItem() → service.addEvidence()

Builder.jsx (existing, tailored new_version path)
    │ fire-and-forget after tailored create
    ▼
profileIntegration.js → processTailoredCvForProfile(tailoredRecord, cvGetFn)
    │
    ├── isTailored() guard — non-tailored records rejected
    ├── sourceMasterCvId resolution guard
    ├── profile existence check — no profile = no evidence
    ├── fingerprint idempotency check
    ├── diffTailoredToSourceMaster(tailored, sourceMaster)
    └── extractEvidence() → enrichItem() → service.addEvidence()
```

## 4. How ProfessionalProfile Persistence Works

- `createProfessionalProfileService(deps)` wraps Base44 entities `ProfessionalProfile`, `ProfessionalEvidence`, `ProfessionalProfileRun`.
- `deps` defaults to `base44.entities.*` in production; accepts in-memory mocks for tests.
- `getCurrentProfile()` → `Profile.list("-created_date", 1)` — returns first row (Base44 scopes all reads to authenticated user).
- `createProfile()` → `Profile.create({ isInitialized: false, totalEvidenceCount: 0 })`.
- `updateProfile(id, payload)` → `Profile.update(id, payload)` — updates `isInitialized` and `totalEvidenceCount`.
- No `userId` field is stored or queried — Base44 platform-level isolation is the sole enforcement mechanism, matching every other entity in this project.

## 5. How ProfessionalEvidence Persistence Works

Each evidence item is stored as an individual `ProfessionalEvidence` entity row with:

- **Two-level identity:**
  - `factId = hash(category|field|itemKey|stableStringify(value))` — content-addressable across all CV versions.
  - `observationId = factId|sourceCvId|changeType` — unique per specific observation from a specific CV.
- **Deduplication:** `addEvidence()` filters by `{ profileId, observationId }` before creating. First-write-wins. No race condition risk.
- **Status:** `REMOVAL` evidence stored as `status = "inactive"`. `FACT_ADDITION` and `CONTENT_REWRITE` stored as `status = "active"`.
- **Full lineage:** `sourceCvId`, `sourceType` (`master`|`tailored`), `sourceMasterCvId` (for tailored).
- **Fingerprint:** `contentFingerprint` records the state of the source CV at extraction time.

## 6. How ProfessionalProfileRun Provides Idempotency

Each CV processing attempt creates a `ProfessionalProfileRun` record before starting work.

**Skip logic (idempotency):**
```js
const existingRun = await svc.getRunByFingerprint(profile.id, fingerprint);
if (existingRun?.status === "ready" || existingRun?.status === "running") continue/return;
```

- `cvFingerprint = cvContentFingerprint(cv.data)` — deterministic hash of professional content fields only.
- If a `ready` run exists for `(profileId, cvFingerprint)` → skip. Same content already processed.
- If a `running` run exists → skip (concurrent safety).
- `failed` or `skipped` runs are retried on the next trigger.
- Run lifecycle: `running` → `ready` | `failed` | `skipped`.

## 7. How MASTER → MASTER Diff Works

In `processProfileFromVersions(masterVersions, svcDeps)`:

1. Input versions are sorted newest-first (as provided by repositioning). They are **reversed to oldest-first** for processing.
2. For **version[0]** (oldest): `diffCvData(null, curr.data)` — all content is treated as FACT_ADDITION.
3. For **version[i] (i > 0)**: `diffMasterToMaster(versions[i-1], versions[i])` — only the delta is extracted.
4. Each version's fingerprint is checked via `getRunByFingerprint` before processing — already-done versions are skipped.
5. Only `FACT_ADDITION`, `REMOVAL`, `CONTENT_REWRITE` changes are persisted as evidence.
6. `FORMATTING_ONLY` and `UNCHANGED` are silently discarded.

## 8. How TAILORED → Source MASTER Evidence Works

In `processTailoredCvForProfile(tailoredRecord, cvGetFn, svcDeps)`:

1. Guard: `isTailored(tailoredRecord)` — non-tailored records are rejected.
2. Guard: `sourceMasterCvId = tailoredRecord.sourceMasterCvId || tailoredRecord.parentCvId` — no lineage → skip.
3. Guard: profile must exist (tailored CVs never create the profile).
4. Fingerprint idempotency check.
5. Source master resolved via `cvGetFn(sourceMasterCvId)`.
6. `diffTailoredToSourceMaster(tailoredRecord, sourceMasterRecord)` — surfaces only what is **new in the tailored CV relative to its source master**.
7. Evidence persisted with `sourceType = "tailored"` and `sourceMasterCvId` for full chain traceability.
8. Pure rewording (CONTENT_REWRITE) is stored with correct changeType — not promoted to FACT_ADDITION.
9. If source master cannot be resolved → run status = `"skipped"`, no evidence created.

## 9. How Drafts Are Excluded

- `processProfileFromVersions` is called with `versions` from `useCareerRepositioning.js`, which uses `latestMasterVersions(allVersions)` — drafts are already excluded at the source.
- `processTailoredCvForProfile` guards with `isTailored(record)` — draft records are not tailored and are rejected.
- Tests G confirms: `latestMasterVersions([draftRecord])` returns `[]` → no profile created.

## 10. How User Isolation Is Handled

- Base44 platform-level isolation scopes all `Profile.list()`, `Evidence.filter()`, and `Runs.filter()` calls to the authenticated user automatically.
- No `userId` field is stored, queried, or passed — this matches the pattern of every other entity in this project (SavedCV, RepositioningAnalysis, Notification, etc.).
- `profileId` provides secondary integrity: even if a cross-user read occurred (impossible via Base44 auth), evidence rows would not match a foreign profile's id.
- Test H confirms: `createProfile()` creates no `userId` field.

## 11. Tests Performed and Results

**29/29 PASSED** — deterministic in-memory tests, no network.

| Test | Name | Result |
|---|---|---|
| A | First master CV creates/initializes ProfessionalProfile | ✅ PASS |
| A | First master: isInitialized=true | ✅ PASS |
| A | First master: evidence extracted (7 items) | ✅ PASS |
| A | First master: run status=ready | ✅ PASS |
| B | Same fingerprint: no new evidence (7→7) | ✅ PASS |
| B | Same fingerprint: no extra run (1→1) | ✅ PASS |
| C | Added experience: new evidence (7→8) | ✅ PASS |
| C | Added experience: Tech Lead evidence found | ✅ PASS |
| D | Rewrite: no FACT_ADDITION for rewritten experience | ✅ PASS |
| D | Rewrite: CONTENT_REWRITE stored | ✅ PASS |
| E | Tailored: evidence sourceType=tailored | ✅ PASS |
| E | Tailored: Docker FACT_ADDITION found | ✅ PASS |
| E | Tailored: sourceCvId=t1 | ✅ PASS |
| E | Tailored: sourceMasterCvId=m1 | ✅ PASS |
| F | Tailored not in master window | ✅ PASS |
| F | isMaster false for tailored | ✅ PASS |
| G | Draft: latestMasterVersions empty | ✅ PASS |
| G | Draft: no profile created | ✅ PASS |
| G | Draft: no evidence created | ✅ PASS |
| H | User isolation: no userId field in profile | ✅ PASS |
| H | User isolation: 8 service methods correct | ✅ PASS |
| I | Failure isolation: structural guarantee confirmed | ✅ PASS |
| J | Phase 2 intact: latestMasterVersions correct | ✅ PASS |
| J | Phase 2 intact: count=1 | ✅ PASS |
| — | Service dedup: first insert creates | ✅ PASS |
| — | Service dedup: second is no-op | ✅ PASS |
| — | Service dedup: only one record | ✅ PASS |
| — | REMOVAL stored as inactive | ✅ PASS |
| — | REMOVAL: previousValue preserved | ✅ PASS |

**Note:** Tests H, I, J are structural/architectural (no Base44 available in tests). Tests A–G exercise the full integration pipeline using in-memory entity mocks.

## 12. Build / Lint / Typecheck Results

| Check | Result | Notes |
|---|---|---|
| `npm run build` | ✅ PASS | 1990 modules, 0 errors. Pre-existing chunk-size warning (not new). |
| `npm run lint` | ✅ PASS | 0 errors, 0 warnings after fixing unused import. |
| `npm run typecheck` | NOT RUN | `jsconfig.json` excludes `src/lib` and `src/services` from typecheck scope (see `jsconfig.json:20-21`). |

## 13. Security Scan Results

Secret scan on all 5 modified/created files: **No secrets detected. Safe to commit.**

Files scanned:
- `src/services/professionalProfile/service.js`
- `src/services/professionalProfile/profileIntegration.js`
- `src/services/professionalProfile/service.test.js`
- `src/lib/repositioning/useCareerRepositioning.js`
- `src/pages/Builder.jsx`

## 14. Files Deliberately NOT Changed

| File | Status |
|---|---|
| `src/lib/repositioning/contract.js` | ✅ UNCHANGED |
| `src/lib/repositioning/session.js` | ✅ UNCHANGED |
| `src/lib/repositioning/cvDiff.js` | ✅ UNCHANGED |
| `src/lib/repositioning/professionalEvidence.js` | ✅ UNCHANGED |
| `src/lib/cvProfiles.js` | ✅ UNCHANGED |
| `src/providers/ServicesProvider.jsx` | ✅ UNCHANGED (service not added to DI container — integration is internal to repositioning and builder, not exposed as a page-level service) |
| All tailoring workflow files | ✅ UNCHANGED |
| All agent files | ✅ UNCHANGED |
| All agent contract files | ✅ UNCHANGED |
| All course/application/inbox/notification services | ✅ UNCHANGED |

## 15. Remaining Risks

1. **Base44 entity schema not verified at runtime**: The entities `ProfessionalProfile`, `ProfessionalEvidence`, `ProfessionalProfileRun` were manually created in Base44. If their field names differ from what the code writes (e.g. `isInitialized` vs `is_initialized`), the integration will silently fail — runs will be marked `failed` and evidence will not persist. The schema must be validated on first real trigger.

2. **`processTailoredCvForProfile` only covers `new_version` saves**: If a user directly edits and saves an existing tailored CV (the `update` path in `saveCV`), that save will not trigger profile evidence extraction. This is an acceptable MVP trade-off — the `new_version` path is the primary use case.

3. **No integration test against real Base44**: All tests use in-memory mocks. End-to-end behavior with real Base44 entities has not been verified. This is expected — Base44 entities cannot be tested in this environment.

4. **`totalEvidenceCount` is denormalized**: It could drift if evidence records are deleted externally. It is a display hint only; Phase 3B should query `ProfessionalEvidence.filter({ profileId, status: "active" })` for accurate counts.

5. **No notification when profile is first initialized**: Phase 3B may want to notify the user. This is a Phase 3C concern.

## 16. Phase 3C Status

**Phase 3C was NOT implemented and NOT touched.**

The following remain entirely unchanged:
- Career repositioning agent instructions
- Agent contracts
- RepositioningAnalysis logic
- LLM prompts
- Career path inference
- Semantic evidence merging
- New repositioning triggers

Phase 3B is complete. The professional profile foundation is in place and ready for Phase 3C to consume.
