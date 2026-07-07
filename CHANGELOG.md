# Changelog

## 0.1.0 (unreleased)

- Milestone 4: batch grading wired (self-contained A-G worker prompt, dossier/ledger outputs, dry-run verified state machine), multi-campaign business mode (campaign.mjs scaffolder + campaign-scoped integrity + sender profiles), Go TUI re-skinned to the lead lifecycle, LEGAL.md + public README + full docs suite (SETUP/FAQ/BUDGET/CLIS/PLUGINS), publish prep.

- Milestone 3: learning loop — outcomes.tsv event log with reply-aware sequencing (outcomes.mjs), patterns.mjs outcome mining with evidence-backed observations, read-only Gmail reply detection + check-replies orchestrator, spam-preflight draft linter and deliverability-doctor DNS checks wired into the Drafted→Queued gate, dossier one-pager renderer (HTML/PDF), full sequence/review modes. 15-test loop suite.

- Milestone 2: prospect-hunting signal engine — Signal record type, scan orchestrator with trigger matching + dedup + why-now inbox, 6 signal providers (hiring-signals façade over 45 ATS boards, github-orgs, news-rss, funding, hn-launches, directories), lazy cost-ordered enrich.mjs, verify-contact.mjs gate, Explorium/Hunter plugin scaffolds, ADDING_PROVIDERS guide, 17-test fixture suite (no live HTTP).
- Milestone 1: agent layer — AGENTS.md + wrappers + skill router, A-G rubric, weights loader, core modes, ledger retarget, canonical states, grading fixtures.
- Milestone 0: forked from santifer/career-ops v1.17.0 (MIT), stripped job-search surface, ported domain-agnostic infrastructure (provider registry, plugin trust engine, updater, ledger integrity suite, batch orchestrator, TUI, scaffolder), renamed to outreach-ops, new data contract for the prospect-outreach domain.
