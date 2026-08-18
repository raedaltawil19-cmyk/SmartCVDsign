# Smart CV — Google Stitch Master Design Brief

## 1. What you are designing

Design a production-quality browser-based web application called Smart CV.

This is NOT a landing page.
This is NOT a native mobile app.
This is NOT a static dashboard.
This is NOT a collection of unrelated screens.

It is a responsive career workspace in which the CV is the central working object.

The final design must work across phones, tablets, laptops and desktop browsers.

## 2. Existing product architecture

The current application already contains real workflows for:
- CV creation/import
- CV editing and preview
- CV templates
- CV review/improvement
- Job matching
- Job tailoring
- Suitable jobs
- Application tracking
- Salary intelligence
- AI CV assistant
- Notifications
- Share/export
- CV versions
- LinkedIn import

Do not invent a parallel product architecture.

## 3. Primary Builder layout

Desktop:

LEFT: Jobs / Applications context
CENTER: CV Canvas
RIGHT: Tools / AI

The center CV is the dominant object.

Top bar:
CV/version context | Templates | Notifications | Share | Profile

The interface should feel like a professional SaaS workspace, not a generic AI dashboard.

## 4. Mobile transformation

Mobile keeps the CV as the central workspace.

Top: compact product controls.

Bottom action layer:
Improve | + | Match Job | Jobs | AI

The + action opens an iOS-style sheet for adding CV source material.

Focused workflows use sheets/drawers/full-screen browser surfaces.

Do not simply stack the desktop columns vertically.

## 5. Visual direction

Premium, calm, Nordic, professional.

Neutral base, restrained dark brand color, restrained accent color.

Strong typography and whitespace.

Avoid excessive cards, gradients, glass effects, neon, giant headings and decorative AI visuals.

The CV should look like a real A4 document inside a modern web workspace.

## 6. IMPORTANT: Make it interactive

This design must be a clickable prototype.

Do not only generate static screens.

Represent these interactions:

+ → Add CV sheet → choose source → Create CV → processing → CV

Improve → processing → recommendations → select → Apply → visual CV change

Match Job → job input → processing → job result → Tailor CV

Templates → template picker → select → CV updates

Share → share/export menu → select action

AI → assistant panel → minimize/restore/close

Notifications → notification panel → relevant workspace

## 7. State fidelity

Every important action needs visible states:
- default
- hover
- pressed
- selected
- loading
- success
- error where applicable

The prototype must make state changes understandable.

## 8. Responsive acceptance

Design must be intentionally composed for:
375px, 430px, 768px, 1024px, 1280px, 1440px and 1920px.

Prevent horizontal overflow.
Maintain 44px minimum touch targets.
Respect browser viewport and safe-area behavior.

## 9. Critical instruction

Do not solve missing information by adding more buttons.

Do not put every feature on screen.

Use contextual actions and focused surfaces.

The goal is not to show everything the product can do.
The goal is to make the next useful action obvious.

## 10. Design process

FIRST: create the main Builder workspace.
SECOND: create the mobile Builder transformation.
THIRD: create and connect the primary interaction states.
FOURTH: refine Jobs, Match Job and Tailor surfaces.
FIFTH: refine Review, AI and supporting surfaces.

Do not redesign the entire application in one giant generation.

Each generated screen must be checked against the existing architecture before moving to the next.

## 11. Fidelity rule

Use the supplied reference screenshots/designs as the visual source of truth when available.

Do not reinterpret the product into a different aesthetic simply because the prompt contains many requirements.

Hierarchy and composition are more important than adding features.
