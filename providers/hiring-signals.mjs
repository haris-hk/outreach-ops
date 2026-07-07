// @ts-check
/** @typedef {import('./_types.js').Signal} Signal */

// hiring-signals — façade over the ATS board modules in providers/ats/.
// A company hiring for role X is a budget + pain signal for X-services (and,
// in individual mode, a literal opening). Reuses the battle-tested ATS
// fetchers unchanged; maps Job records → Signal records.
//
// Entry forms it claims: anything the underlying ATS providers detect
// (careers_url / api on a watchlist company), or `provider: hiring-signals`
// with a nested `ats:` hint.

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadProviders } from './_registry.mjs';

const ATS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'ats');
let atsProvidersPromise = null;
const atsProviders = () => (atsProvidersPromise ??= loadProviders(ATS_DIR));

/** Title → normalized role buckets. Exported for tests. */
export function roleBuckets(title) {
  const t = String(title || '').toLowerCase();
  const buckets = new Set();
  if (/\bml\b|machine learning|deep learning|llm|genai|gen ai|\bai\b|artificial intelligence|nlp|computer vision|prompt/.test(t)) buckets.add('ml');
  if (/data (engineer|scientist|analyst)|analytics|etl\b/.test(t)) buckets.add('data');
  if (/backend|back-end|api engineer|server|platform engineer|infrastructure/.test(t)) buckets.add('backend');
  if (/frontend|front-end|react|web engineer|ui engineer/.test(t)) buckets.add('frontend');
  if (/full[- ]?stack/.test(t)) { buckets.add('backend'); buckets.add('frontend'); }
  if (/devops|sre|site reliability|cloud engineer|kubernetes/.test(t)) buckets.add('devops');
  if (/product (manager|owner|lead)/.test(t)) buckets.add('product');
  if (/sales|account executive|\bsdr\b|\bbdr\b|revenue/.test(t)) buckets.add('sales');
  if (/design|ux\b|ui\/ux/.test(t)) buckets.add('design');
  if (!buckets.size) buckets.add('other');
  return [...buckets];
}

export default {
  id: 'hiring-signals',

  detect(entry) {
    // Claim entries that look like ATS-scannable companies. Actual routing to
    // the right board module happens in fetch() via the ats registry.
    if (entry.careers_url || entry.api || entry.ats) return { url: entry.careers_url || entry.api || '' };
    return null;
  },

  async fetch(entry, ctx) {
    const registry = await atsProviders();
    /** @type {Signal[]} */
    const signals = [];
    for (const [, ats] of registry) {
      let claim = null;
      try {
        if (entry.ats && entry.ats !== ats.id) continue;
        claim = entry.ats === ats.id ? { url: entry.api || entry.careers_url || '' } : ats.detect?.(entry);
      } catch { continue; }
      if (!claim) continue;

      let jobs = [];
      try { jobs = await ats.fetch(entry, ctx) || []; } catch { continue; }
      for (const job of jobs) {
        if (!job?.title || !job?.url || !/^https:\/\//.test(job.url)) continue;
        signals.push({
          company: job.company || entry.company || '',
          company_url: entry.careers_url || undefined,
          signal_type: 'hiring',
          headline: `hiring: ${job.title}`,
          detail: job.location || undefined,
          source_url: job.url,
          observed_at: job.postedAt,
          hiring_for: roleBuckets(job.title),
        });
      }
      if (signals.length) break; // first ATS that answers wins for this entry
    }
    return signals;
  },
};
