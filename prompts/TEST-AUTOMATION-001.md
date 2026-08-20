STATUS: READY

# Automation Pipeline Test

This is a controlled end-to-end test of the SmartCVDsign prompt automation pipeline.

## Task

1. Create a small text file at the repository root named `automation-test-result.txt`.
2. Its complete content must be exactly:

SUCCESS

3. Do not modify any application source code.
4. Create the execution report only in `docs/agent-reports/` using the required date/prompt-slug naming convention.
5. The report must state:
   - the prompt file that was executed;
   - whether the test file was created successfully;
   - the exact path of the report;
   - the final status of the prompt.
6. After the work and report are complete, change this prompt's first line from `STATUS: READY` to `STATUS: COMPLETED`.
7. Do not create any report inside `/prompts/`.

This test is only to verify the pipeline: prompt -> workflow -> Copilot task -> execution -> report -> COMPLETED.
