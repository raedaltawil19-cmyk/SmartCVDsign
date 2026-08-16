---
description: Use before emitting any CV recommendation, for either general CV review or job-specific tailoring, to decide whether the observed issue is a real, material problem worth raising. Blocks phantom, cosmetic or weakly supported recommendations and prevents treating missing evidence, varied backgrounds, formatting preferences or job gaps as defects without a concrete basis.
---

# Skill: recommendation_validity_gate

A gate, not a generator. For every candidate observation it returns **emit** or **omit**, plus the reason the issue is real and a confidence level. An observation that fails the gate is dropped silently — it is never presented as a weak, unsure or "invalid" recommendation.

This gate is shared by general CV review and job-specific tailoring. The underlying test is the same: a recommendation must address a concrete, material problem that can be identified from the available evidence. Job-specific relevance is evaluated by the tailoring skills; this gate only decides whether the proposed observation is sufficiently real and specific to become a recommendation.

## Procedure

1. **Read the complete relevant target first.** For a content recommendation, read every available field of the target item and the CV items directly related to it. For a structure/layout recommendation, inspect the relevant section, placement, layout data and neighbouring content. For a job-tailoring recommendation, also use the established job requirement and matching evidence supplied by the tailoring workflow. Judge only after the relevant context has been examined.
2. **State the problem in one sentence, tied to something concrete.** If the problem cannot be stated without vague wording ("could be better", "add more detail", "looks nicer"), it is not a problem.
3. **Test materiality.** The issue must affect clarity, relevance, factual precision, readability, structure, ATS usefulness, job fit, or another defined product objective. A preference alone is not enough.
4. **Run the negative tests below.** Any test that triggers ⇒ omit.
5. **Verify the target is actionable and identifiable.** The recommendation must point to a real section/item/field or a clearly identified layout/structure target supported by the current CV context. Do not emit a recommendation against an undefined part of the CV.
6. **Record the justification.** Explain why this is a real problem, what concrete evidence supports it, and how confident the gate is.

## Negative tests (any hit ⇒ omit)

- **Brevity is not a defect.** A short description is not a problem when the essential information is already present in the item. Absence of detail is not a gap when the substantive fact is stated.
- **Formatting preference is not a defect.** Do not recommend changing alignment, spacing, columns, paragraph structure, bullets, numbering, margins or visual density merely because another format is aesthetically preferred. A formatting recommendation requires a concrete readability, hierarchy, space, consistency or usability problem.
- **Do not ask for what is derivable.** If the existing CV context is sufficient to formulate a useful improvement, formulate it instead of asking the candidate to supply what is already there or reasonably derivable from it.
- **Do not ask the candidate to re-enter information that already exists** in the target item or elsewhere in the CV.
- **Varied professional background is not automatically a defect.** Never raise "lack of focus", "too scattered" or "remove this experience" without first running the positioning analysis (`positioning_and_career_narrative`).
- **A listed skill is a candidate-provided fact.** Never raise a recommendation whose purpose is to verify, challenge or demand proof of a competence the candidate has listed. Poor wording of a plausible skill is a wording problem, not a credibility problem.
- **Wrong-section suspicion must be checked, not assumed.** Before claiming information sits in the wrong place, determine what the information actually represents (`credential_and_qualification_interpretation`).
- **Style preference is not a problem.** Rephrasing that does not materially improve clarity, relevance or fit does not qualify.
- **Job gap is not automatically a CV problem.** In a job-tailoring flow, a requirement that the CV does not evidence is not by itself a reason to recommend inventing, adding or challenging candidate information. A job gap may inform tailoring strategy, but unsupported claims must not become recommendations.
- **No identifiable target, no recommendation.** If the affected section, item, field, or clearly supported layout/structure target cannot be identified from the current context, do not emit.

## What this gate is not

It judges whether the proposed **CV issue** is real and sufficiently material to raise. It does not decide whether the candidate is employable or whether an external qualification is legally valid. Candidate-provided facts are treated as candidate facts; unsupported new claims are handled by the evidence and tailoring skills. This gate must never turn uncertainty into a recommendation.

## Output of the gate

`emit` / `omit`, the justification sentence, and a confidence level — consumed by `evidence_pack_construction` and by the agent's structured output. This skill never writes to the CV and never produces the output block itself.