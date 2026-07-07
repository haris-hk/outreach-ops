#!/usr/bin/env node

/**
 * scan.mjs — ICP signal scan orchestrator (prospect hunting).
 *
 * Flow: profile/icp.yml segments + watchlists → signal-provider fan-out
 * (providers/*.mjs, NOT providers/ats/ — those are wrapped by
 * hiring-signals.mjs) → trigger-matching against each segment → dedup vs
 * data/scan-history.tsv → data/inbox.md with a "why now" line per lead.
 *
 * Zero LLM tokens — pure HTTP + JSON/RSS. The raw ATS job scanner lives in
 * engine/scan-ats.mjs (kept for individual-mode job discovery).
 *
 * Usage:
 *   node engine/scan.mjs                        # all segments
 *   node engine/scan.mjs --segment seed-ai-startups
 *   node engine/scan.mjs --dry-run              # print, write nothing
 *   node engine/scan.mjs --icp path --inbox path --history path \
 *                        --providers-dir path   # test injection
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml'; // namespace import: works on js-yaml v4 (CJS interop) and v5 (pure ESM, no default)

import { makeHttpCtx } from '../providers/_http.mjs';
import { loadProviders } from '../providers/_registry.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ── CLI ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };

const ICP_PATH = resolve(val('--icp', join(ROOT, 'profile', 'icp.yml')));
const INBOX_PATH = resolve(val('--inbox', join(ROOT, 'data', 'inbox.md')));
const HISTORY_PATH = resolve(val('--history', join(ROOT, 'data', 'signal-history.tsv')));
const PROVIDERS_DIR = resolve(val('--providers-dir', join(ROOT, 'providers')));
const ONLY_SEGMENT = val('--segment', null);
const DRY = flag('--dry-run');

// ── Trigger matching (exported for tests) ──────────────────────────
/**
 * Does `signal` satisfy any of `segment.triggers`? Returns the matched
 * trigger label or null. Trigger forms in icp.yml:
 *   - raised_round            → signal_type 'funding'
 *   - hiring_for: [ml, ai]    → signal_type 'hiring' with bucket overlap
 *   - launched_product        → signal_type 'launch'
 *   - news_activity           → signal_type 'news' | 'oss'
 *   - listed                  → signal_type 'listing' (directories/seed lists)
 *   - stack_match             → signal_type 'stack'
 */
export function matchTrigger(signal, segment) {
  for (const trig of segment.triggers || []) {
    if (typeof trig === 'string') {
      if (trig === 'raised_round' && signal.signal_type === 'funding') return 'raised_round';
      if (trig === 'launched_product' && signal.signal_type === 'launch') return 'launched_product';
      if (trig === 'news_activity' && (signal.signal_type === 'news' || signal.signal_type === 'oss')) return 'news_activity';
      if (trig === 'listed' && signal.signal_type === 'listing') return 'listed';
      if (trig === 'stack_match' && signal.signal_type === 'stack') return 'stack_match';
    } else if (trig && typeof trig === 'object' && trig.hiring_for) {
      if (signal.signal_type !== 'hiring') continue;
      const want = trig.hiring_for.map((r) => String(r).toLowerCase());
      const got = (signal.hiring_for || []).map((r) => String(r).toLowerCase());
      const hit = got.filter((r) => want.includes(r));
      if (hit.length) return `hiring_for:${hit.join('+')}`;
    }
  }
  return null;
}

/** One-line human "why now" for the inbox. Exported for tests. */
export function whyNow(signal, trigger) {
  const when = signal.observed_at
    ? new Date(signal.observed_at).toISOString().slice(0, 10)
    : 'recently';
  return `${signal.headline} (${when}) → trigger: ${trigger}`;
}

// ── Dedup history (TSV: date  company  signal_type  source_url) ────
function loadSeen(path) {
  const seen = new Set();
  if (!existsSync(path)) return seen;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const cols = line.split('\t');
    if (cols[3]) seen.add(`${cols[2]}|${cols[3].trim()}`);
  }
  return seen;
}

