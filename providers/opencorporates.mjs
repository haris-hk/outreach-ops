// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// opencorporates — company-registry search across 140+ jurisdictions via the
// OpenCorporates public API. Keyless (their free tier is rate-limited and may
// return 401/403/429 under load — this provider degrades to [] rather than
// failing the scan; for sustained use get a token and prefer the registry
// plugins). Best used with a recency filter: newly incorporated = timing.
// Allowlist: api.opencorporates.com. Claims entries
// {provider: opencorporates, query, jurisdiction?: "gb", days?: 90, max?: 25}.

const API = 'https://api.opencorporates.com/v0.4/companies/search';

/** Map one search result → Signal (or null). Exported for tests. */
export function ocToSignal(result, sinceMs = 0) {
  const c = result?.company || result;
  if (!c?.name) return null;
  if (c.inactive === true) return null;
  const inc = c.incorporation_date ? Date.parse(c.incorporation_date) : undefined;
  if (sinceMs && (!inc || Number.isNaN(inc) || inc < sinceMs)) return null;
  const url = c.opencorporates_url;
  if (!url || !/^https:\/\//.test(url)) return null;
  return {
    company: String(c.name).slice(0, 80),
    signal_type: 'listing',
    headline: `registry: incorporated ${c.incorporation_date || '(date unknown)'}${c.jurisdiction_code ? ` (${c.jurisdiction_code.toUpperCase()})` : ''}`,
    detail: [c.company_type, c.registered_address_in_full].filter(Boolean).join(' · ').slice(0, 280) || undefined,
    source_url: url,
    observed_at: Number.isNaN(inc) ? undefined : inc,
  };
}

export default {
  id: 'opencorporates',

  detect(entry) {
    return entry.provider === 'opencorporates' && entry.query ? { url: API } : null;
  },

  async fetch(entry, ctx) {
    const u = new URL(API);
    if (u.hostname !== 'api.opencorporates.com') throw new Error('opencorporates: untrusted host');
    u.searchParams.set('q', String(entry.query));
    u.searchParams.set('per_page', String(Math.min(Number(entry.max) || 25, 30)));
    u.searchParams.set('order', 'score');
    if (entry.jurisdiction) u.searchParams.set('jurisdiction_code', String(entry.jurisdiction).toLowerCase());

    let res;
    try { res = await ctx.fetchJson(u.href); } catch { return []; } // free tier throttles — degrade quietly
    const sinceMs = entry.days ? Date.now() - Number(entry.days) * 864e5 : 0;
    /** @type {Signal[]} */
    const signals = [];
    for (const r of res?.results?.companies || []) {
      const s = ocToSignal(r, sinceMs);
      if (s) signals.push(s);
      if (signals.length >= (Number(entry.max) || 25)) break;
    }
    return signals;
  },
};
