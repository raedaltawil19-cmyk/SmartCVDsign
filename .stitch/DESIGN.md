# Smart CV — Stitch Design System

## Design role
This file is the visual source of truth for Smart CV's browser-based web application.

Smart CV is a professional career workspace, not a landing page and not a native mobile app.

## Product feel
- premium
- calm
- Nordic / Scandinavian restraint
- professional SaaS
- highly legible
- document-centric
- purposeful rather than decorative

Avoid generic AI-dashboard styling, excessive cards, neon gradients, heavy glassmorphism, giant decorative headings, and unnecessary visual effects.

## Color system
Primary brand: #000066
Primary accent / action highlight: #D9E830
Page neutral: #F5F5F5
White surfaces: #FFFFFF
Primary text: #0F172A
Secondary text: #64748B
Muted text: #94A3B8
Borders: #E2E8F0
Soft surface: #F8FAFC

Use the brand blue and yellow as restrained product accents, not as large decorative fills except where the hierarchy clearly calls for it.

## Typography
System-first sans-serif stack:
ui-sans-serif, system-ui, sans-serif

Use typography hierarchy through size, weight and spacing.
Avoid excessive font variation.

## Shape
Default radius: approximately 10px.
Large surfaces may use 16–24px radius when the grouping benefits from it.
Do not round every element.

## Shadows
Use subtle shadows for elevated interactive surfaces only:
- dialogs
- sheets
- floating controls
- active cards

Avoid heavy permanent shadows around the CV document.

## Desktop workspace
The Builder uses three conceptual zones:

LEFT: Jobs / Applications context
CENTER: CV Canvas
RIGHT: Tools / AI

The CV Canvas is the dominant object.

Top navigation contains:
- current CV/version context
- Templates
- Notifications
- Share / Export
- Profile

## CV Canvas
The CV should look like a real A4 document.

Desktop:
- white paper surface
- believable A4 proportions
- document whitespace
- subtle paper elevation
- centered in the workspace

The surrounding workspace is neutral and visually quiet.

## Mobile
Mobile is a responsive browser workspace.

The CV remains the main visual object.

Use a compact top bar and a bottom action layer with the highest-value actions:
- Improve
- + / Add CV
- Match Job
- Jobs / Applications
- AI

The + action is visually central.

Do not shrink desktop sidebars onto mobile.

## Touch and accessibility
- Minimum 44px touch targets.
- Icon-only buttons require accessible labels.
- Visible focus states.
- Color is never the only state indicator.
- Respect prefers-reduced-motion.

## Surfaces
Choose the smallest suitable surface:
- quick action: inline action/popover
- focused mobile input: bottom sheet
- supplementary detail: side panel/sheet
- full workflow: dedicated workspace or large dialog
- background completion: toast/notification

## Interaction language
Primary actions should use short concrete labels:
- Create CV
- Improve CV
- Match Job
- Tailor CV
- Apply changes
- Save application
- Open job
- Prepare interview

## Motion
Motion communicates state and hierarchy.

Use:
- subtle fade/slide for sheets
- restrained result transitions
- localized CV highlight after a real change
- skeleton/spinner for processing

Never use animation as a fake substitute for completed processing.

## Responsive verification
Verify layouts at:
375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px.

No horizontal overflow.

## Hard rule
The design system defines appearance and interaction presentation only.
Existing application code remains authoritative for business logic and data workflows.
