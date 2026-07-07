// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// funding — fresh-raise signals. DOCUMENTED LIMITATION: there is no reliable,
// free, structured funding API. This provider therefore works as a preset
// over user-supplied funding-news feeds (any RSS/Atom that covers raises,
// e.g. a trade-press funding tag) and extracts round metadata from titles.
// With no feeds configured it returns [] cleanly — see docs/ADDING_PROVIDERS.md
// for wiring a paid source (Crunchbase-class) as a plugin instead.
// Claims entries {provider: funding, feeds: [https://...]}.

import { parseFeed } from './news-rss.mjs';

const MAX_AGE_DAYS = 45;
const ROUND_RE = /(raise[sd]?|secures?|lands?|closes?)\s.*?\$?(\d+(?:\.\d+)?)\s?(m|million|b|billion)|series\s([a-e])\b|(pre-)?seed round/i;

/** Extract round info from a headline, or null. Exported for tests. */
export function parseRound(title) {
  const t = String(title || '');
  if (!ROUND_RE.test(t)) return null;
  const amount = t.match(/\$\s?(\d+(?:\.\d+)?)\s?(m|million|b|billion)/i);
  const series = t.match(/series\s([a-e])\b/i) || (/(pre-)?seed/i.test(t) ? [, 'seed'] : null);
  // Company = text before the raise verb, best effort.
  const company = t.split(/\s(?:raise[sd]?|secures?|lands?|closes?)\s/i)[0].replace(/^.*?:\s*/, '').trim();
  return {
    company: company.slice(0, 80) || null,
    amount: amount ? `$${amount[1]}${amount[2][0].toUpperCase()}` : null,
    series: series ? String(series[1]).toLowerCase() : null,
  };
}

export default {
  id: 'funding',

  detect(entry) {
    return entry.provider === 'funding' && Array.isArray(entry.feeds) && entry.feeds.length
      ? { url: entry.feeds[0] } : null;
  },

  async fetch(entry, ctx) {
    /** @type {Signal[]} */
    const signals = [];
    const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
    for (const feed of (entry.feeds || []).slice(0, 5)) {
      let u;
      try { u = new URL(feed); } catch { continue; }
      if (u.protocol !== 'https:') continue;
      let xml = '';
      try { xml = await ctx.fetchText(u.href); } catch { continue; }
      for (const item of parseFeed(xml).slice(0, 50)) {
        if (item.date && item.date < cutoff) continue;
        const round = parseRound(item.title);
        if (!round?.company) continue;
        let link;
        try { link = new URL(item.link, u.origin); } catch { continue; }
        if (link.protocol !== 'https:') continue;
        signals.push({
          company: round.company,
          signal_type: 'funding',
          headline: `raised${round.amount ? ` ${round.amount}` : ''}${round.series ? ` (${round.series})` : ''}: ${item.title}`.slice(0, 140),
          source_url: link.href,
          observed_at: item.date,
        });
        if (signals.length >= 25) return signals;
      }
    }
    return signals;
  },
};
