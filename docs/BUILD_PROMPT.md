# Master Build Prompt — Outreach-Ops

> Paste everything below the line into Claude Code (or Codex/OpenCode) opened in this folder. It builds the system in milestones, checkpointing with you between each. `CLAUDE.md` and `ARCHITECTURE.md` in this folder are the binding specs.

---

You are building **Outreach-Ops**: a local-first, agent-native system that researches prospects (people and companies), grades who is worth contacting (1–5, threshold-gated), and drafts hyper-personalized outreach (DM / email / call script) so the user can get hired, win clients, or run B2B outbound. **This will be published as the user's own independent open-source project on their own GitHub — a standalone fork, NOT a contribution back to the upstream repo.** It is a fork-rework of https://github.com/santifer/career-ops (MIT licensed — forking, modification, and redistribution are permitted; retain the upstream copyright notice in LICENSE, and purge the "career-ops" name from all other strings — it is trademarked).

Two documents in this directory are the binding specification. Read them completely before writing any code:

1. `CLAUDE.md` — the runtime agent instructions the finished system will use (prime directives, source-of-truth boundary, mode routing, grading thresholds, writing rules). It also governs YOU while building: draft-only (no sending code paths, ever), never-fabricate, no LinkedIn scraping/automation.
2. `ARCHITECTURE.md` — target repo layout, data model, provider-registry contract (§4 — note the prospect-hunting tilt), plugin trust system, grading pipeline, learning loop, batch, updater.

Work in **milestones**. At the end of each: run the tests, run `node engine/doctor.mjs --json`, commit with a conventional-commit message, and STOP for my review before continuing. Never mark a milestone done with failing tests.

## Milestone 0 — Fork & strip (skeleton)

1. `git clone --depth 1 https://github.com/santifer/career-ops.git .upstream` (keep as reference; add to .gitignore). Initialize a fresh git repo for outreach-ops in this folder — do not inherit upstream history. Retain the upstream MIT copyright notice inside LICENSE as required.
2. Port UNCHANGED (rename namespaces only — "career-ops"→"outreach-ops", env prefixes, repo URLs): `providers/_registry.mjs`, `_http.mjs`, `_trust-validator.mjs`, `_types.js`; the whole plugin engine (`plugins.mjs`, `plugins/_engine.mjs`, `_template/`, `plugin-install.mjs`, `plugin-audit.mjs`, `validate-plugin-registry.mjs`); `update-system.mjs`; `doctor.mjs`; `batch/batch-runner.sh` + `batch-prompt.md`; the ledger-integrity suite (`merge-tracker.mjs`, `dedup-tracker.mjs`, `normalize-statuses.mjs`, `verify-pipeline.mjs`, `tracker-parse/utils/tracker.mjs`, `add-entry.mjs`, `find.mjs`); `followup-cadence.mjs` + `followup-seed.mjs`; `analyze-patterns.mjs`; `detect-reposts.mjs`; `generate-pdf.mjs` + fonts; liveness suite; `dashboard/` (Go TUI); every `*.test.mjs` + `test-all.mjs`; also port `scaffolder/` (npx installer), release-please config, Dockerfile, and the community governance files (CONTRIBUTING, GOVERNANCE, CODE_OF_CONDUCT, SECURITY, issue templates) — this ships as a public open-source repo, and that governance maturity is part of its trust story. Place scripts under `engine/` per ARCHITECTURE.md §2 and fix import paths.
3. Port the 49 job-board provider modules into `providers/ats/` (they become the raw layer under `hiring-signals.mjs` in M2).
4. DELETE all job-search-only surface: interview/cover/latex/training/project/apply modes and scripts, `interview-prep/`, `jds/`, CV templates-as-CV, `match-star.mjs`, `application-answers.mjs`, `prepare-application.mjs`, `generate-cover-letter.mjs`, `cv-sync-check.mjs`, `role-matcher.mjs`, `classify-tier.mjs`, all non-English READMEs and `modes/{ar..zh}` language packs, `modes/regional/`, press assets, hero images.
5. Rewrite `DATA_CONTRACT.md` for the new tree (user layer: `profile/*`, `data/*`, `campaigns/*`, `plugins.local/`, `plugins.lock`, `config/plugins.yml`, `profile/_weights.yml`). Update `update-system.mjs` SYSTEM_PATHS/USER_PATHS arrays to match, and keep the paths-coverage validator green.
6. Repoint updater constants (CANONICAL_REPO / RAW_VERSION_URL / RELEASES_API) to the user's own GitHub org/repo — ask for the exact URL before wiring; until the remote exists, `update-system.mjs check` must return `offline` cleanly. Set VERSION to 0.1.0.

