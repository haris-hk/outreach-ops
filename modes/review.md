# Mode: review — Weekly retro (learning loop)

Turn logged outcomes into PROPOSED changes. Nothing is auto-applied:
`preferences.yml → learning.auto_apply_weight_changes` defaults false and the
proposal→approval step is the product's trust boundary.

## Steps

1. Run `node engine/patterns.mjs` (add `--min-n 5` once volume grows). Read
   totals, per-dimension reply rates, timing tables, and `observations`.
2. Cross-check the ledger: statuses distribution, leads stuck in Drafted
   (gates failing?), Nurture leads whose watch trigger has since fired.
3. Present a compact retro: what worked (with n), what didn't, one honest
   caveat about sample size.
4. PROPOSE, each with evidence and a concrete diff:
   - **Weights** (`profile/_weights.yml`): e.g. timing weight ↑ if fresh-trigger
     leads reply disproportionately. Show before/after YAML.
   - **Angles**: promote/retire angle_tags per reply rate.
   - **Channels** (`preferences.yml → channels`): per-segment default changes.
   - **Voice**: if the user consistently edits drafts the same way before
     sending, propose the corresponding voice-dna rule.
5. Apply ONLY what the user approves, then log the change in the dossier-style
   note `data/dossiers/review-{date}.md` (what changed, why, the numbers) so
   future reviews can evaluate whether the change helped.

## Guardrails

- n < 5 per slice → observation, never a proposal.
- One weights change per review cycle (isolate variables).
- Never propose raising volume as a fix — the threshold philosophy stands.
