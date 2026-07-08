# Google Places plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

Local/SMB discovery for the signal scan: agencies, clinics, retailers, trades —
the businesses no startup directory covers. One API request per icp.yml source
entry; results become `listing` signals with address + rating context.

Enable: `node plugins.mjs enable google-places --confirm` +
`GOOGLE_PLACES_API_KEY` in `.env` (Places API (New) must be enabled on the key).
Then add sources to profile/icp.yml, e.g.
`{ provider: google-places, query: "marketing agencies in Leeds", min_rating: 4.0 }`
and pair the segment trigger `listed`. Grade-mode research then fills the
timing/pain picture per lead. Websites beat Maps links as company_url — leads
without any https URL are dropped rather than guessed.
