# Mode: grade — Full A–G Lead Evaluation (default mode)

Input: a company URL, a person + company, a pasted profile/about text, or a
lead ID from `data/inbox.md` / `data/leads.md`.

Read first: `AGENTS.md` → `modes/_shared.md` → `profile/*` (overrides win).
Run `node engine/weights.mjs` for effective weights and thresholds.

## Step 0 — Segment detection

Match the prospect against `profile/icp.yml` segments (firmographics + roles +
triggers). Report the best-matching segment id, or "off-ICP" with the nearest
segment and what disqualifies it. Segment drives Block emphasis and the
channel default. Off-ICP is not an automatic disqualify — but say so plainly.

## Step 0.5 — Legitimacy gate (BEFORE any research spend)

A dead lead must never consume a full A–G evaluation:

1. Company alive? (site loads, recent activity). If a URL was given, fetch it.
2. Contact plausible? (role exists at company per available data; no evidence
   the person left).
3. `preferences.yml → never_contact` check — match = **stop immediately**,
   status Disqualified, reason logged.

If the gate fails → write a one-line ledger row (Disqualified/reason) and stop.

## Blocks A–G

Produce all seven blocks per `_shared.md` rubric. Hard cap: **5 web searches
total** across D+G. No research subagents. Requirements per block:

- **A**: snapshot table (company, size/stage guess with source, segment, contact
  name+role if known, one-line "who they are").
- **B**: two-column fit map — their observable need (with source) ↔ the user's
  offer/proof point (from `profile/`). Gaps listed honestly with mitigation or
  "no mitigation — say nothing about this".
- **C**: the angle. One primary, one fallback. Include "do NOT say" list
  (over-claims, sore spots, competitor mentions).
- **D**: timing evidence with dates + sources. No timing evidence = say so;
  timing score suffers, don't pad.
- **E**: 2–3 personalization hooks, each: hook → source URL → why it lands.
  Zero verifiable hooks = personalization_depth scores 1.
- **F**: only if score ≥ contact threshold. Channel recommendation + reasoning,
  then drafts: DM (≤ dm_max_chars, counted) AND email (subject + body) for the
  recommended + runner-up channel. Full writing rules from `_shared.md`.
- **G**: contact-data risk: email verifiable? (note: `engine/verify-contact.mjs`
  gates Queued), person-in-role confidence, company-health flags.

## Scoring & verdict

Weighted score per `engine/weights.mjs` output. Show the arithmetic (dimension
scores × weights, red-flag subtractions). Verdict per thresholds:
priority / standard / nurture (no drafts; name the trigger to watch) /
disqualify (reason).

## Output & ledger

1. Save the full evaluation as `data/dossiers/{NNN}-{company-slug}-{YYYY-MM-DD}.md`
   (front-matter: company, contact, segment, grade, channel, status).
2. Append the ledger row to `data/leads.md`
   (`# | Date | Company | Contact | Role | Segment | Grade | Channel | Status | Dossier | Notes`),
   status `Graded` (or `Nurture`/`Disqualified`), then run
   `node engine/verify-ledger.mjs`.
3. Reply in chat with: grade + one-line verdict, the block summaries, drafts
   (if produced) with char counts + hook sources + "why this angle".
