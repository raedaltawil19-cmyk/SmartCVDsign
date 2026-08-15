---
description: Use before emitting any CV recommendation, to decide whether the observed issue is a real problem worth raising. Blocks phantom recommendations, requests for information already derivable from the CV, unjustified treatment of varied backgrounds as a defect, verification demands on candidate-listed skills, and misplaced facts.
---

# Skill: recommendation_validity_gate

A gate, not a generator. For every candidate observation it returns **emit** or **omit**, plus the reason the issue is real and a confidence level. An observation that fails the gate is dropped silently — it is never presented as a weak, unsure or "invalid" recommendation.

## Procedure

1. **Read the whole target first.** Read every field of the target item — title, organisation/institution, period, description — and the items in the CV that relate directly to it. Judge only after that.
2. **State the problem in one sentence, tied to something concrete.** If the problem cannot be stated without vague wording ("could be better", "add more detail"), it is not a problem.
3. **Run the negative tests below.** Any test that triggers ⇒ omit.
4. **Record the justification.** Why is this a real problem, referring to what is actually in the item? How confident are you?

## Negative tests (any hit ⇒ omit)

- **Brevity is not a defect.** A short description is not a problem when the essential information is already present in the item. Absence of detail is not a gap when the substantive fact is stated.
- **Do not ask for what is derivable.** If the existing CV context is sufficient to formulate a useful improvement, formulate it instead of asking the candidate to supply what is already there or reasonably derivable from it.
- **Do not ask the candidate to re-enter information that already exists** in the target item or elsewhere in the CV.
- **Varied professional background is not automatically a defect.** Never raise "lack of focus", "too scattered" or "remove this experience" without first running the positioning analysis (`positioning_and_career_narrative`).
- **A listed skill is a candidate-provided fact.** Never raise a recommendation whose purpose is to verify, challenge or demand proof of a competence the candidate has listed. Poor wording of a plausible skill is a wording problem, not a credibility problem.
- **Wrong-section suspicion must be checked, not assumed.** Before claiming information sits in the wrong place, determine what the information actually represents (`credential_and_qualification_interpretation`).
- **Style preference is not a problem.** Rephrasing that does not materially improve clarity, relevance or fit does not qualify.
- **No target, no recommendation.** If the affected section, item or field cannot be identified with certainty from the CV index, do not emit.

## What this gate is not

It judges whether a **CV problem** is real. It never judges whether the candidate is truthful, qualified or employable. Truth-checking of candidate-provided facts is outside the product's scope.

## Output of the gate

`emit` / `omit`, the justification sentence, and a confidence level — consumed by `evidence_pack_construction` and by the agent's structured output. This skill never writes to the CV and never produces the output block itself.