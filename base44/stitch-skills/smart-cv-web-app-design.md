---
name: smart-cv-web-app-design
description: Canonical visual and responsive design skill for Smart CV as a real browser-based web application. Use this skill whenever designing, reviewing, or rebuilding Smart CV screens in Google Stitch.
---

# Smart CV — Web App Design Skill

## Mission
Design Smart CV as a serious, production-quality WEB APPLICATION, not a mobile app mockup, landing page, dashboard collage, or native-app imitation.

The product must work visually across:
- mobile phones
- tablets
- laptops
- desktop monitors
- narrow and wide browser windows
- modern Chrome, Safari, Edge and Firefox

The design must be responsive by composition, not by simply shrinking desktop elements.

## Product identity
Smart CV is a career workspace centered on the user's CV. The CV is the primary visual object. Jobs, applications and AI tools are supporting workspaces around it.

The interface should feel:
- premium
- calm
- professional
- highly usable
- modern SaaS
- Scandinavian / Nordic restraint
- information-dense without feeling crowded

Avoid:
- generic AI-dashboard aesthetics
- excessive gradients
- glassmorphism everywhere
- neon colors
- oversized decorative hero sections inside the product
- excessive rounded cards
- visual clutter
- fake 3D effects
- native-mobile-only UI patterns on desktop

## Desktop composition
At desktop widths, the main Builder workspace follows a three-zone composition:

LEFT — Jobs / Applications context
CENTER — CV Canvas
RIGHT — Tools / AI actions

The CV Canvas is visually dominant.

The top bar contains only high-level product actions:
- CV / current version context
- Templates
- Notifications
- Share / Export
- Profile

Do not put every available feature into the top bar.

## Mobile composition
Mobile is a focused browser workspace, not a shrunken desktop.

Default state:
- CV remains central and readable
- compact browser-friendly top bar
- prominent central + action for adding/importing CV material
- Improve action
- Match Job action
- Jobs / Applications workspace
- AI assistant access

Use bottom navigation only for the highest-value destinations/actions. Do not create a row of tiny icons for every feature.

Focused actions open sheets, drawers or full-screen mobile workspaces.

All touch targets must be at least 44px.

## Responsive breakpoints
Design and verify at minimum:
- 375px
- 430px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px

At each breakpoint, preserve hierarchy and usability rather than exact pixel positions.

## Browser behavior
The design must account for:
- browser viewport changes
- mobile browser address-bar changes
- safe areas on mobile
- keyboard opening over forms
- scrolling inside the CV workspace
- sticky/fixed controls
- horizontal overflow prevention
- print/export entry points

Never assume a fixed native-app viewport.

## Visual hierarchy
Use hierarchy through:
1. spatial placement
2. typography
3. scale
4. contrast
5. restrained accent color

Use borders and cards only when they clarify grouping.

The CV page should visually read as an A4 document inside the workspace, with believable paper proportions, whitespace and document hierarchy.

## Interaction principle
Every important visible control must correspond to a real product action.

Never design decorative buttons that do nothing.

The visual design must make it obvious:
- what is clickable
- what is selected
- what is processing
- what succeeded
- what can be undone
- what opens another workspace

## Source of truth
The existing Smart CV codebase is authoritative for available capabilities and workflow responsibilities. Do not invent new backend capabilities merely to make a screen look complete.

When a capability already exists, design its UI around the existing action.
