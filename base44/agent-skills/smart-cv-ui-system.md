---
description: Shared UI design system for Smart CV. Use when designing, reviewing, or rebuilding any Smart CV interface across mobile, tablet, and desktop. Combines Apple-like native interaction principles, the project's TikTok-inspired spatial navigation, accessibility and responsive UX rules, and the established Jobs/CV/Tools information architecture. UI-only: never changes agent reasoning, business logic, data processing, or function responsibilities.
---

# Skill: smart_cv_ui_system

This is the canonical **visual and interaction system** for the Smart CV application. It defines how existing capabilities are exposed to users. It does not define what an agent thinks, how a function processes data, or how agents communicate internally.

## 1. Core product UI model

The interface has three conceptual areas on desktop:

- **Jobs / Applications** on the left: job discovery, selected-job context, similar jobs, match information and application tracking.
- **CV Canvas** in the center: the current CV/version is the primary visual object.
- **Tools** on the right: AI actions and supporting tools that operate on the CV or the selected job.

The top area contains high-level account/product controls:

- CV / template context
- Template Advisor
- Notifications
- Share
- Profile

Do not expose internal agent-to-agent communication in the UI.

## 2. Mobile spatial model

Do NOT shrink the desktop three-column layout into a narrow mobile screen.

Mobile is a transformation into focused workspaces:

- The CV remains the central/default workspace.
- A **central plus button (+)** is the primary creation/import action.
- One side of the mobile action/navigation layer exposes **General Improve**.
- The other side exposes **Match Job**.
- Jobs and application tracking are available as a dedicated workspace.
- AI/tools are exposed through a focused tools/action surface, drawer, sheet, or contextual action menu rather than a long row of tiny buttons.
- Notifications remain accessible from the top area.
- Profile and Share remain high-level top actions.

The exact visual arrangement may adapt to screen width, but the hierarchy must remain recognizable.

## 3. Central + action

The + action is not a generic menu. It is the entry point for creating or adding CV source material.

On activation, open an iOS-style bottom sheet or equivalent mobile sheet containing:

1. **Paste CV text**
2. **Upload CV file (PDF and supported document formats)**
3. **Import from LinkedIn**

The user may choose one, two, or all three sources.

The UI must make multi-source selection obvious and allow the user to continue only when at least one source is available.

The UI must not expose the internal aggregation/merge implementation.

## 4. General Improve action

General Improve is a user-facing entry point to the existing CV review/improvement workflow.

The UI flow is:

**Improve → analysis state → recommendations → user decision → apply → visual confirmation**

Do not show internal messages such as "CV Review Coach sent recommendations to AI Assistant" or any agent handoff.

The processing state should feel intentional and calm, not like a technical console.

After the user chooses to apply a recommendation, the CV itself should visibly acknowledge the change. Use a restrained "magic edit" treatment: subtle glow/highlight, opacity/transform transitions, or localized emphasis around the affected text/section. The effect should run briefly, be interruptible, respect prefers-reduced-motion, and never obscure the actual content.

## 5. Match Job action

Match Job is a contextual user-facing entry point for a specific job.

The interaction pattern is:

**Match Job → input sheet → paste job text OR job URL → start → processing state → job result → optional Tailor action**

When the job input sheet is active, do not clutter the background with unrelated controls.

After submission, the input sheet closes or transitions cleanly into the result state.

The result surface may contain:

- Match percentage
- Key fit explanation
- Salary intelligence result when available
- Similar jobs
- Location/distance when available
- Tailor CV action
- Save/application action
- Open original job action

The UI does not dictate the matching or salary algorithm; it only presents their outputs.

## 6. Contextual actions

Prefer contextual actions over global buttons.

Examples:

- A selected job should expose **Tailor CV**, salary information, similar jobs, save/apply and open-job actions in its job context.
- An experience entry may expose achievement improvement or gap explanation contextually.
- An interview invitation may expose Interview Preparation from the notification/inbox context.
- Course recommendations may appear as notifications and inside the Career Development area.

Do not create a global button merely because a backend function exists.

## 7. Tools organization

Avoid a wall of individual buttons. Group tools into understandable action families:

### Improve
- CV Review / Improve
- ATS Check
- Achievement optimization
- Career-gap explanation where relevant

### Tailor
- Tailor to selected job
- Tailor to company

### Write / Prepare
- Cover Letter
- Interview Preparation
- Language / Tone

### Career
- Salary Intelligence
- Course recommendations
- Career development information

### Import
- LinkedIn and other source imports when not using the central + flow

Tools should open the smallest suitable surface: inline action, popover, sheet, side panel, or full workspace.

## 8. Apple-inspired interaction rules

Use Apple Human Interface principles as the interaction baseline:

- Native-feeling controls
- Safe-area awareness
- Minimum 44px touch targets
- Clear primary/secondary action hierarchy
- Bottom sheets for focused mobile input/actions
- Drag-to-dismiss where appropriate
- Calm transitions using fade, slide, and subtle scale
- Motion explains hierarchy rather than decorating the screen
- No unnecessary bounce
- Avoid heavy borders and excessive visual chrome
- Prefer grouping and spacing over boxes
- Keep one-handed use in mind
- Never sacrifice clarity to imitate Apple visually

## 9. Accessibility and responsive rules

Apply the project's UI/UX Design Guide rules:

- Text contrast at least 4.5:1 for normal text and 3:1 for large text.
- Icon-only buttons require accessible labels.
- Color must never be the only state indicator.
- Inputs require labels.
- Touch targets at least 44x44px on mobile.
- Explicit focus-visible states must remain available for keyboard users.
- Use skeletons for content-heavy async areas and spinners for focused short actions.
- Honor prefers-reduced-motion.
- Do not use transition: all.
- Avoid horizontal scrolling.
- Account for safe areas and fixed navigation height.
- Verify layouts at 375px, 768px, 1024px and 1440px.

## 10. Typography and visual hierarchy

Use system-first typography and establish hierarchy primarily through size, weight, spacing and grouping rather than many colors.

Prefer a calm neutral base with a restrained product accent. Do not introduce neon, heavy gradients or decorative effects.

Body copy must remain readable on mobile. Long text should wrap safely and not cause layout overflow.

## 11. Loading, empty, success and error states

Every interactive workflow needs a visible state model:

- Idle
- Active/input
- Processing
- Success/result
- Error/retry
- Optional confirmation before destructive actions

Errors must tell the user what happened and what to do next.

Background completion should use a notification/toast or relevant inbox state rather than blocking the user.

## 12. Version and CV safety in UI

The UI must make it visually clear when the user is:

- creating a new CV,
- viewing the original/improved base CV,
- viewing a job-tailored version,
- or applying changes to the current version.

Do not silently replace a meaningful CV version when the workflow is intended to create a new version.

## 13. Hard boundaries

This skill is UI-only.

Never:

- change agent responsibilities,
- redefine an agent's reasoning,
- move business logic between agents,
- invent backend functions,
- invent data fields,
- expose internal agent handoffs,
- change CV content without an explicit user-facing action,
- treat a visual animation as evidence that processing actually succeeded.

The UI must invoke the existing capability and accurately reflect its actual state.
