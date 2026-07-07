# Hunter plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

Two hooks: `enrich` (find the best address for a lead's domain/contact) and
`verify` (deliverability check used by `node engine/verify-contact.mjs`, which
gates Drafted→Queued). Enable: `node plugins.mjs enable hunter --confirm` +
`HUNTER_API_KEY` in `.env`. Costs credits — verification is cached in
data/verify-cache.json so verdicts are paid for once.
