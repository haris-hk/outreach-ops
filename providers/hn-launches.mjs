// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// hn-launches — Show HN / Launch HN via the public Algolia HN API.
// Launch week = receptive founders; contact_hint is usually the poster.
// Allowlist: hn.algolia.com only. Claims entries {provider: hn-launches,
// query?: "keyword"} — segment sources, not per-company watch entries.

const API = 'https://hn.algolia.com/api/v1/search_by_date';
const MAX_AGE_DAYS = 14;

export default {
  id: 'hn-launches',

  detect(entry) {
    return entry.provider === 'hn-launches' ? { url: API } : null;
  },

  async fetch(entry, ctx) {
    const u = new URL(API);
    if (u.hostname !== 'hn.algolia.com') throw new Error('hn-launches: untrusted host');
    const q = entry.query ? `"Show HN" ${entry.query}` : '"Show HN"';
    u.searchParams.set('query', q);
    u.searchParams.set('tags', 'story');
    u.searchParams.set('numericFilters', `created_at_i>${Math.floor(Date.now() / 1000) - MAX_AGE_DAYS * 86400}`);
    u.searchParams.set('hitsPerPage', '25');

    let res;
    try { res = await ctx.fetchJson(u.href); } catch { return []; }
    /** @type {Signal[]} */
    const signals = [];
    for (const hit of res?.hits || []) {
      const title = String(hit.title || '');
      if (!/^(show|launch) hn/i.test(title)) continue;
      const name = title.replace(/^(show|launch) hn:?\s*/i, '').split(/[–—:-]/)[0].trim().slice(0, 60);
      if (!name) continue;
      signals.push({
        company: name,
        company_url: hit.url || undefined,
        signal_type: 'launch',
        headline: title.slice(0, 140),
        source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        observed_at: (hit.created_at_i || 0) * 1000 || undefined,
        contact_hint: hit.author ? `HN poster: ${hit.author} (often the founder)` : undefined,
      });
    }
    return signals;
  },
};
