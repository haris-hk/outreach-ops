# Apollo plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

Closes the founder-finding gap: given a graded lead's company/domain, finds
the right PERSON (by title) plus org firmographics. Runs inside
`node engine/enrich.mjs --company X --domain x.io` when enabled.

Enable: `node plugins.mjs enable apollo --confirm` + `APOLLO_API_KEY` in `.env`.
Configure hunted titles in config/plugins.yml:
  apollo: { enabled: true, titles: ["Founder", "CEO", "Head of Engineering"] }

Notes: Apollo often locks emails behind credit reveals — the plugin only
passes back real addresses; pair with the hunter plugin (verify hook) before
any draft is send-ready. Costs credits: only ever called per-lead after
firmographic filters, never on raw lists. Endpoint field names may drift
with Apollo's API — index.mjs is deliberately a thin client.
