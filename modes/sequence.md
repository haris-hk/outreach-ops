# Mode: sequence — Multi-touch plan (reply-aware)

Plans and tracks up to `preferences.yml → cadence.max_touches` touches per
lead, with channel rotation and automatic cancellation on reply. DRAFT-ONLY
throughout — the human sends every touch.

## Mechanics

- **Next action** (deterministic): `node engine/outcomes.mjs next --lead {id}
  --max-touches {N} --gap-days {N}` → `send | bump | wait(until) | stop`.
  Any terminal event (replied/positive/meeting/won/lost/bounced) → stop.
- **Reply detection**: `node engine/check-replies.mjs` (read-only Gmail plugin
  when enabled; otherwise the user marks replies in ledger mode). Run it
  before drafting any bump.
- **Dates**: quiet_days from preferences are respected — if a computed date
  lands on one, shift to the next working day.

## Planning a sequence (on request or after a first draft)

1. Confirm grade ≥ threshold and gates passed (verify-contact, spam-preflight).
2. Lay out the plan: touch 1 = recommended channel (from Block F); touch 2 =
   same channel bump; touch 3 = channel rotation (email→DM or DM→email) IF the
   segment/preferences allow a second channel. Never more than max_touches.
3. **Every bump adds exactly ONE new element** — a fresh sourced hook, a new
   proof point, or a genuine deadline. "Just following up" is banned; if
   there is nothing new to add, recommend stopping instead.
4. Draft touch 1 now (email/dm mode); write bump SKELETONS (the new element
   per touch) so the sequence exists from day one.
5. Record in the ledger row: `Next action: bump 2 on {date}`; log the send
   when the user confirms it: `node engine/outcomes.mjs log --lead {id} ...
   --event sent`.

## On each session start (cheap check)

If any leads are in Sent/Bumped, run check-replies + `outcomes.mjs next` per
lead and surface: due bumps, cancelled sequences (replies!), exhausted
sequences (propose: mark Lost or move to Nurture with a watch trigger).
