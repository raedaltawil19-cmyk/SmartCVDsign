STATUS: READY

# TEST-AUTOMATION-002 — Real prompt queue test

Execute this prompt as a pipeline verification test.

## Task
1. Create a new file at the repository root named `automation-proof-002.txt`.
2. The file must contain exactly this text: `PIPELINE-002-OK`
3. Do not modify any application source code.
4. Create an execution report in `/docs/agent-reports/` named `2026-08-20-test-automation-002.md`.
5. The report must state:
   - the prompt file executed
   - that `automation-proof-002.txt` was created
   - the exact content written to the test file
   - the report path
   - the final prompt status
6. After successful execution, change this prompt's first line from `STATUS: READY` to `STATUS: COMPLETED`.

## Success condition
The pipeline is successful only if the test file, report, and COMPLETED status are all present on `main`.
