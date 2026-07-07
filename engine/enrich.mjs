#!/usr/bin/env node

/**
 * enrich.mjs — lazy, cost-ordered enrichment fan-out for ONE lead.
 *
 * Order: cache → free enrichment plugins → paid enrichment plugins. Only ever
 * called for leads that already passed firmographic filters (never enrich a
 * raw list). Results cached per lead slug so repeat grades are free.
 *
 * Plugins participate by declaring hooks: ["enrich"] in manifest.json and
 * exporting `enrich(lead, ctx) → object`. Manifest `costTier: "free"|"paid"`
 * orders the fan-out (missing = paid). Both consent gates apply (enabled +
 * keys) — see plugins/README.md.
 *
 * Usage:
 *   node engine/enrich.mjs --company "NovaStack" [--domain novastack.io] [--contact "Jane Ray"]
 *   node engine/enrich.mjs --company X --refresh     # bypass cache
 * Output: JSON {source_cache|plugins_used, fields...} on stdout. Exit 0 even
 * when nothing enriched (empty result is a valid answer, not an error).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const val = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };

const company = val('--company');
if (!company) { console.error('usage: enrich.mjs --company NAME [--domain D] [--contact C] [--refresh]'); process.exit(1); }
const lead = { company, domain: val('--domain'), contact: val('--contact') };
const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CACHE = join(ROOT, 'data', 'enrich-cache', `${slug}.json`);

if (!argv.includes('--refresh') && existsSync(CACHE)) {
  const cached = JSON.parse(readFileSync(CACHE, 'utf-8'));
  console.log(JSON.stringify({ source: 'cache', cached_at: cached._cached_at, ...cached }, null, 2));
  process.exit(0);
}

const { discoverPlugins, pluginRoots, pluginStatus, loadDotenvOnce } = await import('../plugins/_engine.mjs');
await loadDotenvOnce();
const yaml = (await import('js-yaml')).default;
const cfgPath = join(ROOT, 'config', 'plugins.yml');
const cfg = existsSync(cfgPath) ? (yaml.load(readFileSync(cfgPath, 'utf-8')) || {}) : {};
const manifests = discoverPlugins(pluginRoots(ROOT)).filter((m) => (m.hooks || []).includes('enrich'));
const ready = manifests.filter((m) => pluginStatus(m, cfg).enabled);
// free before paid
ready.sort((a, b) => (a.costTier === 'free' ? 0 : 1) - (b.costTier === 'free' ? 0 : 1));

const result = { _cached_at: new Date().toISOString(), plugins_used: [] };
for (const m of ready) {
  try {
    const mod = await import(join(m.dir, m.entry || 'index.mjs'));
    if (typeof mod.enrich !== 'function') continue;
    const data = await mod.enrich(lead, { env: process.env });
    if (data && typeof data === 'object') {
      Object.assign(result, data);
      result.plugins_used.push(m.id);
    }
  } catch (err) {
    console.error(`  ⚠️  ${m.id}: ${err.message}`);
  }
}

if (!ready.length) result.note = 'no enrichment plugins enabled — free signals only (node plugins.mjs available)';
mkdirSync(dirname(CACHE), { recursive: true });
writeFileSync(CACHE, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ source: 'live', ...result }, null, 2));
