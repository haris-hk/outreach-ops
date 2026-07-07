# Mode: batch — Parallel grading via headless workers

Grade many prospects in parallel using `batch/batch-runner.sh` and the
self-contained worker prompt (`batch/batch-prompt.md`). Coordination is
filesystem-based (state TSV, PID lock, pause file) — resumable and 429-aware.

## Flow

1. Build `batch/batch-input.tsv`: `id<TAB>target<TAB>source<TAB>notes`
   (targets = company URLs or inbox lines; 10–50 per run).
2. Run: `bash batch/batch-runner.sh --cli claude --parallel 3 [--min-score 3.5]`
   (`--dry-run` first on a new setup; `--status`/`--watch` to monitor;
   pause by touching `batch/batch-runner.paused`, `--resume-paused` to continue;
   `--retry-failed` re-runs failures, max 2 retries).
3. Workers write dossiers + per-lead TSVs to `batch/tracker-additions/`.
4. Merge + integrity: `node engine/merge-tracker.mjs && node engine/dedup-tracker.mjs && node engine/verify-pipeline.mjs`.
5. Triage in ledger mode: priority leads first; log outcomes as sends happen.

## Rules

- Batch NEVER auto-drafts sends beyond what grade-mode produces, and never
  logs `sent` events — humans send.
- Keep `--parallel` ≤ 3 on a Max subscription (rate limits); the runner
  sleeps 300s on 429s automatically.
- Business mode: run per campaign with `OUTREACH_OPS_TRACKER` +
  `OUTREACH_OPS_REPORTS` env overrides pointing into `campaigns/{name}/`.
