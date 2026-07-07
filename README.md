# Outreach-Ops

**AI prospect research, grading & outreach engine — local-first, draft-only, bring-your-own-LLM.**

It researches like an analyst, grades like a skeptic, and writes like you.
And it **sends nothing** — every message is a draft you review.

Whether you're an individual trying to get hired or win clients, or a team
running B2B outbound: paste a company URL, and your AI CLI turns it into a
sourced dossier, an honest 1–5 grade, a channel call, and personalized drafts
— or tells you *not* to contact them and why. Fewer, better messages.

> Built by [Haris Hussain Khan](https://github.com/haris-hk) on the MIT-licensed
> engine behind [career-ops](https://github.com/santifer/career-ops) — the
> job-search tool that trended on GitHub. The outreach rework, grading rubric,
> and signal engine are original work on that battle-tested foundation: your AI
> coding CLI is the brain; deterministic zero-token scripts do everything repeatable.

## How it works

```
scan (zero-token signal providers)      grade (A–G rubric, weighted 1–5)
  hiring · funding · launches ·   ──▶     fit · timing · reachability ·  ──▶  drafts (DM ≤300 · email · call)
  OSS · news · directories               budget · hooks · red flags           in YOUR voice, claims evidenced
        │                                     │      below 3.5? it refuses.        │
        ▼                                     ▼                                    ▼
   data/inbox.md ("why now")            data/dossiers/  +  data/leads.md      gates: verified email +
                                                                              spam preflight, then YOU send
        └──────────────── outcomes.tsv → patterns → weekly review proposes tuning (you approve) ─────────────┘
```

## Quick start

```bash
git clone https://github.com/haris-hk/outreach-ops.git
cd outreach-ops && npm install
claude        # or codex / opencode / qwen / grok — any agent-skill CLI
```

First session runs a conversational onboarding (who you are, what you offer,
who you hunt, how you sound). Then paste a company URL — or `/outreach-ops scan`
once your ICP has watchlists. `node engine/doctor.mjs` checks your setup.

## What's in the box

A–G grading with tunable weights and a hard contact threshold · zero-token
signal scanner (hiring-as-buying-signal across 45 ATS boards, GitHub, RSS,
funding feeds, Show HN, YC/a16z lists) · persona-aware DM/email/call drafting
with anti-slop voice rules · verified-email + spam-preflight + deliverability
gates · reply-aware sequencing (read-only Gmail detection) · a learning loop
that mines your outcomes and proposes rubric tuning · multi-campaign business
mode · batch grading with headless workers · Go terminal dashboard ·
self-updater that never touches your data (see `DATA_CONTRACT.md`).

## Extend it

New prospect source = one ~150-line file against a stable contract:
[docs/ADDING_PROVIDERS.md](docs/ADDING_PROVIDERS.md). Keyed integrations
(enrichment, verification, CRM) are trust-gated plugins: `node plugins.mjs available`.

## The philosophy

Inboxes are drowning in AI slop. The counter-move isn't better spam — it's a
filter. outreach-ops recommends **against** contacting most prospects, insists
every personalization hook has a source, never fabricates a claim about you,
and hard-stops below the grade threshold. See [LEGAL.md](LEGAL.md) for the
compliance posture (draft-first, no LinkedIn automation, licensed data only).

## Docs

[SETUP](docs/SETUP.md) · [FAQ](docs/FAQ.md) · [Budget guide](docs/RUNNING_ON_A_BUDGET.md) ·
[Supported CLIs](docs/SUPPORTED_CLIS.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Adding providers](docs/ADDING_PROVIDERS.md) · [Plugins](docs/PLUGINS.md)

## License

Code: [MIT](LICENSE) (includes upstream career-ops copyright — thank you,
[@santifer](https://github.com/santifer)). Use it, fork it, build on it.
