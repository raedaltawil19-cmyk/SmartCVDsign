---
description: Job Tailor skill. Use after job requirements and evidence mapping to decide what should be rewritten, emphasised, reordered, shortened, reformatted, left unchanged, or treated as an honest gap for a specific target job.
---

# Skill: tailoring_strategy

This skill decides **what kind of tailoring action is justified** after the target job and candidate evidence are understood. It is decision logic, not execution.

## Procedure

1. **Start from established inputs.** Use the classified job requirements, CV-to-job matching, evidence mapping and current CV structure. Do not invent a requirement or candidate fact.
2. **Choose the appropriate action:**
   - **rewrite** — improve wording of genuine existing evidence to make it clearer or more relevant to the role.
   - **emphasise** — give stronger prominence to evidence that is already present and materially relevant.
   - **reorder** — change the presentation priority of existing information when that improves relevance or scanability for the target role.
   - **shorten** — reduce wording that is low-value or repetitive when space or density requires it.
   - **reformat** — change presentation form (for example paragraph to bullets) when the shared content/layout skill identifies a concrete readability or hierarchy benefit.
   - **leave_unchanged** — when the current presentation is already strong and further change would be cosmetic or risky.
   - **honest_gap** — when the job requires something the CV does not evidence; never invent a claim to close the gap.
3. **Prioritise relevance over cosmetic change.** A tailoring action should materially improve how the existing candidate evidence communicates fit for the actual role. Do not generate a recommendation simply to make the CV look different.
4. **Preserve factual boundaries.** Rewriting may improve wording but must not introduce unsupported responsibilities, achievements, skills, qualifications, dates, employers, technologies, language levels or results.
5. **Respect dependencies.** If an action genuinely depends on another recommendation, record that dependency. Otherwise keep recommendations independently actionable.
6. **Coordinate with shared formatting logic.** When the problem is primarily layout, density, alignment, paragraph structure, bullets, numbering or column placement, use `content_shape_and_density` rather than embedding formatting logic here.
7. **Use positioning carefully.** When multiple backgrounds need interpretation, use `positioning_and_career_narrative`. Do not remove useful experience merely because it is not directly named in the target advert.
8. **Prefer fewer strong actions.** If the CV already communicates the relevant evidence effectively, produce no tailoring recommendation for that area.

## Decision rules

- **Strong match + strong presentation** → leave unchanged.
- **Strong match + weak presentation** → rewrite, emphasise, reorder or reformat as justified.
- **Partial match + genuine related evidence** → improve the presentation without overstating the match.
- **No evidence for a requirement** → honest gap; never invent.
- **Requirement is only preferred** → do not treat absence as a defect unless it materially affects tailoring strategy.
- **Job wording is ambiguous** → do not create a false precision; preserve the uncertainty.

## Boundaries

- No job-ad parsing.
- No direct CV editing or saving.
- No invention of candidate facts.
- No independent decision about whether a recommendation is valid; pass candidate observations through `recommendation_validity_gate`.
- No final CV_REVIEW block; output structure belongs to the agent contract.
