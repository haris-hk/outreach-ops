// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// github-search — DISCOVERY (vs github-orgs' watchlist monitoring): find
// companies newly building in your space via GitHub repo search. New repo in
// your niche = a team investing there right now. Unauthenticated search is
// rate-limited (10 req/min) — one request per entry, results capped.
// Allowlist: api.github.com. Claims {provider: github-search, query,
// language?, min_stars?}.

const API = 'https://api.github.com/search/repositories';
const MAX_AGE_DAYS = 30;

export default {
  id: 'github-search',

  detect(entry) {
    return entry.provider === 'github-search' && entry.query ? { url: API } : null;
  },

  async fetch(entry, ctx) {
    const u = new URL(API);
    if (u.hostname !== 'api.github.com') throw new Error('github-search: untrusted host');
    const since = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10);
    let q = `${entry.query} created:>${since}`;
    if (entry.language) q += ` language:${entry.language}`;
    if (entry.min_stars) q += ` stars:>=${Number(entry.min_stars)}`;
    u.searchParams.set('q', q);
    u.searchParams.set('sort', 'stars');
    u.searchParams.set('per_page', '20');

    let res;
    try { res = await ctx.fetchJson(u.href, { headers: { accept: 'application/vnd.github+json' } }); } catch { return []; }
    /** @type {Signal[]} */
    const signals = [];
    for (const r of res?.items || []) {
      if (!r?.full_name || !r?.html_url || r.fork) continue;
      const org = r.owner?.login || r.full_name.split('/')[0];
      signals.push({
        company: org,
        company_url: r.owner?.html_url || undefined,
        signal_type: 'oss',
        headline: `new in-space repo: ${r.full_name}${r.language ? ` (${r.language})` : ''} ★${r.stargazers_count ?? 0}`,
        detail: r.description || undefined,
        source_url: r.html_url,
        observed_at: Date.parse(r.created_at || '') || undefined,
      });
    }
    return signals;
  },
};
