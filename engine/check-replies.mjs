#!/usr/bin/env node

/**
 * check-replies.mjs — reply-detection orchestrator (reply-aware sequencing).
 *
 * Collects contacted leads (outcomes.tsv 'sent'/'bumped' events without a
 * terminal event) + their addresses (from enrich cache / --contacts file),
 * asks every enabled `replies`-hook plugin (e.g. gmail, read-only), and logs
 * new `replied` events back to outcomes.tsv. Draft-only invariant untouched:
 * this READS mailboxes via read-only plugin scopes, sends nothing.
 *
 * Usage:
 *   node engine/check-replies.mjs                 # auto-collect from outcomes + enrich cache
 *   node engine/check-replies.mjs --contacts contacts.json   # [{lead_id,email}]
 *   node engine/check-replies.mjs --dry-run
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { parseOutcomes, nextAction } from './outcomes.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const val = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };
const OUTCOMES = process.env.OUTREACH_OPS_OUTCOMES || join(ROOT, 'data', 'outcomes.tsv');

// 1. candidates: leads with an active sequence (not stopped)
const rows = existsSync(OUTCOMES) ? parseOutcomes(readFileSync(OUTCOMES, 'utf-8')) : [];
const active = [...new Set(rows.filter((r) => r.event === 'sent' || r.event === 'bumped').map((r) => r.lead_id))]
  .filter((id) => nextAction(rows, id).action !== 'stop');

// 2. addresses: explicit file wins; else enrich cache (contact_email)
let contacts = [];
if (val('--contacts')) {
  contacts = JSON.parse(readFileSync(val('--contacts'), 'utf-8'));
} else {
  const cacheDir = join(ROOT, 'data', 'enrich-cache');
  const byCompany = new Map();
  if (existsSync(cacheDir)) {
    for (const f of readdirSync(cacheDir)) {
      try {
        const j = JSON.parse(readFileSync(join(cacheDir, f), 'utf-8'));
        if (j.contact_email) byCompany.set(f.replace(/\.json$/, ''), j.contact_email);
      } catch { /* skip */ }
    }
  }
  const leadCompany = new Map(rows.map((r) => [r.lead_id, r.company]));
  for (const id of active) {
    const slug = String(leadCompany.get(id) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const email = byCompany.get(slug);
    if (email) contacts.push({ lead_id: id, email });
  }
}
if (!contacts.length) {
  console.log(JSON.stringify({ checked: 0, note: 'no active sequences with known addresses (enrich first, or pass --contacts)' }));
  process.exit(0);
}

// 3. fan out to replies-hook plugins (two-gate enforced by pluginStatus)
const { discoverPlugins, pluginRoots, pluginStatus, loadDotenvOnce } = await import('../plugins/_engine.mjs');
await loadDotenvOnce();
const yaml = await import('js-yaml'); // namespace: v4 + v5 compatible
const cfgPath = join(ROOT, 'config', 'plugins.yml');
const cfg = existsSync(cfgPath) ? (yaml.load(readFileSync(cfgPath, 'utf-8')) || {}) : {};
const detectors = discoverPlugins(pluginRoots(ROOT)).filter((m) => (m.hooks || []).includes('replies')).filter((m) => pluginStatus(m, cfg).enabled);
if (!detectors.length) {
  console.log(JSON.stringify({ checked: 0, note: 'no replies-hook plugin enabled (gmail) — mark replies manually in ledger mode' }));
  process.exit(0);
}

const found = [];
for (const m of detectors) {
  const mod = await import(join(m.dir, m.entry || 'index.mjs'));
  if (typeof mod.replies !== 'function') continue;
  const res = await mod.replies(contacts, { env: process.env, settings: cfg?.plugins?.[m.id] || {} });
  for (const r of res || []) if (r.replied) found.push(r);
}

// 4. log replied events (idempotent: skip leads already terminal)
const already = new Set(rows.filter((r) => r.event === 'replied').map((r) => r.lead_id));
let logged = 0;
for (const f of found) {
  if (already.has(f.lead_id)) continue;
  if (argv.includes('--dry-run')) { logged++; continue; }
  const meta = rows.find((r) => r.lead_id === f.lead_id) || {};
  execFileSync(process.execPath, [join(ROOT, 'engine/outcomes.mjs'), 'log',
    '--lead', f.lead_id, '--company', meta.company || '?', '--segment', meta.segment || '?',
    '--channel', meta.channel || 'email', '--angle', meta.angle_tag || '?', '--event', 'replied'],
    { env: process.env });
  logged++;
}
console.log(JSON.stringify({ checked: contacts.length, replies_found: found.length, events_logged: logged, dry_run: argv.includes('--dry-run') }, null, 2));
