# Governance

outreach-ops is maintained by [@haris-hk](https://github.com/haris-hk)
(project founder) under a simple BDFL model: the maintainer has final say on
scope, releases, and the non-negotiables (draft-only, never-fabricate, the
grade threshold, the data contract).

## How decisions happen

Day-to-day: issues and pull requests. Larger proposals: open a GitHub
Discussion first. Signal providers are the most contribution-friendly surface
(docs/ADDING_PROVIDERS.md); plugin approvals require a review at a pinned
commit before entering `plugins-registry.json`.

## Non-negotiables (won't merge changes that violate these)

1. Draft-only — no sending code paths, no LinkedIn automation.
2. Source-of-truth boundary — no fabricated claims in outreach content.
3. Data contract — updates never touch the user layer.
4. Local-first — no telemetry, no accounts, no hosted dependency in core.

## Lineage

Forked from [santifer/career-ops](https://github.com/santifer/career-ops)
(MIT). Upstream governs its own project; issues here belong here.
