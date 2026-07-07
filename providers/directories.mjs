// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// directories — accelerator/VC portfolio seed lists as 'listing' signals.
// Wraps the ported seeds/vc-portfolios.mjs fetchers (YC public API, a16z
// portfolio page — allowlisted inside that module). Claims entries
// {provider: directories, seed: yc|a16z, batch?: "W26"} — segment sources.

import { SEED_SOURCES } from '../seeds/vc-portfolios.mjs';

export default {
  id: 'directories',

  detect(entry) {
    return entry.provider === 'directories' && entry.seed ? { url: `seed:${entry.seed}` } : null;
  },

  async fetch(entry) {
    const source = SEED_SOURCES[String(entry.seed || '').toLowerCase()];
    if (!source) return [];
    let companies = [];
    try { companies = await source.fetch({}) || []; } catch { return []; }
    /** @type {Signal[]} */
    const signals = [];
    for (const c of companies) {
      if (!c?.name) continue;
      if (entry.batch && String(c.batch || '').toLowerCase() !== String(entry.batch).toLowerCase()) continue;
      if (entry.keyword && !`${c.name} ${c.slug || ''}`.toLowerCase().includes(String(entry.keyword).toLowerCase())) continue;
      const url = c.url || c.website || c.careers_url;
      if (!url || !/^https:\/\//.test(url)) continue;
      signals.push({
        company: c.name,
        company_url: url,
        signal_type: 'listing',
        headline: `listed: ${source.label}${c.batch ? ` (${c.batch})` : ''}`.slice(0, 140),
        source_url: url,
      });
      if (signals.length >= (entry.limit || 50)) break;
    }
    return signals;
  },
};
