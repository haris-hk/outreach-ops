// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// news-rss — company blogs / press feeds / niche trade RSS+Atom.
// Personalization raw material with citable sources. Dependency-free parser
// (regex over <item>/<entry>) — good enough for well-formed feeds; malformed
// feeds yield [] rather than throwing.
//
// Host trust: RSS sources are USER-DECLARED in icp.yml (watchlists.sources:
// {provider: news-rss, url: https://...}). The module enforces HTTPS and
// pins fetches to the exact host the user configured — no redirstreet.

const MAX_AGE_DAYS = 60;
const MAX_ITEMS = 10;

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : '';
}
function pickLink(block) {
  const href = block.match(/<link[^>]*href="([^"]+)"/i);        // Atom
  if (href) return href[1];
  return pick(block, 'link');                                    // RSS
}

/** Parse RSS/Atom text into raw items. Exported for tests. */
export function parseFeed(xml) {
  const blocks = [...String(xml).matchAll(/<(item|entry)[\s>]([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  return blocks.map((b) => ({
    title: pick(b, 'title'),
    link: pickLink(b),
    date: Date.parse(pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || '') || undefined,
    summary: pick(b, 'description') || pick(b, 'summary') || undefined,
  })).filter((i) => i.title && i.link);
}

export default {
  id: 'news-rss',

  detect(entry) {
    if (entry.rss || entry.feed) return { url: entry.rss || entry.feed };
    return null;
  },

  async fetch(entry, ctx) {
    const feedUrl = entry.rss || entry.feed || entry.url;
    if (!feedUrl) return [];
    const u = new URL(feedUrl);
    if (u.protocol !== 'https:') throw new Error('news-rss: HTTPS only');

    let xml = '';
    try { xml = await ctx.fetchText(u.href); } catch { return []; }
    const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
    /** @type {Signal[]} */
    const signals = [];
    for (const item of parseFeed(xml).slice(0, 50)) {
      if (item.date && item.date < cutoff) continue;
      let link;
      try { link = new URL(item.link, u.origin); } catch { continue; }
      if (link.protocol !== 'https:') continue;
      const funding = /raise[sd]?|funding|series [a-e]\b|seed round|\$\d+(\.\d+)?\s?[mb]/i.test(item.title);
      const launch = /launch|introducing|announcing|now available|v\d+\.\d+ release/i.test(item.title);
      signals.push({
        company: entry.company || u.hostname.replace(/^www\./, ''),
        company_url: entry.careers_url || undefined,
        signal_type: funding ? 'funding' : launch ? 'launch' : 'news',
        headline: item.title.slice(0, 140),
        detail: item.summary?.slice(0, 280),
        source_url: link.href,
        observed_at: item.date,
      });
      if (signals.length >= MAX_ITEMS) break;
    }
    return signals;
  },
};
