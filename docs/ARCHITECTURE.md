# Outreach-Ops — Architecture

Local-first, agent-native prospect research, grading, and outreach engine. **Independent open-source project published on Haris's own GitHub** — a standalone fork-rework of career-ops v1.17 (MIT — retain upstream notice in LICENSE), not an upstream contribution. One engine, two modes: **individual** (get hired / win clients) and **business** (B2B outbound, multi-campaign).

Design principle inherited and enforced everywhere: **the LLM does judgment and prose; deterministic Node scripts do everything repeatable** (scanning, dedup, verification, cadence math, pattern mining, rendering — all zero-token).

---

## 1. System Overview

```
                       ┌─────────────────────────────────────────┐
                       │           AI Agent (BYO-LLM)             │
                       │ Claude Code / Codex / OpenCode / Ollama  │
                       │  reads CLAUDE.md→_shared.md→modes/*.md   │
                       └───────┬───────────────┬─────────────────┘
                               │ judgment       │ drafting
       ┌───────────────────────┼────────────────┼───────────────────────┐
       │                       ▼                ▼                       │
       │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐         │
       │  │ SIGNAL ENGINE│  │ GRADING      │  │ COMPOSER      │         │
       │  │ scan.mjs +   │─▶│ ENGINE       │─▶│ dm/email/call │         │
       │  │ providers/   │  │ A–G rubric   │  │ + voice-dna   │         │
       │  │ (prospect    │  │ _weights.yml │  │ + spam        │         │
       │  │  hunting)    │  │              │  │   preflight   │         │
       │  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘         │
       │         │ inbox.md        │ dossiers/       │ drafts           │
       │         ▼                 ▼                 ▼                  │
       │  ┌───────────────────────────────────────────────────┐         │
       │  │   LEAD LEDGER  data/leads.md (+ SQLite index)      │         │
       │  │   New→Graded→Queued→Drafted→Sent→…→Won/Lost        │         │
       │  └──────┬──────────────────────────────┬─────────────┘         │
       │         ▼                              ▼                       │
       │  ┌──────────────┐              ┌───────────────┐               │
       │  │ SEQUENCER    │              │ LEARNING LOOP │──▶ proposes   │
       │  │ cadence.mjs, │              │ outcomes.tsv +│    weight /   │
       │  │ reply-aware  │              │ patterns.mjs  │    angle diffs│
       │  └──────────────┘              └───────────────┘               │
       └────────────────────────────────────────────────────────────────┘
                    │                          │
        ┌───────────┼──────────────────────────┼───────────────┐
        ▼           ▼                          ▼               ▼
  ┌──────────┐ ┌─────────────────┐   ┌──────────────┐  ┌─────────────┐
  │ providers│ │ plugins (keyed) │   │ Go TUI       │  │ Next.js web │
  │ (free    │ │ enrichment,     │   │ lead board   │  │ lead board  │
  │ signals) │ │ verify, gmail-RO│   │              │  │ (local)     │
  └──────────┘ └─────────────────┘   └──────────────┘  └─────────────┘
```

## 2. Repository Layout

