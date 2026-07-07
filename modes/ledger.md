# Mode: ledger — View & update lead statuses; log outcomes

`data/leads.md` is the single source of truth. Statuses: canonical values from
`templates/states.yml` only.

## Views

- Default: summary — counts by status, priority leads (≥4.2) not yet Sent,
  overdue follow-ups (per `engine/followup-cadence.mjs`), recent replies.
- `ledger {company|id}`: that lead's full row + dossier link + touch history.

## Updates

- Natural language ("mark Acme replied", "we won Beta Corp").
- Write via editing the row, then ALWAYS run `node engine/verify-pipeline.mjs`.
- Status transitions follow `templates/states.yml` order; Drafted → Queued
  additionally requires the email/spam gates (see `modes/email.md`).
- **Outcome logging**: on Sent/Bumped/Replied/Call/Won/Lost also append to
  `data/outcomes.tsv`: `lead_id  segment  channel  angle_tag  variant  ts  event`
  (M3 formalizes via `engine/outcomes.mjs`; until then append the TSV line
  directly). When the user reports editing a draft before sending, offer to
  record the diff as a voice/preference learning in `profile/voice-dna.md`.
- After batch merges: `node engine/dedup-tracker.mjs`.
