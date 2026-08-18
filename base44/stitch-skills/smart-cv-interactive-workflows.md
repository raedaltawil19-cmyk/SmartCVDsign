---
name: smart-cv-interactive-workflows
description: Interaction and prototype skill for Smart CV in Google Stitch. Requires every important button and workflow state to be represented as an intentional clickable interaction.
---

# Smart CV — Interactive Workflow Skill

## Core rule
Do not produce a static collection of screens.

The Stitch prototype must behave like a web application prototype:

CLICK → UI STATE CHANGES → NEXT ACTION BECOMES AVAILABLE

Every major workflow must have a believable interaction sequence.

## Required prototype behavior
For every primary action, show the complete visible state sequence:

Idle → Input → Processing → Result → User decision → Applied/Saved confirmation

The prototype does not need real backend data, but the interaction and state transitions must be represented faithfully.

## Workflow 1 — Create / Add CV
Entry: central + action.

Click + → open Add CV sheet.

Sheet options:
- Paste CV text
- Upload CV file
- Import from LinkedIn

Click one or multiple sources → selected state appears.

Click Create CV → sheet transitions to calm processing state.

Processing → resulting CV workspace appears.

Do not show technical implementation details such as API calls, agents or data merging.

## Workflow 2 — Improve CV
Click Improve.

Show processing state.

Then show CV Review recommendations grouped by area.

Each recommendation can be:
- selected
- deselected
- expanded for details

Click Apply changes → show a short, localized visual indication on the affected CV area.

Then return to stable CV state with a clear saved/applied state.

Do not fake AI work with decorative animation alone.

## Workflow 3 — Match Job
Click Match Job.

Open a focused input sheet.

Input:
- job description
- job URL

Submit → input closes/transitions.

Show processing state.

Show Job Result containing, when available:
- match percentage
- strengths
- gaps
- salary intelligence
- location
- similar jobs
- Tailor CV
- Save / Application
- Open original job

Click Tailor CV → transition into Tailor workflow without making the user repeat job information.

## Workflow 4 — Job Tailor
Entry can be:
- selected job context
- Match Job result
- Tools → Tailor

If job context already exists, reuse it.

Show:
- strong matches
- suggested changes
- honest gaps
- selected recommendations

Click Apply / Create Tailored CV → show new-version state.

The UI must make it clear that a Tailored CV is a separate version and must not silently replace a meaningful Master CV.

## Workflow 5 — Jobs / Applications
Jobs workspace must allow believable transitions such as:

Suitable Job → Open Job → Match → Tailor → Save Application

Application tracking must be visible as a real destination/workspace, not merely a button with no context.

## Workflow 6 — Templates
Click Templates → open template selection surface.

Selecting a template updates the active preview.

The user can close the surface and return to the same CV state.

## Workflow 7 — Share / Export
Click Share → compact share/export surface.

Options:
- Share CV
- Copy link
- Email CV
- Print / PDF

The prototype must visibly react to selection.

## Workflow 8 — AI Assistant
AI is a contextual tool, not the main page.

Click AI → open a focused assistant panel/drawer.

The panel can be minimized/restored.

When an actual CV change is applied, the CV remains visible and becomes the visual focus.

Never expose internal agent-to-agent handoffs.

## Workflow 9 — Notifications
Click notification icon → notification surface opens.

Click a notification → navigate to the relevant context/workspace.

Notifications should communicate outcomes, not technical processing.

## Interaction states
Every important control must have designed states for:
- default
- hover
- focus
- pressed
- selected
- disabled
- loading/processing
- success
- error where applicable

Use subtle motion to explain transitions. Respect reduced-motion preferences.

## Web-specific interaction rules
This is a browser product.

Do not design interactions that only make sense in a native iOS/Android app.

Sheets/drawers are acceptable on mobile and focused contexts, but desktop should use appropriate panels, dialogs or workspace transitions.

Do not rely on swipe gestures as the only way to perform an action.

Every important action must have a visible clickable alternative.

## Prototype acceptance test
A Stitch design is NOT accepted if the viewer can only look at it.

Acceptance requires that a reviewer can click through at least these paths:

1. + → Add CV → source selected → Create → CV workspace
2. Improve → processing → recommendations → select → Apply
3. Match Job → input → result → Tailor
4. Templates → choose template → updated CV
5. Share → Copy/Print option
6. AI → open → minimize → restore → close
7. Notifications → open → relevant destination

If an interaction cannot be implemented in the Stitch prototype, represent the state transition explicitly and label the intended behavior in the design notes rather than inventing a fake interaction.
