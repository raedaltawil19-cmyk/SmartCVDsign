# Smart CV repair plan — 2026-08-19

## Stage 1 — Trigger policy
- Keep automatic analysis threshold-based: no repositioning/course discovery on every save, print, or page hide.
- Automatic repositioning becomes eligible only when the user's saved-CV count reaches 20.
- After the threshold has been processed, do not run again automatically merely because another save/print/session end occurs.
- Add an explicit user action to discover career paths.
- Page visibility alone must never be treated as a session-end analysis trigger.

## Stage 2 — Notifications and result navigation
- Career-path notifications must navigate to /career-paths.
- Notification targetType must be handled centrally and consistently.
- Email delivery remains a separate completion step and must use the app's configured transactional email provider, not Base44's registered-user-only email action.

## Stage 3 — Job workflow
- Career opportunity cards must pass the full opportunity payload into Job Tailor, not only the title.
- Job Tailor must create a separate tailored CV version and persist its relationship to the source CV and job application.
- Suitable Jobs must be able to create/save a JobApplication so the workflow can continue into application tracking.

## Stage 4 — Persistence and engineering integrity
- SavedCV must persist cvType, parentCvId and jobApplicationId.
- RepositioningAnalysis must be idempotent by CV fingerprint and protected against concurrent duplicate runs.
- CV fingerprint should be content-based.
- Replace the current page-hide trigger with explicit lifecycle events only.
- Preserve RLS and public SharedCV privacy boundaries.
- Add real automated tests for these four critical workflows before calling the system production-ready.

## Clarification
"More expensive/heavier" means the repositioning workflow performs significantly more work than a simple local UI action: it can inspect multiple saved CV versions, parse/reason over the professional profile, search/verify titles and job opportunities, calculate matches, and persist a structured result. Therefore it should not be launched repeatedly on every minor Builder event.
