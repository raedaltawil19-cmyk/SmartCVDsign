# Smart CV — Architecture Report (Completed Baseline)

Date: 2026-08-19  
Mode: Read-only architectural consolidation report

This report consolidates the current Smart CV architecture baseline into a complete reference for product structure, workflow boundaries, data responsibilities, security posture, and implementation gaps.  
It is a documentation artifact only and does not change runtime behavior.

## 1) Architecture overview

- **Design source of truth:** Google Stitch for approved visual/UX direction.
- **Implementation platform:** Base44 for frontend/backend integration, entities, agents, functions, AI orchestration, persistence, and integrations.
- **Product model:** Smart Career Workspace (connected workflows), not a set of isolated tools.
- **Primary workspace model:** Suitable Jobs / CV Canvas / CV Tools context.
- **Primary CV tools:** CV Review Coach, Job Tailor.
- **Secondary CV tools:** AI Assistant, Skill Gap, LinkedIn Import, Inbox, CV Versions.

## 2) System boundaries and responsibilities

### Frontend (React + Vite)
- Hosts Builder and workspace surfaces.
- Renders templates and CV editing experiences.
- Coordinates user-driven workflow transitions (review, tailor, apply, share).

### Base44 backend layer
- Persists user entities and workflow records.
- Runs agent/function workflows for analysis and recommendations.
- Enforces data ownership boundaries (RLS on user-owned data).

### Public-sharing surface
- Supports public SharedCV access for explicit share links.
- Must remain snapshot-oriented and privacy-constrained.

## 3) Canonical workflow rules

- ATS analysis belongs inside **Job Tailor**.
- Skill Gap belongs inside **Job Tailor / career context**.
- Salary Intelligence belongs inside **Suitable Jobs / results**.
- Interview Assistant belongs **after** invitation/application context.
- Course Discovery belongs in career profile/recommendations/notifications context.
- Inbox and Notifications remain separate surfaces and entities.
- Master CV and Tailored CV must remain separate logical artifacts.
- Master CV Agent lifecycle is: **Understand -> Execute -> Validate -> Report**.

## 4) Data model baseline (verified)

Existing entities and domain objects:
- SavedCV
- JobApplication
- AgentCommand
- InboxMessage
- Notification
- RecommendedCourse
- User

Current model/feature state:
- Five CV templates exist: Stockholm, Executive, Tech Pro, Creative Edge, Nordic Minimal.
- References are represented in both CV model and templates.
- Dynamic arbitrary custom sections are not implemented.
- Courses/notifications services exist and are connected to backend workflows.

## 5) Workflow implementation baseline (verified)

- CV Review Coach and Job Tailor backend workflows exist.
- JobTech search/location functions exist.
- Applications tracking exists.
- AI Assistant exists, but persistence/minimize/restore behavior is not yet final-approved.
- Legacy independent CV tool modals still conflict with contextual workflow architecture.
- Duplicate/legacy Tailor and Agent routes still exist.
- Notification Center and final Share architecture are not yet complete.
- Direct CV inline edit path is currently not active in Builder preview mode.

## 6) Security and platform posture

- RLS exists on core user-owned entities.
- Public fetch logic includes SSRF protections; public-function exposure and rate limiting still require full review.
- Editable CV content reaches `dangerouslySetInnerHTML`, requiring continued sanitization verification before production.

## 7) Quality and verification baseline

- ESLint passed in audit.
- TypeScript reported significant existing errors.
- Build verification was previously blocked in one audit pass by a Base44 sandbox HTTP 500 condition.
- Architectural acceptance must be based on verified behavior, not implementation claims alone.

## 8) Architecture gaps that remain open

1. Master/Tailored CV separation is not fully enforced in persisted workflow behavior.
2. Legacy/duplicate tooling surfaces still violate approved information architecture.
3. Notification Center and final Share experience remain incomplete.
4. AI Assistant session-state UX is not yet at final target behavior.
5. Security hardening review is still needed for public-function exposure/rate controls.

## 9) Change-control and implementation guardrails

Future changes must follow:
**INSPECT -> TRACE -> REPORT -> APPROVE -> IMPLEMENT -> VERIFY -> REPORT**

Guardrails:
- Do not treat an "Implemented" claim as verified until live behavior is checked.
- Do not casually rewrite CV data, templates, rendering, Master CV Agent validation, JobTech integration, application persistence, authentication, or stable workflows.
- Do not treat this report as authorization to change everything at once; each finding must be handled as a separate approved, minimal-scope change.
