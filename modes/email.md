# Mode: email — Cold email package

Draft a send-ready email for a graded lead (dossier required — grade first if
missing). DRAFT-ONLY: never send; the human copies into their client.

Variants (pick from context or ask):
1. **cold-pitch** (default) — first touch to a prospect.
2. **bump** — follow-up in an existing sequence (shorter, adds ONE new element:
   a new hook, proof point, or deadline — never "just following up").
3. **referral-intro** — for a mutual contact to forward: 2 sentences of context
   + 1 of ask, written so the referrer can paste it as-is.

## Structure (cold-pitch)

- **Subject**: ≤6 words, hook-derived, no clickbait, no "Quick question". Give 2 options.
- **Line 1**: the prospect-specific hook (Block E, sourced). Not the user's name or company.
- **Body (3–6 sentences total)**: hook → why it matters to THEM now (timing evidence) → the user's relevant evidenced proof point → concrete, low-friction CTA (artifact or 15 minutes, per persona from `modes/dm.md`).
- **Signature**: from `profile/background.md` identity. No phone in first touch. No attachments unless the user asks.

Persona emphasis, banned phrases, voice-dna: per `modes/_shared.md` and `modes/dm.md`.

## Gates before "send-ready"

1. `node engine/verify-contact.mjs {email}` — exit 0 required (1 = invalid/risky, 2 = unverifiable: no verifier plugin enabled → tell the user to verify manually or enable hunter).
2. `node engine/spam-preflight.mjs --file {draft} --subject "{subject}" --company {company} --contact "{contact}"` — exit 0 required; on failure, fix the flagged issues and re-run (never argue with the linter in the draft's favor).
3. Grade ≥ contact threshold — below it this mode refuses (offer the nurture trigger instead).

## Output

Subject options · body · word count · hooks + sources · "why this angle" ·
which gates passed/pending. Ledger → `Drafted` (or `Queued` if all gates pass).
Also draft the bump variant (scheduled per `preferences.yml → cadence`) so the
sequence exists from day one.
