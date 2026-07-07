#!/usr/bin/env node

/**
 * patterns.mjs — outcome pattern mining over data/outcomes.tsv.
 *
 * Slices reply/positive/win rates by segment, channel, angle_tag, variant,
 * and send time (weekday/hour). Emits JSON with data-driven observations the
 * review mode turns into PROPOSALS (never auto-applied).
 *
 * Usage: node engine/patterns.mjs [--min-n 3] [--file path]
 * (The legacy ledger-status analyzer survives as engine/analyze-patterns.mjs.)
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { parseOutcomes } from './outcomes.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSITIVE = new Set(['replied', 'positive', 'meeting', 'won']);
const TOUCH = new Set(['sent', 'bumped']);

/** Compute rate tables from outcome rows. Exported for tests. */
export function computePatterns(rows, minN = 3) {
  const dims = ['segment', 'channel', 'angle_tag', 'variant'];
  const out = { totals: { touches: 0, replies: 0, wins: 0 }, by: {}, timing: { weekday: {}, hour: {} }, observations: [] };

  // A lead "converted" if it has any positive event; attribute to the lead's touch attributes.
  const leads = new Map();
  for (const r of rows) {
    const l = leads.get(r.lead_id) || { touches: [], positive: false, won: false };
    if (TOUCH.has(r.event)) l.touches.push(r);
    if (POSITIVE.has(r.event)) l.positive = true;
    if (r.event === 'won') l.won = true;
    leads.set(r.lead_id, l);
  }

  for (const dim of dims) out.by[dim] = {};
  for (const [, l] of leads) {
    if (!l.touches.length) continue;
    out.totals.touches += l.touches.length;
    if (l.positive) out.totals.replies++;
    if (l.won) out.totals.wins++;
    const first = l.touches[0];
    for (const dim of dims) {
      const key = first[dim] || '?';
      const cell = out.by[dim][key] || { leads: 0, replies: 0, wins: 0 };
      cell.leads++; if (l.positive) cell.replies++; if (l.won) cell.wins++;
      out.by[dim][key] = cell;
    }
    const d = new Date(first.ts);
    if (!Number.isNaN(d.getTime())) {
      const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
      const cellW = out.timing.weekday[wd] || { leads: 0, replies: 0 };
      cellW.leads++; if (l.positive) cellW.replies++;
      out.timing.weekday[wd] = cellW;
      const hr = String(d.getUTCHours()).padStart(2, '0');
      const cellH = out.timing.hour[hr] || { leads: 0, replies: 0 };
      cellH.leads++; if (l.positive) cellH.replies++;
      out.timing.hour[hr] = cellH;
    }
  }

  // rates + observations (only where n >= minN)
  for (const dim of ['segment', 'channel', 'angle_tag', 'variant']) {
    const cells = Object.entries(out.by[dim]).map(([k, c]) => ({ key: k, ...c, reply_rate: c.leads ? +(c.replies / c.leads).toFixed(3) : 0 }));
    for (const c of cells) out.by[dim][c.key].reply_rate = c.reply_rate;
    const solid = cells.filter((c) => c.leads >= minN).sort((a, b) => b.reply_rate - a.reply_rate);
    if (solid.length >= 2 && solid[0].reply_rate >= solid[solid.length - 1].reply_rate * 2 && solid[0].reply_rate > 0) {
      out.observations.push({
        dim,
        finding: `${dim} "${solid[0].key}" replies at ${(solid[0].reply_rate * 100).toFixed(0)}% (n=${solid[0].leads}) vs "${solid[solid.length - 1].key}" at ${(solid[solid.length - 1].reply_rate * 100).toFixed(0)}% (n=${solid[solid.length - 1].leads})`,
        suggestion: dim === 'channel'
          ? `consider making "${solid[0].key}" the default channel for the affected segments (preferences.yml → channels)`
          : dim === 'angle_tag'
            ? `promote angle "${solid[0].key}"; consider retiring "${solid[solid.length - 1].key}"`
            : `weight attention toward "${solid[0].key}" (review mode decides)`,
      });
    }
  }
  if (out.totals.touches && !out.observations.length) {
    out.observations.push({ dim: 'n', finding: `not enough per-slice volume yet (min n=${minN}) — keep logging`, suggestion: 'no changes proposed' });
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const val = (n, d) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : d; };
  const file = val('--file', process.env.OUTREACH_OPS_OUTCOMES || join(ROOT, 'data', 'outcomes.tsv'));
  if (!existsSync(file)) { console.log(JSON.stringify({ error: 'no outcomes.tsv yet — log events first (engine/outcomes.mjs)' })); return; }
  const rows = parseOutcomes(readFileSync(file, 'utf-8'));
  console.log(JSON.stringify(computePatterns(rows, Number(val('--min-n', 3))), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
