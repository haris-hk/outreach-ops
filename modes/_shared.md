# _shared.md — Rubric, Weights & Global Rules

<!-- SYSTEM LAYER. Improves with each release. User overrides live in
     profile/ (read AFTER this file — they always win). -->

## Sources of Truth (EXCLUSIVE)

Outreach content (DMs, emails, call scripts, dossier facts) may ONLY draw claims from:

| Source | Path | Used for |
|---|---|---|
| Background | `profile/background.md` | Facts about the USER — every claim needs its evidence entry |
| Offer | `profile/offer.yml` | What's being sold / sought; proof_points are the ONLY citable claims list |
| ICP | `profile/icp.yml` | Segments, triggers, watchlists |
| Preferences | `profile/preferences.yml` | Channels, tone, cadence, never_contact, thresholds |
| Voice DNA | `profile/voice-dna.md` | HOW text reads (style only — never introduces facts) |
| Writing samples | `profile/writing-samples/` | Style calibration only |
| Dossiers | `data/dossiers/*` | Facts about the PROSPECT — each with a cited source |

**RULES (non-negotiable):**
- Facts about the user come from `profile/`; facts about the prospect come from the dossier/enrichment WITH a source. Nothing else exists.
- Claims get reformulated, never fabricated. No evidence → ask the user or omit. Silence beats manufactured detail.
- Never claim the user built/authored/achieved something not written in `profile/`. Tool-of-trade conflation (user uses X → user built X) is forbidden.
- Honor `preferences.yml → never_contact` before ANY draft.
- DRAFT-ONLY: no mode, script, or plugin sends anything, ever.

## Grading Rubric (Blocks A–G)

Every grade evaluates seven blocks. Bounded research: **max 5 web searches total (D+G combined)**; deep dossiers (dossier mode): max 12. At the cap: stop, mark missing data "unavailable".

| Block | Content | Notes |
|---|---|---|
| **A — Snapshot** | Who they are: firmographics, segment match (from `icp.yml`), one-line summary | Segment detection drives every later block's emphasis |
| **B — Fit map** | Their observable needs ↔ the user's offer, line by line, each with evidence; gaps flagged honestly | Needs come from signals (hiring, launches, stack, news), not assumptions |
| **C — Angle strategy** | What to lead with; seniority/tone calibration; what NOT to say | Persona changes emphasis, not structure |
| **D — Signal research** | Timing evidence: funding, hiring, launches, pain signals (bounded searches) | Prefer queries answering multiple questions; cite everything |
| **E — Personalization hooks** | 2–3 specific hooks, EACH with a cited source | A hook without a source is not a hook |
| **F — Outreach package** | Channel recommendation + reasoning; drafts per channel | Only produced at/above threshold |
| **G — Data legitimacy** | Contact still in role? Company alive? Email verifiable? Bounce/staleness risk | Run BEFORE spending effort: dead lead = stop at A |

### Score

Weighted 1–5. Read weights: `node engine/weights.mjs` (merges `modes/_weights.default.yml` ← `profile/_weights.yml` override).

| Dimension | Default weight | 5 looks like | 1 looks like |
|---|---|---|---|
| Fit | .30 | Their need maps directly to a proof point | Generic "could help anyone" fit |
| Timing / trigger | .25 | Trigger fired <30 days ago | No trigger, cold as ice |
| Reachability | .15 | Named contact, verified channel | No idea who to talk to |
| Budget proxy | .15 | Fresh funding / hiring / revenue signals | Signals of no budget |
| Personalization depth | .15 | 3 sourced hooks available | Nothing specific findable |
| Red flags | subtractive | — | Never-contact match, dead company, wrong region, ethics |

### Thresholds (contact_threshold in preferences.yml, default 3.5)

- **≥ 4.2 — Priority.** Full outreach package, top of queue.
- **3.5–4.1 — Standard.** Full outreach package.
- **3.0–3.4 — Nurture.** NO send-ready drafts. Log with the trigger to watch for.
- **< 3.0 — Disqualify.** Log reason. Do not draft, do not revisit without a new trigger.

Below threshold, the refusal is the product: state the grade, the reason, and what WOULD change it.

## Channel Recommendation Logic

- **Email** when a verified address exists AND the message needs >300 chars of substance. Requires `engine/verify-contact.mjs` pass before Queued.
- **DM** when the hook is social/peer-flavored, the prospect is visibly active on the platform, or brevity strengthens the angle. Hard cap: `preferences.yml → dm_max_chars` (default 300).
- **Call** only when `preferences.yml` allows it AND the segment shows phone receptivity.
- Per-segment overrides in `preferences.yml → channels` always win.

## Signal Reliability (Block D/G weighting)

| Signal | Reliability | Notes |
|---|---|---|
| Posting/pricing/product page content | High | Direct observable fact — quote verbatim |
| Fresh funding announcement | High | Date it; >6 months old is timing-neutral |
| Hiring for role X | Medium-High | Budget+pain proxy; verify posting is live |
| News/blog mentions | Medium | Personalization material; verify recency |
| Tech-stack fingerprints | Medium | Corroborate with a second signal |
| Review-site complaints | Low-Medium | Use as supporting signal only, never as the hook's sole source |
| Inference from absence | Never | Silence is not a signal |

## Writing Rules (all drafts)

- Apply `profile/voice-dna.md` fully; calibrate against `profile/writing-samples/`.
- Lead with the prospect-specific hook (Block E, with source) — never with an introduction.
- Personas set EMPHASIS, not structure: founder → vision/outcome · exec buyer → risk/ROI · hiring manager → capability/proof · peer → shared craft, no pitch.
- Banned: "I'm passionate about", "I hope this finds you well", "quick question", "just following up", flattery without evidence, corporate-speak. Every clause earns its characters.
- Never share the user's phone number in a first touch. No attachments unless asked.
- Output every draft with: char/word count, hooks used + sources, one-line "why this angle".

## Ledger Discipline

`data/leads.md` is the single source of truth. Statuses: EXACTLY one canonical value from `templates/states.yml` (New → Graded → Queued → Drafted → Sent → Bumped → Replied → Call → Won/Lost/Nurture/Disqualified). Columns: `# | Date | Company | Contact | Role | Segment | Grade | Channel | Status | Dossier | Notes`. Grade cells are `N.N/5`. Writes go through `engine/` scripts or are followed by `node engine/verify-ledger.mjs`.

## Fixture Regression (contributors)

Any change to this rubric, the weights, or `modes/grade.md` MUST be re-checked against `test/fixtures/prospects/` — each fixture declares an expected grade RANGE in its front-matter. If a fixture lands outside its range, either the change is wrong or the fixture expectation needs a justified update in the same commit.
