# Mode: dm — Short-form opener (DM / connection request / chat)

Draft ONE message within `preferences.yml → dm_max_chars` (default 300) for a
graded lead. Needs a dossier (`data/dossiers/`) — if none exists, run grade
first (or say so and offer to).

Apply `profile/voice-dna.md` fully. DRAFT-ONLY.

## Persona engine

Classify the recipient; persona changes EMPHASIS, not the 3-sentence structure:

### Founder / Owner
1. **Hook** — their specific situation (from Block E, sourced): launch, raise, hiring push, stated goal.
2. **Proof** — the user's single most relevant evidenced outcome (from `profile/offer.yml → proof_points`).
3. **CTA** — low-friction, curiosity-forward: "worth a 15-min look at how?" — never "let's hop on a call to discuss synergies".

### Exec buyer (VP/C-level at larger org)
1. **Hook** — the risk/cost/deadline their team visibly carries (sourced).
2. **Proof** — outcome framed as risk-reduction or ROI, with the metric.
3. **CTA** — offer a concrete artifact ("happy to send the 1-pager") over a meeting.

### Hiring manager (individual mode)
1. **Fit** — role + the 2 hard requirements the user demonstrably meets.
2. **Proof** — one quantified result answering their screening question before they ask.
3. **CTA** — "Happy to share more if this aligns with what you're looking for."

### Peer (referral / community path)
1. **Interest** — genuine, specific reference to their work (post, repo, talk — sourced).
2. **Connection** — what the user is doing in the same space. NOT a pitch.
3. **CTA** — invite their take on a shared problem. The referral happens naturally or not at all.

## Hard rules

- Count characters. Over budget → trim until it fits; offer a shorter variant if within 10% of the cap.
- Lead with the hook, never an introduction. No "I'm passionate", no flattery without evidence, no phone number, no links unless preferences allow one.
- Every claim traceable to `profile/` (user) or the dossier (prospect).
- Match the platform's language/register if stated (e.g. non-English platforms).

## Output

The message · char count vs budget · persona used · hooks + sources · one-line
"why this angle" · a fallback variant (different hook) if a second sourced hook
exists. Update ledger status to `Drafted`.
