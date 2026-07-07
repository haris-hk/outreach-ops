# Explorium plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

Enriches ONE lead with firmographics/technographics. Used automatically by
`node engine/enrich.mjs --company X --domain x.io` when enabled.
Enable: `node plugins.mjs enable explorium --confirm` + `EXPLORIUM_API_KEY` in `.env`.
Endpoint field names may need adjusting to your API plan — see index.mjs, it is
deliberately a thin client. Costs credits: only ever called per-lead after
firmographic filters, never for raw lists.
