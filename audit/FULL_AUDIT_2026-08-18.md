# Smart CV — Full Engineering / Workflow Audit

Date: 2026-08-18

## Scope

Read-only inspection of architecture, workflow, React code, Base44 entities/agents/functions, persistence boundaries, security, responsive structure, export/print path, and available test assets. Followed by build/lint/audit/typecheck, Vitest discovery/execution, and HTTP smoke checks.

## Verification results

- ESLint: PASS
- Vite production build: PASS
- npm audit --omit=dev --audit-level=high: PASS — 0 vulnerabilities
- Typecheck: FAIL — many existing errors across templates, UI components, agent helpers, services and Builder.
- Vitest: FAIL — 17 test files failed. Most files are browser-console scripts without `describe/test/it`, so Vitest reports `No test suite found`. One cvEditContentTool test file also throws during module execution. The project therefore does NOT currently have a functioning automated regression-test suite.
- HTTP smoke: existing Vite server responded 200 for `/`, `/builder`, `/applications`, `/dashboard`, `/courses`, `/share/nonexistent-token`, and `/template-advisor`. A separate fresh server could not start on the attempted second port, so this is a server smoke check, not a browser E2E test.

## Critical findings

### P0 — Job Tailor does not actually create a Tailored CV

`application_tailor` is read-only by design and `JobTailorDialog` only sends selected recommendations to Smart CV Assistant. The Builder path does not call `startTailoringSession()` or `createTailoredCV()`.

Result: the intended workflow `Job → Analyze → Match → Tailored CV` is incomplete. The current implementation can modify the currently open CV through the Assistant instead of creating a separate tailored copy.

### P0 — SavedCV schema does not persist CV version relationships

The `SavedCV` entity schema has no `cvType`, `parentCvId`, or `jobApplicationId` fields. Yet `cvProfiles.js`, `tailoringSession.js`, `CVRelationBar`, and Builder expect these fields.

Result: the Master/Tailored architecture is implemented in pure JS helpers but not in the actual Base44 persistence model.

### P1 — Real automated tests are not wired into the project

There is no `test` script in package.json. The `.test.js` files are mostly manual browser-console runners. Running `npx vitest run` caused 17/17 suites to fail because Vitest found no test suites. This means the green build does not imply workflow correctness.

### P1 — Typecheck is substantially broken

`npm run typecheck` exits non-zero with many errors, including errors in the Agent action layer, CV templates, EvidenceDialog, Builder, CVSideToolbar, app-params, services, and UI primitives. This should be treated as a real engineering defect, not a cosmetic warning.

### P1 — Builder Share had a real runtime defect

Builder called `base44.entities.SharedCV.create(...)` without importing `base44`. Typecheck caught `Cannot find name 'base44'`; ESLint/build did not. This has now been fixed by adding the missing import.

### P1 — SharedCV could expose owner email through a public entity

`SharedCV` has public entity-level read access. It previously stored `createdByEmail`. The public SharedCV page does not need this field. The Builder no longer writes it, and a field-level read restriction has been added for the legacy field.

### P1 — CV Tools architecture still contains legacy/duplicate tools

`CVSideToolbar` still exposes Job Match, Improve, Template Picker and an additional-tools menu. This conflicts with the approved architecture where Job Tailor owns ATS/skill-gap/tailoring capabilities, Suitable Jobs owns job discovery/salary intelligence, and Templates lives in the Header. `CVTools` also displays a tooltip promising ATS, salary, interviews and more although its current menu only exposes language/tone/LinkedIn.

### P1 — Suitable Jobs is not connected to Application Tracking

`SuitableJobsPanel` searches/ranks/shows salary and opens the external job ad, but it does not create a `JobApplication`. `MyApplications` only supports manual addition in the visible workflow. The job → application tracking transition is therefore missing.

## Important workflow observations

- CV Review Coach is correctly read-only and produces REVIEW_INTENT rather than writing the CV.
- Application Tailor is correctly read-only and does not write SavedCV directly.
- Smart CV Assistant is the execution point for CV content/layout changes.
- Job Tailor → Assistant bridge is implemented for recommendation execution, but this bridge currently edits the active CV rather than producing the separate tailored version required by the Master/Tailored architecture.
- Notification and Inbox are separate entities and services.
- RecommendedCourse and Notification have user-scoped RLS.
- SavedCV has correct owner-scoped CRUD RLS.
- SharedCV intentionally has public read for public links; this must remain limited to share snapshots and must not expose owner-only fields.
- Dynamic Sections are intentionally excluded from this audit plan as requested.

## Security observations

- CV HTML is sanitized through DOMPurify.
- Public fetch utilities contain protocol checks, private-host rejection, redirect validation, response-size limits and no URL credentials.
- ResearchPublicSource has explicit candidate/person query guards.
- npm audit currently reports 0 vulnerabilities after the React Router update.
- Public SharedCV is intentionally readable without authentication; this is a product feature, not a defect, but it requires strict snapshot/privacy boundaries.

## Print

The print path was changed to an isolated print document to remove application chrome and avoid the previous Safari blank-page problem. Browser-owned print headers/footers remain outside JavaScript control. Browser-level Safari/Chrome pagination cannot be truthfully marked PASS from the sandbox tests performed here; it still requires real browser interaction.

## Recommended repair order

1. Implement actual Tailored CV creation in the UI workflow using `createTailoredCV/startTailoringSession` and persist `cvType`, `parentCvId`, `jobApplicationId`.
2. Extend SavedCV schema with those versioning fields while preserving existing RLS.
3. Connect Suitable Jobs → Save/Apply → JobApplication and make the application state available to the later interview workflow.
4. Remove/disable legacy CVSideToolbar tools that violate the approved information architecture; keep only the approved contextual capabilities.
5. Convert the current console-runner test scripts into real Vitest suites and add a proper `npm test` script.
6. Fix typecheck errors, prioritizing Builder, agent action execution, templates, and persistence services.
7. Add browser E2E tests for the critical flows: create CV, save, reload, share, Review Coach, Job Tailor, Tailored CV creation, Assistant execution, application tracking, mobile layout, Safari/Chrome print.
8. Re-run the full audit after the above changes.

## Audit conclusion

The project builds and passes lint/security dependency checks, but it is NOT yet safe to label the workflow production-ready. The biggest architectural gap is the difference between the designed Master/Tailored model and the actual persisted Job Tailor flow. The second major gap is the absence of a real automated test suite. These two issues should be resolved before further visual polishing.
