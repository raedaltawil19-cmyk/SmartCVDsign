---
description: Job Tailor skill. Use when a real target job advert is available to turn the advert into a structured, evidence-grounded requirement model before CV matching or tailoring decisions.
---

# Skill: job_ad_parsing_and_classification

Job-specific analysis only. This skill converts a real job advert into a structured understanding of what the employer is asking for. It does not assess the candidate, generate CV recommendations, or execute edits.

## Procedure

1. **Use only real job data.** The source must be pasted advert text, successfully fetched advert content, or requirements explicitly supplied by the candidate. Never replace missing employer requirements with generic assumptions about the occupation.
2. **Separate requirement classes:**
   - **Explicit requirements** — stated as required, mandatory, must-have, or equivalent.
   - **Preferred qualifications** — stated as advantageous, desirable, meritorious, or equivalent.
   - **Responsibilities** — what the role expects the person to do.
   - **Keywords / terminology** — meaningful terms used by the employer that may matter for ATS or human scanning.
   - **Implicit expectations** — reasonable signals supported by the advert's wording or role context, clearly distinguished from explicit requirements.
   - **Industry/context signals** — sector, environment, customer type, operating model, language or other contextual signals that affect relevance.
3. **Preserve employer wording where useful.** Keep the original terminology available for matching. Do not silently convert a specific employer term into a broader synonym and lose the distinction.
4. **Separate requirement from evidence.** Job-ad statements describe the role, not the candidate. Never treat an employer requirement as a fact about the candidate.
5. **Record uncertainty.** If wording is ambiguous, keep it ambiguous rather than inventing a requirement or ranking it as mandatory.
6. **Prioritise only when supported.** Do not manufacture a priority score. A requirement's priority comes from explicit wording, repetition, placement, or clearly supported role context.

## Boundaries

- No CV matching; delegate that to `job_requirement_matching`.
- No candidate evidence mapping; delegate that to `tailoring_evidence_mapping`.
- No tailoring strategy; delegate that to `tailoring_strategy`.
- No recommendation generation.
- No web search or advert retrieval decisions; tool use belongs to the agent/tool layer.
- No edits, saving or execution.