```
outreach-ops/
├── CLAUDE.md / AGENTS.md / CODEX.md ...   # agent layer (wrappers import AGENTS.md)
├── .agents/skills/outreach-ops/SKILL.md   # router; symlinked per CLI (.claude/ .qwen/ ...)
├── DATA_CONTRACT.md · LEGAL.md · CONTRIBUTING.md · TRADEMARK.md
│
├── profile/                    # ══ USER LAYER ══
│   ├── background.md  offer.yml  icp.yml  preferences.yml
│   ├── voice-dna.md   writing-samples/
│   └── _weights.yml            # user override of grading weights
│
├── modes/                      # agent skills (system layer)
│   ├── _shared.md              # rubric, thresholds, global rules
│   ├── _weights.default.yml
│   ├── onboard.md grade.md scan.md dossier.md
│   ├── dm.md email.md call.md sequence.md
│   ├── batch.md ledger.md review.md campaign.md
│
├── providers/                  # ★ PROSPECT-SIGNAL REGISTRY (see §4)
│   ├── _registry.mjs _http.mjs _trust-validator.mjs _types.js
│   ├── hiring-signals.mjs      # 49 ATS modules repointed: hiring = buying signal
│   ├── ats/                    # the ported career-ops board modules it wraps
│   ├── funding.mjs github-orgs.mjs news-rss.mjs
│   ├── producthunt.mjs hn-launches.mjs
│   ├── directories.mjs         # niche directories / registries / awards lists
│   └── tech-stack.mjs          # public stack fingerprinting (BuiltWith-class, key-free tier)
│
├── plugins/                    # keyed integrations, trust-gated (see §5)
│   ├── _engine.mjs  _template/
│   ├── explorium/ hunter/ apollo/        # enrichment + email find/verify
│   ├── gmail/                            # READ-ONLY reply detection
│   └── notion/ sheets/ hubspot/          # CRM export
├── plugins-registry.json       # trust root: approved community plugins @ pinned commits
│
├── engine/                     # deterministic scripts (zero-token)
│   ├── scan.mjs enrich.mjs verify-contact.mjs
│   ├── ledger.mjs merge.mjs dedup.mjs normalize.mjs verify-ledger.mjs
│   ├── cadence.mjs outcomes.mjs patterns.mjs
│   ├── spam-preflight.mjs deliverability-doctor.mjs
│   ├── render-dossier.mjs      # Playwright HTML→PDF one-pagers
│   ├── doctor.mjs update-system.mjs
│   └── *.test.mjs  test-all.mjs
│
├── data/                       # ══ USER LAYER ══
│   ├── leads.md (+ leads.db derived index)  inbox.md
│   ├── signal-history.tsv  scan-history.tsv (ats)  outcomes.tsv  dossiers/
├── campaigns/{name}/           # business mode: per-campaign icp/preferences/ledger/voice
├── batch/                      # headless worker orchestration (TSV state machine)
├── dashboard/                  # Go TUI  ·  web/  # Next.js local UI
├── templates/                  # states.yml, dossier.html, email skeletons
└── scaffolder/                 # npx one-command installer
```

## 3. Data Model

**`profile/offer.yml`** — `mode: individual|business`; offer headline, deliverables, pricing band, differentiators; `proof_points[]` each with `evidence_url` + `hero_metric` (only evidenced claims may appear in drafts).

**`profile/icp.yml`** — `segments[]`: id, firmographics (size/stage/industry/geo), target roles, `triggers[]` (raised_round, hiring_for:[...], launched_product, exec_hire, tech_adopted), `channel_default`; plus `watchlists.companies[]` for named-account monitoring.

**`profile/preferences.yml`** — per-segment channel map, tone, `never_contact[]`, cadence (max_touches, min_gap_days, quiet_days), `dm_max_chars`, `learning.auto_apply_weight_changes: false`.

**`data/leads.md`** — canonical, human-editable markdown table: `ID | Company | Contact | Role | Segment | Grade | Channel | Status | Last touch | Next action | Dossier`. Derived SQLite (`leads.db`) rebuilt by `ledger.mjs sync`, safe to delete. Statuses canonicalized against `templates/states.yml`.

**`data/outcomes.tsv`** — append-only event log: `lead_id, segment, channel, angle_tag, template_variant, ts, event(sent|opened|replied|positive|bounced|meeting|won|lost)`. The learning-loop substrate.

**`data/dossiers/{###}-{slug}-{date}.md`** — A–G research report per prospect; every prospect-fact carries a source link.

## 4. Provider Registry — tilted to prospect hunting ★

The registry is the open-source growth engine. Career-ops used it to scan job boards; here every provider answers one question: **"which companies/people should be on my radar this week, and why now?"**

**Contract** (unchanged from career-ops — deliberately trivial so adding a new source stays an afternoon of work, for Haris or any community contributor):

