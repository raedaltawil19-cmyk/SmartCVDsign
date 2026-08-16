---
description: Shared skill for reviewing CV content shape, readability, density and layout. Use to detect concrete presentation problems and recommend the clearest supported form — including paragraphs, bullets, numbered lists, alignment, spacing, column placement and section organisation — based on the actual current CV layout. Never recommend a visual change merely as a matter of taste.
---

# Skill: content_shape_and_layout_review

A shared review skill for **content form, readability, density and layout presentation**. It diagnoses concrete presentation problems and recommends the clearest supported form. It does not edit, save or execute changes.

The skill is deliberately broader than text density. It may evaluate whether content should be represented as paragraphs, bullet points, numbered lists, compact lines, or other existing supported content forms, and whether a section or information block is placed poorly within the current layout. It must remain evidence-based and must never turn personal design preference into a recommendation.

## Procedure

1. **Inspect the actual current placement.** Use the supplied layout information, CV index and rendered/content structure where available. Determine the section's real width, column, neighbouring content and available space. If the placement cannot be established reliably, do not invent a layout interpretation.
2. **Identify a concrete presentation problem.** Examples include inconsistent alignment, excessive or unusable whitespace, cramped content, uneven density, poor hierarchy, a section separated from its heading, contact information presented unclearly, or a long undifferentiated block that materially harms scanning.
3. **Choose the form that best solves the observed problem:**
   - **Multiple paragraphs** when one long block contains several distinct ideas or logical units.
   - **Bullet points** when the content contains several independent responsibilities, skills, achievements or facts that are easier to scan separately.
   - **Numbered list** when items represent an order, sequence, steps, stages or ranked process.
   - **Compact wording** for narrow areas where the same meaning can be conveyed clearly without unnecessary length.
   - **Fuller wording** in a genuinely wide area only when the additional content materially improves understanding or differentiation.
4. **Evaluate column placement.** A section may be recommended for movement to another existing column only when the current placement demonstrably harms readability, hierarchy, density or use of available space, and the alternative placement is supported by the actual layout. Never move a section merely because another column looks nicer.
5. **Evaluate alignment and spacing.** Recommend correction when lines, headings, contact elements, dates, bullets or other repeated elements are visibly inconsistent or when spacing creates a concrete readability or hierarchy problem. Do not recommend arbitrary pixel values unless the actual layout provides enough information to justify them.
6. **Evaluate contact-information formatting.** Detect clear structural problems such as phone/email/website elements colliding, being merged incorrectly, becoming hard to scan, or being placed inconsistently. Recommend a precise structural correction without inventing or changing contact facts.
7. **Apply the readability and restraint tests.** Every proposed transformation must improve scanning, hierarchy, clarity, consistency or space usage. Do not split, bullet, number or expand content simply because that format is fashionable or visually preferred.
8. **Preserve meaning.** Formatting recommendations may reorganise presentation, but they must not silently change substantive facts. If the proposed transformation requires a content change, the relevant content skill must own that change.
9. **Constrain other recommendations.** Any proposed wording produced elsewhere must respect the density and form verdict for its target section.

## Evidence standard for layout recommendations

A layout recommendation should be explainable as:

**Observed problem → concrete effect → proposed presentation change → expected readability/space benefit.**

For example, do not emit "move Skills to the right column because it is better." Emit only when the current column is demonstrably cramped or misused and the alternative column provides a supported improvement.

## Boundaries

- Never switch templates or invent a new design.
- Never execute layout, column, spacing, typography or content changes.
- Never invent layout dimensions or assume a column assignment that is not present in the supplied context.
- Never delete substantive facts merely to make a page shorter.
- Never change a candidate's factual content under the guise of formatting.
- Section identity and target fields come from the CV index and the current layout context; this skill does not invent identifiers.
- Recommendation validity is decided by `recommendation_validity_gate`; semantic qualification placement is delegated to `credential_and_qualification_interpretation`; job-specific relevance is delegated to the Job Tailor skills.
