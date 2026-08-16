---
description: Use when a CV must be inspected systematically before any recommendation is formulated — professional positioning, profile text, experience, education, skills, languages, structure, readability and ATS compatibility. Applies to any candidate, occupation or industry.
---

# Skill: cv_diagnostic_review

Reusable diagnostic methodology. It describes **how** to inspect a CV. It produces internal findings only — it never produces the structured output block, and it never writes anything.

## Prerequisite

Work from the complete, current CV context supplied by the app (the structured context block: CV data + CV index + template + layout). Read it in full **before** forming any judgement. If information is absent, treat it as absent — never fill it in.

## Inspection axes

Inspect all of the following. For each axis, note concrete observations tied to real items and fields, not impressions.

1. **Professional positioning** — occupation, seniority, sector, specialisation, direction of the career path, and how consistently the CV signals them.
2. **Profile / summary text** — clarity, relevance, distinctiveness, filler language, and whether it evidences value.
3. **Work experience** — relevance, responsibilities versus accomplishments, measurable results, clarity, repetition, and strength of phrasing.
4. **Education and training** — relevance, clarity, ordering.
5. **Skills / competencies** — professional and technical competencies, relevance, and materially important keywords that are absent.
6. **Languages** — clarity and internally consistent proficiency levels.
7. **Structure and readability** — section organisation, information hierarchy, unnecessary repetition, density, and the quick-scan experience.
8. **ATS compatibility** — keywords present, keywords missing, overly generic phrasing, and terminology mismatches.
9. **Local labour-market conventions** — evaluate against the conventions of the labour market the CV targets, where genuinely relevant.

A general CV diagnosis may consider the intended labour market's general CV conventions, but it does not compare the CV to a specific vacancy. Specific job requirements, job keywords and job-alignment decisions belong to Job Tailor.

## Mandatory delegation

This skill does not decide alone. Delegate:

- **Is an observation actually a real problem?** → `recommendation_validity_gate`. No observation becomes a recommendation without passing that gate.
- **What does a qualification, course, credential or experience actually represent, and which section does it belong to?** → `credential_and_qualification_interpretation`.
- **How long and in what form should proposed text be, given the section's real space?** → `content_shape_and_density`.
- **Does a multi-background profile hold together, and how should positioning be strengthened?** → `positioning_and_career_narrative`.
- **How does the CV compare to a real target job?** → This is outside the general diagnostic skill and belongs to the Job Tailor workflow (`job_requirement_matching`). Do not perform job-specific matching as part of a general CV diagnosis.
- **What evidence supports a recommendation?** → `evidence_pack_construction`.

## Boundaries

- Diagnosis only: no edits, no saving, no execution, no claim that anything was applied.
- Never invent an observation to fill a list; a CV with no material problem is a valid outcome.
- Never reopen the template or layout decision; structural observations describe a readability problem, they do not choose a design.
- The machine-readable output contract lives in the agent's core instructions, not here.