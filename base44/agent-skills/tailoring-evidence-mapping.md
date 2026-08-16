---
description: Job Tailor skill. Use after job requirements and CV evidence have been established to map each tailoring recommendation to both a real job requirement and real candidate evidence, preventing unsupported claims.
---

# Skill: tailoring_evidence_mapping

This skill provides **double traceability** for job-specific tailoring:

**Target job requirement ↔ Candidate CV evidence ↔ Proposed tailoring action**

It does not parse the job, decide the overall tailoring strategy, generate the final recommendation block, or execute edits.

## Procedure

1. **Start from an established job requirement.** Use a requirement already classified by `job_ad_parsing_and_classification` / `job_requirement_matching`. Do not invent a requirement at this stage.
2. **Locate real CV evidence.** Identify the exact CV section/item/field or clearly available candidate fact that supports the proposed tailoring. Use only identifiers present in the current CV index.
3. **Classify the evidence relationship:**
   - **strong_support** — the CV clearly evidences the requirement or relevant capability.
   - **partial_support** — the CV contains related evidence, but the match is narrower or incomplete.
   - **no_support** — the CV does not evidence the requirement.
   - **contradictory** — the available CV evidence conflicts with the proposed claim.
4. **Allow rewriting only when supported.** A recommendation may improve wording, ordering, emphasis, structure or presentation of genuine existing evidence. It must not turn partial or absent evidence into a claim of full qualification.
5. **Treat gaps honestly.** A `no_support` result may inform tailoring strategy, but it must never become an instruction to invent experience, skills, responsibilities, qualifications, achievements, dates or certifications.
6. **Maintain two-sided traceability.** Every job-specific content recommendation should be explainable by both a job-side reason and a CV-side evidence reference. If either side cannot be established, do not emit a job-specific claim as though it were supported.
7. **Keep evidence and proposal separate.** The evidence is what the CV states. The proposed wording or presentation is a recommendation. Never write the proposal back into the evidence.

## Evidence quality rules

- A keyword appearing in the job advert is not evidence that the candidate has that skill.
- A generic occupational expectation is not evidence that the candidate has performed it.
- A related skill is not automatically equivalent to a required skill.
- A qualification recognition or assessment statement is not automatically an exact domestic equivalence or credit value.
- Candidate-provided facts remain candidate-provided facts; this skill does not independently verify them.

## Boundaries

- No job-ad parsing.
- No broad CV diagnosis.
- No overall tailoring strategy; delegate to `tailoring_strategy`.
- No final recommendation block.
- No candidate interrogation for facts that are already present or reasonably derivable.
- No edits, saving or execution.
