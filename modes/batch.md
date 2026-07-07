# Mode: batch — Parallel grading (fully lands in Milestone 4)

Target: `batch/batch-input.tsv` (id, target, segment) → `batch/batch-runner.sh
--parallel N` headless workers, each running grade.md self-contained → TSV rows
→ `node engine/merge-tracker.mjs` → dedup + verify. Resumable
(batch-state.tsv), rate-limit aware.

Until M4 rewiring: grade sequentially in-session; keep batches ≤10 and write
ledger rows through the normal grade-mode path.
