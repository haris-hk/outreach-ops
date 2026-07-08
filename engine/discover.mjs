#!/usr/bin/env node

/**
 * discover.mjs — ICP-driven company DISCOVERY (vs scan.mjs, which monitors
 * signals). Fans your icp.yml firmographics out to every enabled plugin that
 * implements the `search` hook (apollo, explorium, google-places,
 * companies-house, …) plus keyless registry providers, normalizes results,
 * dedups against data/signal-history.tsv, and appends to data/inbox.md.
 *
 * Search plugins implement:  search(query, ctx) → Company[]
 *   query:   { keywords?, industry?, size?, stage?, geo?, limit }
 *   Company: { company, domain?, website?, location?, detail?,
 *              contact_hint?, source_url }
 *
 * Usage:
 *   node engine/discover.mjs --segment seed-ai-startups
 *   node engine/discover.mjs --keywords "ai agents" --geo "London" --limit 25
 *   node engine/discover.mjs --dry-run [--plugins apollo,explorium]
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as yaml from 'js-yaml'; // namespace import: v4 + v5 compatible

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };

const INBOX = resolve(val('--inbox', join(ROOT, 'data', 'inbox.md')));
const HISTORY = resolve(val('--history', join(ROOT, 'data', 'signal-history.tsv')));

/** Build the vendor-neutral query from a segment or CLI flags. Exported for tests. */
export function buildQuery(icp, segmentId, cli) {
  if (cli.keywords || cli.geo || cli.industry) {
    return { keywords: cli.keywords, industry: cli.industry, geo: cli.geo, limit: Number(cli.limit || 25) };
  }
  const seg = (icp?.segments || []).find((s) => s.id === segmentId) || (icp?.segments || [])[0];
  if (!seg) return null;
  return {
    keywords: seg.notes || seg.id.replace(/-/g, ' '),
    industry: (seg.firmo?.industry || []).join(', ') || undefined,
    size: seg.firmo?.size || undefined,
    stage: (seg.firmo?.stage || []).join(', ') || undefined,
    geo: (seg.firmo?.geo || []).join(', ') || undefined,
    limit: Number(cli.limit || 25),
    _segment: seg.id,
  };
}

/** Validate + normalize one vendor result. Exported for tests. */
export function normalizeCompany(c, pluginId) {
  if (!c || typeof c.company !== 'string' || !c.company.trim()) return null;
  const source = c.source_url || c.website;
  if (!source || !/^https:\/\//.test(source)) return null;
  return {
    company: c.company.trim().slice(0, 80),
    company_url: c.website || undefined,
    signal_type: 'listing',
    headline: `discovered via ${pluginId}${c.detail ? `: ${String(c.detail).slice(0, 100)}` : ''}`,
    detail: c.location || undefined,
    source_url: source,
    contact_hint: c.contact_hint || undefined,
    domain: c.domain || (c.website ? new URL(c.website).hostname.replace(/^www\./, '') : undefined),
  };
}

async function main() {
  const icpPath = resolve(val('--icp', join(ROOT, 'profile', 'icp.yml')));
  const icp = existsSync(icpPath) ? yaml.load(readFileSync(icpPath, 'utf-8')) : null;
  const query = buildQuery(icp, val('--segment'), { keywords: val('--keywords'), industry: val('--industry'), geo: val('--geo'), limit: val('--limit') });
  if (!query) { console.error('No segment found and no --keywords given. Configure profile/icp.yml or pass --keywords.'); process.exit(1); }

  // enabled search-hook plugins (two gates: consent + keys)
  const { discoverPlugins, pluginRoots, pluginStatus, loadDotenvOnce } = await import('../plugins/_engine.mjs');
  await loadDotenvOnce();
  const cfgPath = join(ROOT, 'config', 'plugins.yml');
  const cfg = existsSync(cfgPath) ? (yaml.load(readFileSync(cfgPath, 'utf-8')) || {}) : {};
  const only = val('--plugins')?.split(',').map((s) => s.trim());
  const searchers = discoverPlugins(pluginRoots(ROOT))
    .filter((m) => (m.hooks || []).includes('search') && m.id !== 'notion')
    .filter((m) => !only || only.includes(m.id))
    .filter((m) => pluginStatus(m, cfg).enabled);

  if (!searchers.length) {
    console.error('No discovery plugins enabled. Available: node plugins.mjs available — enable e.g. apollo, explorium, google-places, companies-house (each needs its key in .env).');
    console.error('Keyless alternative: add registry/list sources to icp.yml watchlists and run node engine/scan.mjs.');
    process.exit(2);
  }

  // dedup memory (shared with the signal scanner)
  const seen = new Set();
  if (existsSync(HISTORY)) for (const line of readFileSync(HISTORY, 'utf-8').split('\n')) {
    const c = line.split('\t'); if (c[3]) seen.add(`listing|${c[3].trim()}`);
  }

  const found = [];
  for (const m of searchers) {
    try {
      const mod = await import(pathToFileURL(join(m.dir, m.entry || 'index.mjs')).href);
      if (typeof mod.search !== 'function') continue;
      const results = await mod.search(query, { env: process.env, settings: cfg?.plugins?.[m.id] || {} });
      let kept = 0;
      for (const raw of results || []) {
        const c = normalizeCompany(raw, m.id);
        if (!c) continue;
        const key = `listing|${c.source_url}`;
        if (seen.has(key)) continue;
        seen.add(key); found.push({ ...c, _plugin: m.id }); kept++;
      }
      console.log(`  ${m.id}: ${kept} new companies`);
    } catch (err) {
      console.error(`  ⚠️  ${m.id}: ${err.message}`);
    }
  }

  console.log(`\nDiscovered ${found.length} new companies for ${query._segment || 'ad-hoc query'}`);
  if (flag('--dry-run') || !found.length) {
    for (const c of found) console.log(`  ${c.company} — ${c.headline}${c.domain ? ` · ${c.domain}` : ''}`);
    return;
  }

  mkdirSync(dirname(INBOX), { recursive: true });
  const now = new Date().toISOString().slice(0, 10);
  const header = existsSync(INBOX) ? '' : '# Lead Inbox\n\nScanner output awaiting triage. Grade with `/outreach-ops grade {company}`; tick + annotate when processed.\n';
  const lines = found.map((c) => `- [ ] **${c.company}** — ${c.headline} (${now}) · segment: \`${query._segment || 'ad-hoc'}\` · [source](${c.source_url})${c.contact_hint ? ` · contact hint: ${c.contact_hint}` : ''}${c.domain ? ` · domain: ${c.domain}` : ''}`);
  appendFileSync(INBOX, `${header}\n## Discovery ${now}\n\n${lines.join('\n')}\n`);
  if (!existsSync(HISTORY)) { mkdirSync(dirname(HISTORY), { recursive: true }); appendFileSync(HISTORY, 'date\tcompany\tsignal_type\tsource_url\n'); }
  appendFileSync(HISTORY, found.map((c) => `${now}\t${c.company}\tlisting\t${c.source_url}`).join('\n') + '\n');
  console.log(`Wrote ${found.length} → ${INBOX}\nNext: triage in the agent, or enrich the keepers (node engine/enrich.mjs --company X --domain x.io).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
