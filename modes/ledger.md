# Mode: ledger — View & update lead statuses; log outcomes

`data/leads.md` is the single source of truth. Statuses: canonical values from
`templates/states.yml` only.

## Views

- Default: summary — counts by status, priority leads (≥4.2) not yet Sent,
  overdue follow-ups (per `engine/cadence.mjs`), recent replies.
- `ledger {company|id}`: that lead's full row + dossier link + touch history.

## Updates

- Natural language ("mark Acme replied", "we won Beta Corp").
- Write via editing the row, then ALWAYS run `node engine/verify-ledger.mjs`.
- Status transitions follow `templates/states.yml` order; Drafted → Queued
  additionally requires the email/spam gates (see `modes/email.md`).
- **Outcome logging**: on Sent/Bumped/Replied/Call/Won/Lost run
  `node engine/outcomes.mjs log --lead {id} --company {c} --segment {s}
  --channel {ch} --angle {tag} --event {event}` (angle_tag = the hook family
  used, e.g. `timing-raise`, `oss-hook` — consistent tags power patterns.mjs).
  When the user reports editing a draft before sending, offer to record the
  diff as a voice/preference learning in `profile/voice-dna.md`.
- After batch merges: `node engine/dedup.mjs`.
