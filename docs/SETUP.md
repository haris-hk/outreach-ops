# Setup

## Prerequisites

- Node.js ≥ 20 (`node -v`)
- An AI coding CLI: Claude Code, Codex, OpenCode, Qwen, Kimi, or Grok Build
  (see [SUPPORTED_CLIS.md](SUPPORTED_CLIS.md)); free/local paths in
  [RUNNING_ON_A_BUDGET.md](RUNNING_ON_A_BUDGET.md)
- Optional: `npx playwright install chromium` (dossier PDFs, liveness checks)
- Optional: Go ≥ 1.22 (terminal dashboard: `npm run serve:dashboard`)

## Install

```bash
git clone https://github.com/haris-hk/outreach-ops.git
cd outreach-ops && npm install
node engine/doctor.mjs        # health check — tells you exactly what's missing
```

## First run

Open your CLI in the repo (`claude`). It detects the missing profile and runs
a conversational onboarding that writes:

| File | What it holds |
|---|---|
| `profile/background.md` | Who you are; ONLY evidenced proof points |
| `profile/offer.yml` | What you sell / the role you seek |
| `profile/icp.yml` | Target segments, triggers, watchlists |
| `profile/preferences.yml` | Channels, tone, cadence, never-contact, threshold |
| `profile/voice-dna.md` + `writing-samples/` | How you sound |

Prefer manual? Copy each `templates/profile/*.example.*` to `profile/` and edit.

## Daily use

Paste a company URL → full grade + drafts. `/outreach-ops scan` → inbox with
"why now" lines. `/outreach-ops ledger` → statuses + due follow-ups.
`/outreach-ops review` weekly → tuning proposals from your outcomes.

## Optional integrations

`node plugins.mjs available` — enrichment (explorium), email find/verify
(hunter), read-only Gmail reply detection, Notion export. Every plugin needs
BOTH explicit consent (`enable --confirm`) and keys in `.env`.

## Updating

The agent offers updates when available (`node engine/update-system.mjs check`).
Your `profile/`, `data/`, `campaigns/` are never touched — `DATA_CONTRACT.md`
is enforced by the updater and CI. Rollback: `npm run rollback`.
