# Mode: scan — ICP signal scan & inbox triage

Zero-token discovery: `node engine/scan.mjs` fans out across the signal
providers, trigger-matches against `profile/icp.yml`, dedups against
`data/signal-history.tsv`, and appends new leads to `data/inbox.md` — each with
a one-line "why now".

## Run

```bash
node engine/scan.mjs                          # all segments
node engine/scan.mjs --segment seed-ai-startups
node engine/scan.mjs --dry-run                # preview only
```

Providers participating (see docs/ADDING_PROVIDERS.md to add more):

| Provider | Hunts | Config in icp.yml |
|---|---|---|
| hiring-signals | postings via 45 ATS boards → buying-signal + role buckets | watchlist company with `careers_url` (or `ats`/`api` hint) |
| github-orgs | new repos / active OSS | watchlist company with `github_org` |
| news-rss | blog/press items; auto-classifies funding & launches | source `{provider: news-rss, rss: https://...}` |
| funding | raise headlines from user-supplied funding feeds | source `{provider: funding, feeds: [https://...]}` |
| hn-launches | Show HN / Launch HN | source `{provider: hn-launches, query: "ai agents"}` |
| directories | YC / a16z portfolio listings | source `{provider: directories, seed: yc, batch: W26}` |

Individual mode: the raw job scanner survives as `node engine/scan-ats.mjs`
(same providers, job-posting output) for literal job discovery.

## Triage (agent workflow after a scan)

1. Read the new `## Scan {date}` section of `data/inbox.md`.
2. Summarize: count by segment and signal type, flag the hottest 3 by trigger
   freshness + segment priority.
3. For each hot lead, offer: grade now / enrich first
   (`node engine/enrich.mjs --company X --domain x.io`) / dismiss (tick the
   box with a one-word reason).
4. Never grade automatically in bulk from a scan — the human picks. Batch
   grading goes through `modes/batch.md` deliberately.
5. Graded leads: tick the inbox line and add `→ dossier {NNN}`.
