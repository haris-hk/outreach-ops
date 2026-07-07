// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// producthunt — daily launches via Product Hunt's public RSS feed (their API
// needs a key; the feed doesn't). Launch week = receptive founders.
// Allowlist: www.producthunt.com. Claims {provider: producthunt, keyword?}.

import { parseFeed } from './news-rss.mjs';

const FEED = 'https://www.producthunt.com/feed';
const MAX_AGE_DAYS = 7;

export default {
  id: 'producthunt',

  detect(entry) {
    return entry.provider === 'producthunt' ? { url: FEED } : null;
  },

  async fetch(entry, ctx) {
    const u = new URL(FEED);
    if (u.hostname !== 'www.producthunt.com') throw new Error('producthunt: untrusted host');
    let xml = '';
    try { xml = await ctx.fetchText(u.href); } catch { return []; }
    const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
    const kw = entry.keyword ? String(entry.keyword).toLowerCase() : null;
    /** @type {Signal[]} */
    const signals = [];
    for (const item of parseFeed(xml).slice(0, 60)) {
      if (item.date && item.date < cutoff) continue;
      if (kw && !`${item.title} ${item.summary || ''}`.toLowerCase().includes(kw)) continue;
      let link;
      try { link = new URL(item.link, u.origin); } catch { continue; }
      if (link.protocol !== 'https:') continue;
      signals.push({
        company: item.title.split(/[–—:-]/)[0].trim().slice(0, 60),
        signal_type: 'launch',
        headline: `Product Hunt launch: ${item.title}`.slice(0, 140),
        detail: item.summary?.slice(0, 280),
        source_url: link.href,
        observed_at: item.date,
      });
      if (signals.length >= 20) break;
    }
    return signals;
  },
};
