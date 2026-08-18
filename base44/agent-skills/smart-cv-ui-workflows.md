---
description: Shared interaction-pattern skill for Smart CV. Use when designing or reviewing buttons, sheets, modals, drawers, processing states, result states, confirmations, and contextual actions. It maps existing Smart CV capabilities to clear user-facing workflows without exposing internal agent orchestration.
---

# Skill: smart_cv_ui_workflows

This skill defines the **user-visible workflow layer** of Smart CV. It is intentionally separate from agent reasoning and backend processing. A UI action may trigger an existing function or agent, but this skill never specifies how that capability performs its work internally.

## Core rule

Every important user-facing action must have an understandable state sequence:

**Entry → Input (if needed) → Processing → Result → User decision → Apply/Save → Confirmation**

Do not expose technical internals, agent handoffs, API calls, prompts, tool calls, or implementation details.

## Workflow A — Add / Create CV (+)

Entry:
- Central mobile + action.

Sheet:
- Paste CV text
- Upload PDF/document
- Import LinkedIn

Selection:
- One source is valid.
- Two or three sources may be selected together.

After Create:
- Close the input sheet or transition to a calm processing surface.
- Show a short non-technical status such as "Creating your CV…".
- Present the resulting initial CV when ready.

The UI must not imply that the source merge is finished until the actual operation has completed.

## Workflow B — General Improve

Entry:
- General Improve action in the mobile action layer or Tools → Improve.

Sequence:
1. User starts improvement.
2. Show calm processing state.
3. Show recommendations grouped by CV area.
4. User can accept/reject individual recommendations or apply the selected set.
5. On Apply, visibly highlight the actual affected CV areas for a short period.
6. Return to a stable CV state with a clear saved/applied indication.

Magic editing is visual feedback only. It must never fake completion or hide the actual changed content.

## Workflow C — Match Job

Entry:
- Match Job action.

Input sheet:
- Paste job description
- Enter job URL

Sequence:
1. Validate that job text or URL exists.
2. Start the existing job-analysis capability.
3. Close/transition the input surface.
4. Show processing state.
5. Present job result.
6. Offer contextual actions: Tailor CV, Salary, Similar Jobs, Save/Application, Open Job.

## Workflow D — Job Tailor

Entry:
- From a selected job or Tools → Tailor.

If a job is already selected:
- Do not ask the user to enter the same job again.

Result surface should distinguish:
- What is already strong
- Suggested changes
- Honest gaps
- Optional application of changes

Apply should create/update the correct CV version according to the existing versioning logic. The UI must not silently overwrite a meaningful source version.

## Workflow E — ATS Check

Entry:
- Tools → Improve → ATS Check.

Sequence:
- Run check
- Show score and categorized findings
- Let the user inspect the affected area
- Offer an explicit action such as "Fix with AI" when an existing supported improvement action is available
- Apply only after the user chooses the action

## Workflow F — Interview Preparation

Two valid entry paths:

1. Automatic: a relevant interview email produces a notification/inbox item.
2. Manual: Tools → Interview Preparation.

Notification copy should focus on the result, e.g. "Your interview preparation is ready", not on which agents ran.

## Workflow G — Course Advisor

Course recommendations may be triggered by the existing product event that indicates the user is satisfied with the CV (for example saving or printing), but the user must not receive a notification every time that event occurs.

Only show/send a notification when the course discovery capability actually finds additional relevant courses.

The notification should communicate the outcome, e.g. "We found courses that could strengthen your career path." A course list should contain only actual recommendations returned by the capability.

## Workflow H — Salary Intelligence

Salary Intelligence is contextual to a selected job.

The user should see the result in Job Details rather than launch an isolated technical tool.

Present:
- Personalized salary range
- Relevant experience when available
- Market median when available
- Source
- Confidence or explanatory context when supported

Do not show internal salary-source requests or classification steps.

## Workflow I — Similar Jobs

Similar Jobs is contextual to the selected job.

The UI should show:
- Job title
- Employer
- Location
- Distance when available
- Similarity percentage when available

Do not expose a separate "similarity engine" control.

## Workflow J — Notifications / Inbox

The notification center is a result surface for background events.

Examples:
- Interview preparation ready
- New relevant courses found
- Application-related updates when supported

Notifications should open the relevant workspace or result rather than forcing the user to repeat the original workflow.

## Workflow K — Share / Export

Share is a top-level action.

Use a compact share/export surface for:
- Share CV
- Copy/share link where supported
- Print/PDF
- PNG export where supported

Do not expose export implementation details.

## Workflow L — Destructive and irreversible actions

Deleting a CV/version/application or performing an irreversible action requires explicit confirmation or a reliable undo window.

Use specific action labels, never ambiguous "Continue" or "Submit" labels.

## Pattern selection

Choose the smallest suitable UI surface:

- Quick contextual action → inline action/popover
- Focused mobile input → bottom sheet
- Supplementary details → side panel/sheet
- Full record creation/edit → dedicated workspace or slide-over
- Background completion → notification/toast
- Long-running visible operation → progress/skeleton state
- Error → inline message or focused error surface with next step

## Motion rules

Use motion only to communicate hierarchy or state change:

- Sheet presentation: subtle slide/fade
- Result transition: subtle fade/scale
- Applied CV changes: localized glow/highlight
- Processing: restrained skeleton/progress/spinner

Animations must be interruptible and reduced under prefers-reduced-motion.

## Copy rules

Use short, concrete action labels:

- "Create CV"
- "Improve CV"
- "Match Job"
- "Tailor CV"
- "Apply changes"
- "Save application"
- "Open job"
- "Prepare interview"

Do not use technical labels such as "Run Agent", "Execute Function", "Invoke AI", or "Start Pipeline".

## Boundary

This skill controls only what the user sees and how the user moves through the interface. Existing agents/functions remain authoritative for processing and business logic.
