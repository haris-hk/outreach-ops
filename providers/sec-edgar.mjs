// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// sec-edgar — fresh US fundraising signals from SEC Form D filings
// (exempt-offering notices startups file when they raise). Public full-text
// search API, zero keys. The SEC asks for a descriptive User-Agent.
// Allowlist: efts.sec.gov (search) + www.sec.gov (filing links).
// Claims entries {provider: sec-edgar, query?: "software", days?: 14}.

const API = 'https://efts.sec.gov/LATEST/search-index';
const MAX_AGE_DAYS_DEFAULT = 14;

/** Map one EDGAR full-text hit to a Signal (or null). Exported for tests. */
export function hitToSignal(hit) {
  const src = hit?._source || hit;
  const name = (src?.display_names?.[0] || '').replace(/\s*\(CIK.*\)\s*$/, '').trim();
  const adsh = (src?._id || hit?._id || '').split(':')[0].replace(/-/g, '');
  const cik = String(src?.ciks?.[0] || '').replace(/^0+/, '');
  if (!name || !adsh || !cik) return null;
  const filed = Date.parse(src?.file_date || '') || undefined;
  return {
    company: name.slice(0, 80),
    signal_type: 'funding',
    headline: `filed SEC Form D (fundraising) ${src?.file_date || ''}`.trim(),
    source_url: `https://www.sec.gov/Archives/edgar/data/${cik}/${adsh}`,
    observed_at: filed,
  };
}

export default {
  id: 'sec-edgar',

  detect(entry) {
    return entry.provider === 'sec-edgar' ? { url: API } : null;
  },

  async fetch(entry, ctx) {
    const u = new URL(API);
    if (u.hostname !== 'efts.sec.gov') throw new Error('sec-edgar: untrusted host');
    const days = Number(entry.days || MAX_AGE_DAYS_DEFAULT);
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    u.searchParams.set('q', entry.query ? `"${entry.query}"` : '"Form D"');
    u.searchParams.set('forms', 'D');
    u.searchParams.set('dateRange', 'custom');
    u.searchParams.set('startdt', since);
    u.searchParams.set('enddt', new Date().toISOString().slice(0, 10));

    let res;
    try {
      res = await ctx.fetchJson(u.href, { headers: { 'user-agent': 'outreach-ops signal scanner (github.com/haris-hk/outreach-ops)' } });
    } catch { return []; }
    /** @type {Signal[]} */
    const signals = [];
    for (const hit of res?.hits?.hits || []) {
      const s = hitToSignal(hit);
      if (s) signals.push(s);
      if (signals.length >= 25) break;
    }
    return signals;
  },
};
