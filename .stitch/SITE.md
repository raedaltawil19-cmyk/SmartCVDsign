# Smart CV — Stitch Site Vision

## Product
Smart CV is a responsive browser-based career workspace.

It helps a user create, improve, tailor and manage CVs while connecting those CVs to suitable jobs and application tracking.

## Core product model
The CV is the central working object.

Supporting contexts:
- Jobs
- Applications
- AI tools
- Templates
- Notifications
- Career development

## Main workspace
Desktop:
- left: jobs/applications context
- center: CV canvas
- right: tools/AI

Mobile:
- CV canvas remains central
- focused actions replace desktop sidebars
- central + is the main source/import action

## Primary workflows
1. Add/Create CV
2. Improve CV
3. Match Job
4. Tailor CV
5. Save Application
6. Manage CV versions
7. Share / Export
8. AI assistance
9. Notifications

## Workflow rule
Every major workflow should be representable as a clickable prototype:
Entry → Input → Processing → Result → Decision → Apply/Save → Confirmation

## Design sequence
Phase 1: Builder desktop workspace
Phase 2: Builder mobile workspace
Phase 3: Add/Create CV interaction states
Phase 4: Improve CV interaction states
Phase 5: Match Job + Tailor interaction states
Phase 6: Jobs/Application workspace
Phase 7: supporting surfaces

## Acceptance
A design is accepted only when:
- it clearly reads as a web application
- responsive behavior is intentional
- primary actions are obvious
- workflows can be clicked through in prototype form
- visual hierarchy remains stable across device sizes
- no unnecessary feature clutter is introduced