function validSignal(s) {
  return s && typeof s.company === 'string' && s.company.trim()
    && typeof s.headline === 'string' && s.headline.trim()
    && typeof s.source_url === 'string' && /^https:\/\//.test(s.source_url)
    && ['hiring', 'funding', 'launch', 'news', 'oss', 'listing', 'stack'].includes(s.signal_type);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(ICP_PATH)) {
    console.error(`No ICP config at ${ICP_PATH} — run onboarding first (modes/onboard.md).`);
    process.exit(1);
  }
  const icp = yaml.load(readFileSync(ICP_PATH, 'utf-8')) || {};
  const segments = (icp.segments || []).filter((s) => !ONLY_SEGMENT || s.id === ONLY_SEGMENT);
  if (!segments.length) {
    console.error(ONLY_SEGMENT ? `Unknown segment: ${ONLY_SEGMENT}` : 'No segments in icp.yml');
    process.exit(1);
  }

  const providers = await loadProviders(PROVIDERS_DIR);
  if (!providers.size) {
    console.error(`No signal providers found in ${PROVIDERS_DIR}`);
    process.exit(1);
  }
  const ctx = makeHttpCtx({ maxPages: 3 });
  const seen = loadSeen(HISTORY_PATH);
  const now = new Date().toISOString().slice(0, 10);

  // Build watch entries: explicit sources + watchlist companies, each tagged
  // with the segments they may satisfy. A provider participates when its
  // detect() claims the entry or the entry names it via `provider:`.
  const entries = [];
  for (const seg of segments) {
    for (const src of (icp.watchlists?.sources || [])) entries.push({ ...src, _segments: [seg] });
    for (const company of (icp.watchlists?.companies || [])) {
      entries.push({ company: typeof company === 'string' ? company : company.name, ...(typeof company === 'object' ? company : {}), _segments: [seg] });
    }
    for (const src of (seg.sources || [])) entries.push({ ...src, _segments: [seg] });
  }
  if (!entries.length) {
    console.error('Nothing to scan: add watchlists.companies / watchlists.sources / segment sources to icp.yml');
    process.exit(1);
  }

  const found = [];      // { signal, segment, trigger }
  let fetched = 0, skippedDup = 0, invalid = 0;

  for (const entry of entries) {
    for (const [, provider] of providers) {
      let claim = null;
      try {
        if (entry.provider && entry.provider !== provider.id) continue;
        claim = entry.provider === provider.id ? { url: entry.url || '' } : provider.detect?.(entry);
      } catch { continue; }
      if (!claim && !entry.provider) continue;

      let signals = [];
      try {
        signals = await provider.fetch(entry, ctx) || [];
        fetched++;
      } catch (err) {
        console.error(`  ⚠️  ${provider.id}: ${err.message}`);
        continue;
      }
      for (const s of signals) {
        if (!validSignal(s)) { invalid++; continue; }
        const key = `${s.signal_type}|${s.source_url}`;
        if (seen.has(key)) { skippedDup++; continue; }
        for (const seg of entry._segments) {
          const trigger = matchTrigger(s, seg);
          if (trigger) {
            s.segment_match = [...(s.segment_match || []), seg.id];
            found.push({ signal: s, segment: seg, trigger });
            seen.add(key); // in-run dedup too
            break;
          }
        }
      }
    }
  }

  // ── Output ───────────────────────────────────────────────────────
  console.log(`Scanned ${entries.length} entries via ${providers.size} providers — ${found.length} new leads (${skippedDup} dups, ${invalid} invalid records dropped)`);
  if (DRY || !found.length) {
    for (const { signal, segment, trigger } of found) console.log(`  [${segment.id}] ${signal.company} — ${whyNow(signal, trigger)}`);
    return;
  }

  mkdirSync(dirname(INBOX_PATH), { recursive: true });
  const lines = found.map(({ signal, segment, trigger }) =>
    `- [ ] **${signal.company}** — ${whyNow(signal, trigger)} · segment: \`${segment.id}\` · [source](${signal.source_url})${signal.contact_hint ? ` · contact hint: ${signal.contact_hint}` : ''}`);
  const header = existsSync(INBOX_PATH) ? '' : '# Lead Inbox\n\nScanner output awaiting triage. Grade with `/outreach-ops grade {company}`; tick + annotate when processed.\n';
  appendFileSync(INBOX_PATH, `${header}\n## Scan ${now}\n\n${lines.join('\n')}\n`);

  mkdirSync(dirname(HISTORY_PATH), { recursive: true });
  if (!existsSync(HISTORY_PATH)) writeFileSync(HISTORY_PATH, 'date\tcompany\tsignal_type\tsource_url\n');
  appendFileSync(HISTORY_PATH, found.map(({ signal }) => `${now}\t${signal.company}\t${signal.signal_type}\t${signal.source_url}`).join('\n') + '\n');

  console.log(`Wrote ${found.length} leads → ${INBOX_PATH}`);
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