```js
// providers/_types.js
export default {
  id: 'funding',                      // matched against `provider:` in icp.yml watch config
  detect(entry) → {url}|null,         // optional: auto-detect from a watchlist entry
  fetch(entry, ctx) → [Signal]        // required
}
// Signal (normalized output — replaces career-ops' job-posting record):
{ company, company_url, signal_type,  // 'hiring'|'funding'|'launch'|'news'|'oss'|'listing'|'stack'
  headline,                            // "raised $8M Series A"
  detail, source_url, observed_at,
  contact_hint,                        // optional: role/name surfaced by the source
  segment_match: [icpSegmentIds] }     // filled by scan.mjs trigger-matching, not the provider
```

**Loader mechanics** (ported verbatim from `_registry.mjs`): loads every non-`_`-prefixed `*.mjs` alphabetically (deterministic detect priority), validates shape, logs-and-skips malformed modules — a broken community provider can never crash a scan. All HTTP goes through `_http.mjs` (shared timeouts, retries, `ctx.maxPages` pagination budgets); every provider hardcodes a hostname allowlist (HTTPS-only) so a hostile config entry can't turn it into an SSRF gadget; output passes `_trust-validator.mjs` shape checks before entering the pipeline.

**Launch provider set (the prospect-hunting tilt):**

| Provider | Signal it hunts | Why it matters |
|---|---|---|
| `hiring-signals.mjs` + `ats/*` | Company hiring for role X (Greenhouse/Lever/Ashby/Workday + 45 more, ported from career-ops) | Hiring for X = budget + pain for X-services. Free intent data incumbents charge for. For individual mode this doubles as literal job discovery |
| `funding.mjs` | New rounds from free feeds/registries | Fresh money = active buying window; timing trigger |
| `github-orgs.mjs` | OSS activity, new repos, stack, hiring links in READMEs | Technical fit evidence + warm peer-flavored hooks |
| `producthunt.mjs` / `hn-launches.mjs` | Launches, Show HN, who's-hiring threads | Launch week = receptive founders; contact_hint often = the founder |
| `news-rss.mjs` | Company blogs, press RSS, niche trade feeds | Personalization raw material with citable sources |
| `directories.mjs` | Niche directories, award lists, accelerator portfolios (YC/a16z-style seed lists ported) | Segment seeding for `scan --seeds` |
| `tech-stack.mjs` | Public stack fingerprints | "They run X, you specialize in X" fit signals |
| `sec-edgar.mjs` | US Form D fundraising filings (public SEC API) | Structured funding signal, zero keys |
| `producthunt.mjs` / `github-search.mjs` | Launches via public RSS · new in-space repos | Discovery beyond the watchlist |

**Scan flow** (`engine/scan.mjs`, ported skeleton): per-segment seeds → provider fan-out (parallel, budgeted) → trigger-match against `icp.yml` → dedup vs `data/signal-history.tsv` → write `data/inbox.md`, each lead with a one-line **"why now"**. Optional `--verify` runs liveness checks (Playwright) on source URLs before they hit the inbox. Zero LLM tokens end-to-end.

**Community contribution path:** `_types.js` + the provider template + `docs/ADDING_PROVIDERS.md` recipe (contract, allowlist rules, fixture-test requirement). A niche provider (e.g. "Shopify app store new listings", a regional business registry, a vertical directory) is ~100–200 lines against a stable contract — contributors point the scanner at their own hunting grounds without touching the engine, and every merged provider improves the scanner for everyone. This network effect is the project's moat as an open-source repo.

## 5. Plugin Trust System (keyed integrations)

Separate from providers because plugins carry credentials and PII. Each has `manifest.json`: `id, version, apiVersion, hooks[] (enrich|verify|replies|export), requiredEnv[], allowedHosts[], skill, humanInTheLoop`. **Two gates to run:** recorded consent (`node plugins.mjs enable <id> --confirm` after a capability card) AND keys present in `.env`. Trust tiers: `bundled` → `approved` (pinned commit in `plugins-registry.json`, the trust root) → `community-unverified` → `off-registry`. Tamper detection: file changes without a version bump block the plugin until reviewed and re-pinned. Plugin `skill.md` docs are treated as untrusted input by the agent (see CLAUDE.md). The Gmail plugin is **read-only by manifest** (`hooks: [replies]`, no send scope requested in OAuth) — reply detection feeds `outcomes.tsv`; sending stays human.

