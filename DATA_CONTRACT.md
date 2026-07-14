# Data Contract

Which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates). Enforced by `engine/update-system.mjs` (SYSTEM_PATHS / USER_PATHS) and checked by `engine/validate-system-paths-coverage.mjs`.

## User Layer (NEVER auto-updated)

| Path | Purpose |
|------|---------|
| `profile/background.md` | Who you / your business are; experience, case studies, proof points |
| `profile/offer.yml` | What you sell or the role you seek; pricing; differentiators |
| `profile/icp.yml` | Target segments, firmographic filters, triggers, watchlists |
| `profile/preferences.yml` | Channels per segment, tone, cadence, never-contact list |
| `profile/voice-dna.md` | Your writing voice guardrail (style only) |
| `profile/writing-samples/` | Your real messages for style calibration (README is system-owned docs) |
| `profile/_weights.yml` | Your override of grading weights (optional) |
| `portals.yml` | Your ATS job-scan watch list (individual mode; seeded from templates/portals.example.yml) |
| `data/leads.md` | Lead ledger — single source of truth |
| `data/leads.db` | Derived SQLite index (rebuildable; safe to delete) |
| `data/inbox.md` | Scanner output awaiting triage |
| `data/signal-history.tsv` | Prospect-signal scan dedup memory |
| `data/scan-history.tsv` | ATS job-scan dedup memory (individual mode) |
| `data/outcomes.tsv` | Outreach event log (learning-loop input) |
| `data/dossiers/` | Per-prospect research reports |
| `campaigns/` | Business mode: per-campaign icp/preferences/ledger/voice |
| `config/plugins.yml` | Plugin activation toggles |
| `plugins.local/` | Your private plugins |
| `plugins.lock` | Integrity pins + recorded consent for enabled plugins |
| `.env` | API keys |
| `.claude/settings.json` | Your CLI settings |

## System Layer (auto-updatable)

| Path | Purpose |
|------|---------|
| `modes/` | Agent skill modes (rubric, grade, dm, email, scan, ...) |
| `engine/` | Deterministic scripts (scan, ledger, cadence, patterns, doctor, updater, tests) |
| `providers/` | Prospect-signal source registry (+ `providers/ats/` hiring-signal boards) |
| `plugins/` (bundled) + `plugins.mjs` + `plugins-registry.json` + plugin utilities | Plugin engine, CLI, trust root |
| `templates/` | states.yml, dossier.html, profile example seeds, voice-dna example |
| `batch/` | Headless worker orchestration |
| `dashboard/` · `web/` | Go TUI · local web UI (web/ is its own component, excluded from updater) |
| `scaffolder/` · `fonts/` · `docs/` · `test/` | Installer, fonts, docs, fixtures |
| `CLAUDE.md`, `AGENTS.md`, CLI wrappers, `.agents/` + per-CLI skill dirs | Agent instruction layer |
| Governance: `README.md`, `LICENSE`, `LEGAL.md`, `CONTRIBUTING.md`, `SECURITY.md`, etc. | Project docs |
| `VERSION`, `package.json`, `Dockerfile`, `.github/`, `.mcp.json` | Packaging/CI and MCP project config |

## The Rule

**If a file is in the User Layer, no update process may read, modify, or delete it.**
**If a file is in the System Layer, it can be safely replaced with the latest release.**
All personalization goes in the user layer; never write user-specific content into system files.
