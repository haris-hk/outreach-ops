# Discovery Recipes

How to chain providers and plugins per vertical. Each recipe ends the same
way: the scan fills `data/inbox.md` with "why now" lines → you triage → grade
mode does bounded research → enrich finds the person → verify gates the
draft. Free sources first; paid credits only after a lead passes filters.

**Legend:** 🆓 zero-key provider · 🔑 keyed plugin (consent + `.env` both required)

## SaaS founders, post-raise (the classic)

```yaml
# profile/icp.yml
segments:
  - id: seed-saas
    triggers: [raised_round, {hiring_for: [ml, backend]}, launched_product]
watchlists:
  sources:
    - { provider: sec-edgar, query: "software", days: 14 }        # 🆓 US fundraises (Form D)
    - { provider: hn-launches, query: "saas" }                     # 🆓 Show HN launches
    - { provider: producthunt, keyword: ai }                       # 🆓 PH launches
```
Chain: `npm run scan` → grade the hot ones → **apollo** 🔑 finds the founder →
**hunter** 🔑 verifies the address → email mode drafts. The raise is your
timing hook; their hiring page (hiring-signals 🆓 on the watchlist) is your
pain hook.

## Local / SMB services (agencies, clinics, trades, retail)

```yaml
watchlists:
  sources:
    - { provider: google-places, query: "marketing agencies in Leeds", min_rating: 4.0 }   # 🔑
    - { provider: companies-house, sic_codes: "73110", days: 60 }                          # 🔑 (free key) UK new agencies
    - { provider: opencorporates, query: "dental", jurisdiction: gb, days: 90 }            # 🆓 registries
```
Chain: scan → grade (their website + reviews are the fit evidence) →
**hunter** 🔑 domain-search finds the owner's address. Registry-fresh
companies are a *timing* trigger, not a budget signal — grade accordingly.

## Teams building in your technical niche

```yaml
watchlists:
  sources:
    - { provider: github-search, query: "llm agents", language: python, min_stars: 20 }  # 🆓 discovery
  companies:
    - { name: KnownCo, github_org: knownco, careers_url: "https://jobs.example/knownco" } # 🆓 monitoring
```
Chain: github-search finds *new* orgs in-space → github-orgs + hiring-signals
monitor the ones you keep → an ML job posting fires `hiring_for` → grade leads
with an OSS peer-hook (dm mode, peer persona).

## UK new-business wave (sell setup services)

```yaml
watchlists:
  sources:
    - { provider: companies-house, sic_codes: "62012,62020", days: 30, max: 25 }  # 🔑 free key
```
Chain: weekly scan → batch-grade the batch (`/outreach-ops batch`) →
**apollo** 🔑 rarely covers brand-new companies, so expect Block G to flag
contact risk — the registry link + a founder name from the filing is often
enough for a researched DM instead.

## Anyone hiring for what you sell (the mirror trick)

Hiring for X = budget + pain for X-services. Keep target companies in
`watchlists.companies` with their `careers_url` — hiring-signals 🆓 turns
every relevant posting into a `hiring_for` trigger. Individual mode reads the
same signal literally: `npm run scan:full --seeds yc,a16z` sweeps portfolios
for openings.

## Notes that keep recipes honest

- One request per source entry per scan (cost + rate-limit control); dedup
  against `data/signal-history.tsv` means re-scans only surface NEW signals.
- opencorporates 🆓 throttles without a token — it degrades to empty rather
  than failing your scan; for sustained registry work use the keyed plugins.
- No provider scrapes LinkedIn. Person discovery = apollo 🔑 (licensed) or
  the agent's own web research in grade mode.
- Every recipe respects the threshold: scan wide, grade honestly, contact few.
