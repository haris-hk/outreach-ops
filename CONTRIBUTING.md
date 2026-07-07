# Contributing

Thanks for considering it. The fastest ways to help:

1. **Signal providers** — new prospect-hunting sources are ~150-line files
   against a stable contract. Full recipe: docs/ADDING_PROVIDERS.md.
2. **Plugins** — keyed integrations (enrichment, verification, CRM export).
   Scaffold with `node plugins.mjs new <id>`; see docs/PLUGINS.md. Community
   plugins enter the registry by PR with a pinned commit.
3. **Bug reports** — use the issue template; include `node engine/test-all.mjs
   --quick` output.

## Ground rules

- `node engine/test-all.mjs` must be green; new deterministic code needs a
  test; no live HTTP in tests (recorded fixtures — see
  engine/signal-scan.test.mjs for the pattern).
- The non-negotiables in GOVERNANCE.md are not up for PR: draft-only,
  never-fabricate, data contract, local-first.
- Rubric/weights/grade-mode changes must be re-checked against
  test/fixtures/prospects/ (expected ranges in front-matter) — adjust a
  fixture only with justification in the same commit.
- Conventional commits (`feat:`, `fix:`, `docs:` …) — release automation
  depends on them.

## Legal

Contributions are MIT-licensed like the rest of the project. The repo
descends from santifer/career-ops (MIT); keep the upstream copyright line in
LICENSE intact.
