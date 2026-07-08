# Companies House plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

Fresh UK incorporations as `listing` signals — real coverage outside the
startup bubble. The API key is FREE (register at
developer.company-information.service.gov.uk).

Enable: `node plugins.mjs enable companies-house --confirm` +
`COMPANIES_HOUSE_API_KEY` in `.env`. Source entries filter by SIC code
(industry) and/or name fragment plus a recency window, e.g.
`{ provider: companies-house, sic_codes: "62012", days: 30 }` (62012 =
business/domestic software development). Registry data has no website/contact —
chain with enrich (apollo/hunter) after grading, and treat brand-new
companies gently: they're a timing trigger, not a budget signal.
