# Plugins

Plugins are keyed integrations — anything that needs an API key or touches an
external account. The zero-keys core never depends on them.

## Using

```bash
node plugins.mjs list                 # installed + trust badges
node plugins.mjs available            # bundled + approved community plugins
node plugins.mjs enable <id>          # capability card; add --confirm to consent
node plugins.mjs skill <id>           # the plugin's how-to (treated as untrusted docs)
```

Two gates must BOTH hold before a plugin runs: recorded consent
(`plugins.lock`) and its `requiredEnv` keys present in `.env`.
`node engine/doctor.mjs` shows what's missing.

## Bundled

| Plugin | Hooks | Purpose |
|---|---|---|
| apollo | enrich | THE person-finder: right contact by title at a company + org firmographics (paid credits) |
| explorium | enrich | firmographics/technographics per lead (paid credits, lazy) |
| google-places | provider | local/SMB business discovery for the signal scan (agencies, clinics, trades) |
| companies-house | provider | newly incorporated UK companies by SIC code (free API key) |
| hunter | enrich, verify | email finding + the Drafted→Queued verification gate |
| gmail | replies | READ-ONLY reply detection (gmail.readonly; feeds outcomes.tsv) |
| notion | export, search | lead-board export |
| apify | provider | keyed scraping actors as a signal source (mind target ToS) |

## Trust model

Badges: bundled → approved (pinned commit in `plugins-registry.json`, the
trust root) → community-unverified → off-registry. File changes without a
version bump BLOCK the plugin until you review and re-pin (`plugins.mjs trust
<id>`). Hooks are declared in the manifest (`enrich | verify | replies |
provider | ingest | search | notify | export`), hosts are allowlisted, and
`humanInTheLoop: true` is mandatory — a plugin that could auto-send fails
validation.

## Writing one

`node plugins.mjs new my-plugin` scaffolds `plugins.local/my-plugin/`. Export
the function matching your hook (`enrich(lead, ctx)`, `verify(email, ctx)`,
`replies(contacts, ctx)`). Read `plugins/hunter/` as the reference
implementation. Community submissions: PR adding your repo + pinned commit to
`plugins-registry.json`.
