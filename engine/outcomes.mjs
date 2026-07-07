#!/usr/bin/env node

/**
 * outcomes.mjs — append-only outreach event log (the learning-loop substrate).
 *
 * data/outcomes.tsv columns:
 *   ts  lead_id  company  segment  channel  angle_tag  variant  event
 * Events: sent | bumped | opened | replied | positive | bounced | meeting | won | lost
 *
 * Usage:
 *   node engine/outcomes.mjs log --lead 001 --company NovaStack --segment seed-ai \
 *        --channel email --angle timing-raise --variant a --event sent
 *   node engine/outcomes.mjs list [--lead 001] [--event replied]
 *   node engine/outcomes.mjs next --lead 001      # sequencing helper (reply-aware)
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE = process.env.OUTREACH_OPS_OUTCOMES || join(ROOT, 'data', 'outcomes.tsv');
export const EVENTS = ['sent', 'bumped', 'opened', 'replied', 'positive', 'bounced', 'meeting', 'won', 'lost'];
export const HEADER = 'ts\tlead_id\tcompany\tsegment\tchannel\tangle_tag\tvariant\tevent';
const REPLY_EVENTS = new Set(['replied', 'positive', 'meeting', 'won', 'lost', 'bounced']);

export function parseOutcomes(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    const c = line.split('\t');
    if (c.length < 8 || c[0] === 'ts') continue;
    rows.push({ ts: c[0], lead_id: c[1], company: c[2], segment: c[3], channel: c[4], angle_tag: c[5], variant: c[6], event: c[7].trim() });
  }
  return rows;
}

/** Reply-aware next action for a lead. Exported for tests. */
export function nextAction(rows, lead, cadence = { max_touches: 3, min_gap_days: 4 }) {
  const mine = rows.filter((r) => r.lead_id === lead);
  if (mine.some((r) => REPLY_EVENTS.has(r.event))) {
    const why = mine.find((r) => REPLY_EVENTS.has(r.event)).event;
    return { action: 'stop', reason: `terminal/reply event recorded: ${why} — sequence cancelled` };
  }
  const touches = mine.filter((r) => r.event === 'sent' || r.event === 'bumped');
  if (!touches.length) return { action: 'send', touch: 1 };
  if (touches.length >= (cadence.max_touches ?? 3)) return { action: 'stop', reason: `max_touches (${cadence.max_touches}) reached` };
  const last = touches.map((r) => Date.parse(r.ts)).sort((a, b) => b - a)[0];
  const due = new Date(last + (cadence.min_gap_days ?? 4) * 864e5);
  return Date.now() >= due.getTime()
    ? { action: 'bump', touch: touches.length + 1 }
    : { action: 'wait', until: due.toISOString().slice(0, 10), touch: touches.length + 1 };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const val = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };
  const rows = existsSync(FILE) ? parseOutcomes(readFileSync(FILE, 'utf-8')) : [];

  if (cmd === 'log') {
    const event = val('--event');
    if (!EVENTS.includes(event)) { console.error(`event must be one of: ${EVENTS.join(' | ')}`); process.exit(1); }
    const rec = [
      val('--ts') || new Date().toISOString(),
      val('--lead') || '?', val('--company') || '?', val('--segment') || '?',
      val('--channel') || '?', val('--angle') || '?', val('--variant') || 'a', event,
    ];
    if (rec.some((x) => /\t|\n/.test(x))) { console.error('fields may not contain tabs/newlines'); process.exit(1); }
    mkdirSync(dirname(FILE), { recursive: true });
    if (!existsSync(FILE)) appendFileSync(FILE, HEADER + '\n');
    appendFileSync(FILE, rec.join('\t') + '\n');
    console.log(JSON.stringify({ logged: rec.join(' ') }));
  } else if (cmd === 'list') {
    const lead = val('--lead'); const event = val('--event');
    const out = rows.filter((r) => (!lead || r.lead_id === lead) && (!event || r.event === event));
    console.log(JSON.stringify(out, null, 2));
  } else if (cmd === 'next') {
    const lead = val('--lead');
    if (!lead) { console.error('usage: outcomes.mjs next --lead ID [--max-touches N] [--gap-days N]'); process.exit(1); }
    const cadence = { max_touches: Number(val('--max-touches') || 3), min_gap_days: Number(val('--gap-days') || 4) };
    console.log(JSON.stringify({ lead, ...nextAction(rows, lead, cadence) }, null, 2));
  } else {
    console.error('usage: outcomes.mjs log|list|next ...');
    process.exit(1);
  }
}

import { pathToFileURL } from 'url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
