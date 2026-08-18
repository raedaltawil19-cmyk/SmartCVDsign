# Smart CV — Technical Audit Baseline

Date: 2026-08-18
Mode: Read-only audit completed before implementation.

This file records the current architecture baseline and is a project reference. It does not itself change runtime behavior.

## Architecture
- Google Stitch: approved visual/UX source.
- Base44: production implementation, backend, database, agents, AI, functions, rendering, persistence and integrations.
- Product model: Smart Career Workspace, not a collection of unrelated tools.
- Main workspace: Suitable Jobs / CV / CV Tools.
- Primary CV Tools: CV Review Coach, Job Tailor.
- Secondary CV Tools: AI Assistant, Skill Gap, LinkedIn Import, Inbox, CV Versions.

## Core workflow rules
- ATS belongs inside Job Tailor.
- Skill Gap belongs inside Job Tailor/career context.
- Salary Intelligence belongs inside Suitable Jobs/results.
- Interview Assistant belongs after an interview invitation/application context.
- Course Discovery belongs in career profile/recommended courses/notifications.
- Inbox and Notifications remain separate.
- Master CV and Tailored CV remain separate.
- Master CV Agent follows Understand -> Execute -> Validate -> Report.

## Verified implementation baseline
- SavedCV, JobApplication, AgentCommand, InboxMessage, Notification, RecommendedCourse and User entities exist.
- Five CV templates exist: Stockholm, Executive, Tech Pro, Creative Edge, Nordic Minimal.
- References are represented in the CV model and templates.
- Dynamic arbitrary custom sections are not implemented.
- CV Review Coach and Job Tailor backend workflows exist.
- JobTech search/location functions exist.
- Applications tracking exists.
- Courses and Notifications backend services exist.
- AI Assistant exists but session persistence/minimize/restore is not yet at final approved behavior.
- Legacy independent CV tool modals remain and conflict with the approved contextual workflow architecture.
- Duplicate/legacy Tailor and Agent routes remain.
- Notification Center and final Share architecture are not yet complete.
- Direct CV inline edit path is not currently active in Builder preview mode.
- RLS exists on core user-owned entities.
- Public fetch logic includes SSRF protections, but public function exposure/rate limiting needs review.
- Editable CV content currently reaches dangerouslySetInnerHTML and needs sanitization review before production.
- ESLint passed in audit; TypeScript reported errors; build could not be verified because the Base44 sandbox returned HTTP 500.

## Working rule
Future changes must follow:
INSPECT -> TRACE -> REPORT -> APPROVE -> IMPLEMENT -> VERIFY -> REPORT

Do not treat an "Implemented" claim as verified until the actual application behavior is checked.

## Protected areas
Do not casually rewrite CV data, templates, rendering, Master CV Agent validation, JobTech integration, application persistence, authentication, or existing stable workflows.

## Important distinction
This baseline is not a request to implement every finding immediately. Each finding must be handled as a separate approved change with the smallest necessary modification.
