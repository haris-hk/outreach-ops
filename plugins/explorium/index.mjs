// Explorium enrichment plugin — thin client. No-ops gracefully without a key.
// Called by engine/enrich.mjs for leads that already passed firmographic
// filters (lazy, cost-ordered). Never called for raw lists.

const HOST = 'https://api.explorium.ai';

async function post(path, body, key) {
  const url = new URL(path, HOST);
  if (url.hostname !== 'api.explorium.ai') throw new Error('explorium: untrusted host');
  const res = await fetch(url.href, {
    method: 'POST',
    headers: { 'content-type': 'application/json', api_key: key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`explorium: HTTP ${res.status}`);
  return res.json();
}

/** enrich(lead, ctx) → merged firmographic/contact fields (or {}). */
export async function enrich(lead, ctx) {
  const key = ctx?.env?.EXPLORIUM_API_KEY;
  if (!key) return {}; // graceful no-op — both gates should prevent this call anyway
  const out = {};
  try {
    const match = await post('/v1/businesses/match', {
      businesses_to_match: [{ name: lead.company, domain: lead.domain || undefined }],
    }, key);
    const biz = match?.matched_businesses?.[0];
    if (biz?.business_id) {
      out.explorium_business_id = biz.business_id;
      const enriched = await post('/v1/businesses/enrich', {
        business_id: biz.business_id,
        enrichments: ['firmographics', 'technographics'],
      }, key);
      const d = enriched?.data || enriched || {};
      if (d.company_size) out.company_size = d.company_size;
      if (d.founded_year) out.founded_year = d.founded_year;
      if (d.total_funding) out.total_funding = d.total_funding;
      if (d.technologies) out.tech_stack = d.technologies;
      if (d.website) out.company_url = d.website;
    }
  } catch (err) {
    return { _explorium_error: err.message }; // never throw into the fan-out
  }
  return out;
}