**Enrichment cost order** (`engine/enrich.mjs`): free providers → cached results → paid plugin credits, and only for leads that already passed firmographic filters. `engine/verify-contact.mjs` (Hunter/NeverBounce-class plugin) gates Drafted→Queued: no unverified address ever gets a send-ready draft.

## 6. Grading Pipeline

`modes/grade.md`: Step 0 segment detection → Step 0.5 legitimacy gate (contact in role? company alive? email verifiable? — never spend a full evaluation on a dead lead) → Blocks A (snapshot) · B (fit map vs offer, line-by-line with evidence) · C (angle strategy) · D (signal research, ≤5 searches) · E (2–3 personalization hooks, each cited) · F (channel recommendation + drafts: DM ≤300 chars, email subject+body, call opener) · G (data legitimacy/bounce risk). Score = weighted 1–5 from `_weights.yml` (fit .30, timing .25, reachability .15, budget-proxy .15, personalization-depth .15; red flags subtractive). Thresholds: ≥4.2 priority / 3.5–4.1 standard / 3.0–3.4 nurture / <3.0 disqualify — below threshold the composer refuses send-ready drafts.

## 7. Sequencer & Learning Loop

`engine/cadence.mjs` computes touch dates from `preferences.yml`; `modes/sequence.md` plans channel rotation; the Gmail plugin (or manual ledger updates) marks replies, which auto-cancel pending bumps. `engine/patterns.mjs` slices `outcomes.tsv` by segment/channel/angle/personalization-density/time and `modes/review.md` turns the stats into PROPOSED diffs to `_weights.yml`, angle retirement/promotion, and voice-dna refinements — human-approved, never auto-applied by default. This per-user private model is the compounding moat.

## 8. Batch & Business Mode

`batch/batch-runner.sh` (ported): `batch-input.tsv` → N headless workers (`claude -p` / `codex exec`) each grading one lead with a self-contained prompt → TSV outputs merged by `engine/merge.mjs` with dedup + integrity checks. Coordination through the filesystem (state TSV, PID lock, pause file, retries, 429 backoff) — resumable and robust. Business mode = `campaigns/{name}/` each with own icp/preferences/ledger/voice-dna + a `sender:` profile per draft; real-time multi-seat collab is out of core (paid sync server later).

## 9. Update System & Data Contract

`engine/update-system.mjs` (ported): semver check against the project's own GitHub repo VERSION/releases → timestamped backup branch → git-checkout of SYSTEM_PATHS only → dependency reinstall under timeout budgets → `rollback` restores newest backup. `USER_PATHS` (profile/, data/, campaigns/, plugins.local/, plugins.lock, _weights.yml) are never touched; the paths-coverage validator fails if a new file is unclassified. This layer is what lets the project ship updates weekly to open-source users without ever clobbering their profile or ledger data.

## 10. Security & Compliance Summary

Draft-first enforced in three layers: mode prompts (never send) · no sending code paths in core · mail plugins read-only by manifest. Hostname allowlists per provider; trust-validated responses; plugin two-gate consent + tamper detection; source-of-truth boundary prevents fabricated claims (fraud exposure in a sales context); spam-preflight + deliverability-doctor gate send-readiness; no LinkedIn scraping or automation anywhere in core, ever. `LEGAL.md` documents CAN-SPAM / GDPR-PECR / TCPA / platform-ToS posture.

## 11. Cost Architecture

Zero-token discovery (pure HTTP providers) · hard research caps in grading modes · lazy cost-ordered enrichment · batch on the user's flat-rate CLI subscription · standalone runners (Ollama local / OpenRouter / Gemini free tier) for users with no agent CLI. These budgets are what make "~$0/month" true rather than marketing.
