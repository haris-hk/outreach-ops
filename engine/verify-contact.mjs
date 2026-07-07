#!/usr/bin/env node

/**
 * verify-contact.mjs — email verification gate for the Drafted→Queued
 * transition. No verified address, no send-ready draft. Fail-safe: with no
 * verifier plugin enabled it reports "unverified" (exit 2) — it never
 * pretends an address is good.
 *
 * Plugins participate via hooks: ["verify"] + exported `verify(email, ctx) →
 * {status: 'valid'|'invalid'|'risky'|'unknown', detail?}`.
 *
 * Usage: node engine/verify-contact.mjs jane@novastack.io
 * Exit codes: 0 valid · 1 invalid/risky · 2 unverifiable (no plugin / unknown)
 * Results cached in data/verify-cache.json (verdicts don't flap daily).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const email = (process.argv[2] || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const out = (obj, code) => { console.log(JSON.stringify(obj, null, 2)); process.exit(code); };

if (!EMAIL_RE.test(email)) out({ email, status: 'invalid', detail: 'not a syntactically valid address' }, 1);

const CACHE = join(ROOT, 'data', 'verify-cache.json');
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {};
if (cache[email] && !process.argv.includes('--refresh')) {
  const c = cache[email];
  out({ email, ...c, source: 'cache' }, c.status === 'valid' ? 0 : c.status === 'unknown' ? 2 : 1);
}

const { discoverPlugins, pluginRoots, pluginStatus, loadDotenvOnce } = await import('../plugins/_engine.mjs');
await loadDotenvOnce();
const yaml = (await import('js-yaml')).default;
const cfgPath = join(ROOT, 'config', 'plugins.yml');
const cfg = existsSync(cfgPath) ? (yaml.load(readFileSync(cfgPath, 'utf-8')) || {}) : {};
const verifiers = discoverPlugins(pluginRoots(ROOT))
  .filter((m) => (m.hooks || []).includes('verify'))
  .filter((m) => pluginStatus(m, cfg).enabled);

if (!verifiers.length) {
  out({ email, status: 'unknown', detail: 'no verifier plugin enabled (e.g. hunter) — verify manually before sending' }, 2);
}

for (const p of verifiers) {
  try {
    const mod = await import(join(p.dir, p.entry || 'index.mjs'));
    if (typeof mod.verify !== 'function') continue;
    const res = await mod.verify(email, { env: process.env });
    if (res?.status && res.status !== 'unknown') {
      cache[email] = { status: res.status, detail: res.detail, verifier: p.id, at: new Date().toISOString() };
      mkdirSync(dirname(CACHE), { recursive: true });
      writeFileSync(CACHE, JSON.stringify(cache, null, 2));
      out({ email, ...cache[email] }, res.status === 'valid' ? 0 : 1);
    }
  } catch (err) {
    console.error(`  ⚠️  ${p.id}: ${err.message}`);
  }
}
out({ email, status: 'unknown', detail: 'verifier(s) enabled but returned no verdict' }, 2);
