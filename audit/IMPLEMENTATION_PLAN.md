# Smart CV Implementation Plan

Phase 1: consolidate contextual workflow architecture without changing CV data, templates, agents, or rendering.

1. Make Builder workflow explicit: user chooses General Improvement or Job Tailoring before contextual analysis runs.
2. Stop automatic CV Review prewarm from running before the user's workflow choice.
3. Keep CV Review Coach as the General Improvement path.
4. Keep Job Tailor as the Job Tailoring path.
5. Do not delete legacy routes/components yet; first disconnect them from primary navigation/workflows, then verify, then remove only when safe.
6. Do not implement Dynamic Sections as part of this phase.
7. Do not touch printing.
8. Do not redesign visual identity in this phase.