**Accept when:** `node engine/test-all.mjs` passes; `node engine/doctor.mjs --json` returns valid JSON with `onboardingNeeded: true`; grep for "career-ops" returns only LICENSE/attribution hits.

## Milestone 1 — Agent layer & first graded lead

1. Copy the `CLAUDE.md` from this folder to the repo root as the canonical agent file; generate `AGENTS.md` as the canonical body and thin wrappers (`CLAUDE.md` imports it — follow upstream's wrapper pattern), plus `.agents/skills/outreach-ops/SKILL.md` router with the mode table from CLAUDE.md, symlinked into `.claude/`, `.opencode/`, `.qwen/`, `.grok/`, `.antigravitycli/`, `.kimi/`.
2. Write `modes/_shared.md` (full rubric spec: blocks A–G, weight table, thresholds, bounded budgets, signal-reliability table, source-of-truth rules) and `modes/_weights.default.yml` + loader that merges `profile/_weights.yml` overrides.
3. Write `modes/onboard.md` (conversational profile interview → writes `profile/background.md`, `offer.yml`, `icp.yml`, `preferences.yml`) and ship `profile/*.example` templates with a realistic filled example (a freelance AI engineer selling to seed startups).
4. Write `modes/grade.md` (per ARCHITECTURE.md §6, including the Step 0.5 legitimacy gate and the below-threshold refusal), `modes/dm.md` (port upstream `contacto.md`'s persona engine — 3-sentence framework, char budget, channel-preference reading; personas: founder / exec buyer / hiring manager / peer), `modes/email.md` (port upstream email.md invocation patterns; variants: cold pitch, follow-up bump, referral intro), `modes/dossier.md` (port deep.md, re-axed: strategy&priorities / recent moves / pain evidence / budget signals / competitors / your angle), `modes/ledger.md`.
5. Retarget the ledger: `data/leads.md` columns and `templates/states.yml` statuses per ARCHITECTURE.md §3; adapt the integrity suite (rename to `engine/ledger.mjs`, `verify-ledger.mjs` etc.) and its tests.
6. Create `test/fixtures/prospects/` with 5 synthetic prospects (varied quality) and expected grade RANGES; add a fixture-regression note to `modes/_shared.md` so grading changes get re-checked against them.

**Accept when:** in a fresh session, onboarding triggers and writes profile files from a conversational interview; pasting a company URL + contact name produces dossier → grade with per-block reasoning → channel recommendation → DM + email drafts (with char counts, cited hooks) → ledger row; a deliberately weak fixture prospect grades <3.5 and the system refuses send-ready drafts; all tests pass.

## Milestone 2 — Prospect-hunting signal engine

1. Implement the Signal record type in `providers/_types.js` per ARCHITECTURE.md §4 and adapt `engine/scan.mjs` to: per-segment seeds → provider fan-out → trigger-matching against `icp.yml` → dedup vs `scan-history.tsv` → `data/inbox.md` with a "why now" line per lead.
2. Build launch providers: `hiring-signals.mjs` (façade over `providers/ats/*` mapping postings→`{signal_type:'hiring', hiring_for}` triggers), `github-orgs.mjs`, `news-rss.mjs`, `hn-launches.mjs`, `directories.mjs` (port the yc/a16z seed-list mechanism), `funding.mjs` (free feeds only; stub cleanly if no reliable free source, documented). Each: hostname allowlist, HTTPS-only, `ctx` budgets, trust-validated output, a small test with recorded fixtures (no live HTTP in CI).
3. Write `modes/scan.md` (orchestration + inbox triage: agent summarizes new signals, proposes which to grade).
4. Build `engine/enrich.mjs` (lazy, cost-ordered, per-lead caching) and `engine/verify-contact.mjs` (gates Drafted→Queued). Build enrichment plugin scaffolds `plugins/explorium/` and `plugins/hunter/` from `plugins/_template/`: manifest (`hooks:[enrich]`/`[verify]`, `requiredEnv`, `allowedHosts`), thin client, `skill.md`. They must no-op gracefully without keys.
5. Write `docs/ADDING_PROVIDERS.md`: the contract, the template, allowlist rules, fixture-test requirement — the community on-ramp for contributing niche signal providers (this registry is the project's open-source growth engine; make the recipe genuinely easy to follow).

**Accept when:** `node engine/scan.mjs --segment <example>` produces a deduped inbox with why-now lines using ≥3 providers on fixtures; providers pass shape validation; a lead flows inbox → grade → ledger without manual file surgery; enrichment plugins load, gate on consent+keys, and no-op cleanly when absent.

## Milestone 3 — Sequencing, outcomes, learning loop

1. `engine/outcomes.mjs` + `data/outcomes.tsv` schema; ledger mode logs events; adapt `engine/cadence.mjs` and write `modes/sequence.md` (multi-touch plan, reply-aware cancellation).
2. Rework `plugins/gmail/` to READ-ONLY reply detection (hooks:[replies]) feeding outcomes.tsv; document the OAuth scopes as read-only.
3. Adapt `engine/patterns.mjs` to slice outcomes by segment/channel/angle/personalization-density/time; write `modes/review.md` (weekly retro → PROPOSED diffs to weights/angles, human-approved only).
4. Build `engine/spam-preflight.mjs` (trigger vocabulary, link count, length, personalization-density, caps/exclamation lint — with tests) and `engine/deliverability-doctor.mjs` (SPF/DKIM/DMARC DNS checks + volume advisories). Wire both into the Drafted→Queued gate.
5. Repurpose `engine/render-dossier.mjs` + `templates/dossier.html` for one-page lead-dossier PDFs.

**Accept when:** full loop demonstrable on fixtures — grade → sequence plan → simulated outcomes logged → `review` proposes a concrete weight diff and applies it only after approval; preflight blocks a spammy draft; dossier PDF renders.

## Milestone 4 — Batch, business mode, surfaces, launch prep

1. Wire `batch/` to `modes/batch.md` grading (self-contained worker prompt); verify resume/pause/retry on a 10-fixture run.
2. `campaigns/{name}/` structure + `modes/campaign.md` (per-campaign icp/preferences/ledger/voice, `sender:` profiles); campaign-scoped ledger integrity.
3. Re-skin the Go TUI (tabs: All / Priority ≥4.2 / Queued / Awaiting reply / Won; sort by grade/date/segment) and the `web/` Next.js board (Pipeline→Leads, Explore→Scan, Apply→Draft review, Analytics→Reply funnel). Keep both as pure local views over the same files.
4. Write `LEGAL.md` (draft-first posture; CAN-SPAM, GDPR/PECR, TCPA notes; platform-ToS warnings) and a public-facing `README.md` (positioning: "researches like an analyst, grades like a skeptic, writes like you — sends nothing"; quick start via `npx` scaffolder; provider-contribution pitch; honest disclaimer section modeled on upstream's) + `docs/` (SETUP, FAQ, RUNNING_ON_A_BUDGET, SUPPORTED_CLIS, ADDING_PROVIDERS, PLUGINS, ARCHITECTURE→copy from spec).
5. Publish prep: create the GitHub repo under the user's account (ask for the name), push, wire release automation, and confirm the updater's check works against the live repo.
6. Final sweep: `test-all` green, doctor green, paths-coverage green, no "career-ops" strings outside LICENSE, no sending code path anywhere (grep for nodemailer/smtp/sendmail/gmail.send and fail if found in core).

**Accept when:** an agency-style demo runs two campaigns side by side; batch grades 10 fixtures in parallel and merges cleanly; both UIs render the ledger; all checks green.

## Standing constraints (all milestones)

- Draft-only: never add sending, submission, or LinkedIn-automation code. Mail plugins read-only by manifest.
- Every deterministic script gets a test; no live HTTP in tests (recorded fixtures).
- All personalization/user data in the user layer; keep the updater's path arrays and coverage validator in sync with every new file.
- Hard research budgets stay written into the modes; zero-token rule for everything scriptable.
- Conventional commits; update CHANGELOG per milestone.
- When a spec detail is ambiguous, prefer the upstream career-ops pattern (it's battle-tested), and note the decision in `docs/DECISIONS.md`.
