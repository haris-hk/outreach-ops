# Adding a Signal Provider

The provider registry is outreach-ops' growth engine: one small file = a new
prospect-hunting source for everyone. A niche provider (a regional business
registry, a vertical directory, an app-store new-listings feed) is typically
100–200 lines.

## The contract

One file in `providers/`, default-exporting:

```js
// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */
export default {
  id: 'my-source',                      // unique, matches `provider:` in icp.yml
  detect(entry) { /* {url}|null */ },   // claim watch entries you understand
  async fetch(entry, ctx) { /* Signal[] */ },
};
```

`Signal` (see `providers/_types.js`): `{ company, signal_type: hiring|funding|
launch|news|oss|listing|stack, headline, source_url (https, dedup key),
observed_at?, detail?, contact_hint?, hiring_for?[] }`.

## Hard rules (enforced by review + engine/scan.mjs)

1. **HTTPS-only, hostname allowlist hardcoded in the module.** A hostile
   watchlist entry must not be able to point your provider at an arbitrary
   host (SSRF). Validate with `new URL(...)` and compare hostnames.
2. **Use `ctx.fetchJson` / `ctx.fetchText`** (shared timeouts/retries) — no
   raw fetch, no extra deps.
3. **Respect budgets**: cap items returned (≤ ~25), honor `ctx.maxPages` if
   you paginate, prefer one request per entry.
4. **Never throw on empty** — return `[]`. Throw only on misconfiguration
   (untrusted host). Malformed upstream data → skip the record.
5. **No credentials.** Anything needing an API key is a *plugin*
   (`plugins/`, hooks: enrich/verify/provider), not a provider.
6. **Fixture test, no live HTTP in CI.** Export your parsing helpers and test
   them on canned payloads (see `engine/signal-scan.test.mjs` for the
   pattern); integration goes through scan.mjs's `--providers-dir` injection.

## Checklist for the PR

- [ ] `id` unique; file named `{id}.mjs`; `_`-prefixed files are helpers, never loaded
- [ ] Hostname allowlist + HTTPS enforcement
- [ ] Valid `Signal` records (run `node engine/scan.mjs --dry-run` against a test icp)
- [ ] Fixture test added and green (`node engine/test-all.mjs`)
- [ ] One-line row added to the provider table in `modes/scan.md`
- [ ] `docs/ADDING_PROVIDERS.md` unchanged rules still hold (no creds, no deps)

## Loader mechanics (why your file "just works")

`providers/_registry.mjs` loads every non-`_` `.mjs` alphabetically
(deterministic detect priority), validates shape (`id` + `fetch`), and
logs-and-skips broken modules — your provider can never crash someone's scan.
Explicit `provider: your-id` in a watch entry bypasses detect().
