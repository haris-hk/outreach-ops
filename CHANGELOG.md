# Changelog

## [0.3.0](https://github.com/haris-hk/outreach-ops/compare/outreach-ops-v0.2.0...outreach-ops-v0.3.0) (2026-07-08)


### Features

* discovery gap-closers — apollo, google-places, companies-house, opencorporates, recipes ([ae1997b](https://github.com/haris-hk/outreach-ops/commit/ae1997bed5702384bdacb53201d0d15e5530eaf4))
* implement the search hook — discover.mjs goes live ([ac7738a](https://github.com/haris-hk/outreach-ops/commit/ac7738a296e8e33d737219c09e97a11e2d33db05))


### Bug Fixes

* protect portals.yml as user-layer data (gitignore + USER_PATHS + data contract) ([62928c4](https://github.com/haris-hk/outreach-ops/commit/62928c491ee2d168fbef1017cac55b43f77b8f79))
* silence dotenv 17 stdout banner (quiet: true) ([d549adf](https://github.com/haris-hk/outreach-ops/commit/d549adf6e2d5e6e7583b64ea1c9f2960d08ab82c))

## [0.2.0](https://github.com/haris-hk/outreach-ops/compare/outreach-ops-v0.1.0...outreach-ops-v0.2.0) (2026-07-07)


### Features

* milestone 0 — fork-strip of career-ops v1.17.0 into outreach-ops skeleton ([c5aaffc](https://github.com/haris-hk/outreach-ops/commit/c5aaffcace087762d048521b7a37fffc2f758a3f))
* milestone 1 — agent layer, grading rubric, core modes, ledger retarget ([91a3f8e](https://github.com/haris-hk/outreach-ops/commit/91a3f8e374f3cb5ef9f99b04ca340baf5d491e53))
* milestone 2 — prospect-hunting signal engine ([5be1457](https://github.com/haris-hk/outreach-ops/commit/5be145707f26c1266e2b26830d9942838c7dc602))
* milestone 3 — learning loop, sequencing, safety gates ([793bae4](https://github.com/haris-hk/outreach-ops/commit/793bae4d2ebe6728753d44c1c449b52dc3b152c8))
* milestone 4 — batch wiring, campaigns, TUI re-skin, docs, launch prep ([9d41da5](https://github.com/haris-hk/outreach-ops/commit/9d41da5aaed5124ce92ff4d18e7a3deabcb6df90))
* web board, eval harness, 3 signal providers, demo gif, email de-exposure ([0449af5](https://github.com/haris-hk/outreach-ops/commit/0449af5aefc4f2c49cffeb13eafae4e56265b486))


### Bug Fixes

* **ci:** Go import paths, release-please manifest, deterministic CI, full diagnostics ([422e8c1](https://github.com/haris-hk/outreach-ops/commit/422e8c1a992feb3c597f4064bf7f6d77360599a7))
* **ci:** test workflow runs engine/test-all.mjs and triggers on push to main ([bb7a544](https://github.com/haris-hk/outreach-ops/commit/bb7a544cd3729b479db3291efe29bd56a2cf6f5d))
* deep-audit pass — batch merge round-trip, ledger export losslessness, identity stragglers ([a3a156c](https://github.com/haris-hk/outreach-ops/commit/a3a156c6279929393a3f11619d1a139f49470ba0))
* **doctor:** auto-create data/dossiers, not the legacy reports/ dir ([e3e2c63](https://github.com/haris-hk/outreach-ops/commit/e3e2c63b41c3223094dff29f19e9d791658ca6d6))
* hardening pass from external code review ([1344a57](https://github.com/haris-hk/outreach-ops/commit/1344a572a09f6f82c33e5461c94141ea52b06fc1))
* js-yaml imports version-proof — namespace imports for v4 (CJS) and v5 (pure ESM) ([4cd76d6](https://github.com/haris-hk/outreach-ops/commit/4cd76d6656d365460d0670ba249018ae6fb517e9))

## 0.1.0 (unreleased)

- Improvements pass: read-only local web lead board (zero-dependency, 127.0.0.1-only, traversal-protected, 11-test suite); LLM eval harness for the grading fixtures (anthropic/openai/ollama + --mock, npm run eval:grading); three new zero-key signal providers (SEC EDGAR Form D fundraising, Product Hunt RSS launches, GitHub in-space repo discovery); generated demo GIF in the README; personal email removed from all public surfaces (security reports via GitHub Advisories); residual job vocabulary cleaned from plugin docs and config examples.

- Hardening pass (external code review): engine scripts renamed to the documented canonical names (ledger/merge/dedup/normalize/verify-ledger/reconcile/cadence) fixing AGENTS.md drift; header-aware parsing in ledger.mjs sync/delete (11-column layout was misread); npm run patterns wired to the real outcome miner and the legacy job-search analyzer + CV inserter removed; upstream identity scrubbed everywhere (SECURITY/CoC/SUPPORT/GOVERNANCE/CODEOWNERS/CONTRIBUTING, Go module path + TUI footer + funnel labels, scaffolder author/version/product text); plugin registry reset as a fresh trust root; dead upstream issue links removed; job-search issue templates replaced and no-user-data workflow retargeted; gmail/hunter/explorium plugins gained hook default-exports so plugins.mjs run works; internal build docs moved out of the published tree; profile seeds untracked; brand-purge test guard extended to Go/JSON/YAML/workflows and now also catches upstream identity strings.

- Milestone 4: batch grading wired (self-contained A-G worker prompt, dossier/ledger outputs, dry-run verified state machine), multi-campaign business mode (campaign.mjs scaffolder + campaign-scoped integrity + sender profiles), Go TUI re-skinned to the lead lifecycle, LEGAL.md + public README + full docs suite (SETUP/FAQ/BUDGET/CLIS/PLUGINS), publish prep.

- Milestone 3: learning loop — outcomes.tsv event log with reply-aware sequencing (outcomes.mjs), patterns.mjs outcome mining with evidence-backed observations, read-only Gmail reply detection + check-replies orchestrator, spam-preflight draft linter and deliverability-doctor DNS checks wired into the Drafted→Queued gate, dossier one-pager renderer (HTML/PDF), full sequence/review modes. 15-test loop suite.

- Milestone 2: prospect-hunting signal engine — Signal record type, scan orchestrator with trigger matching + dedup + why-now inbox, 6 signal providers (hiring-signals façade over 45 ATS boards, github-orgs, news-rss, funding, hn-launches, directories), lazy cost-ordered enrich.mjs, verify-contact.mjs gate, Explorium/Hunter plugin scaffolds, ADDING_PROVIDERS guide, 17-test fixture suite (no live HTTP).
- Milestone 1: agent layer — AGENTS.md + wrappers + skill router, A-G rubric, weights loader, core modes, ledger retarget, canonical states, grading fixtures.
- Milestone 0: forked from santifer/career-ops v1.17.0 (MIT), stripped job-search surface, ported domain-agnostic infrastructure (provider registry, plugin trust engine, updater, ledger integrity suite, batch orchestrator, TUI, scaffolder), renamed to outreach-ops, new data contract for the prospect-outreach domain.
