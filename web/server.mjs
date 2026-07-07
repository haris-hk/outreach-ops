#!/usr/bin/env node

/**
 * server.mjs — outreach-ops local web board (alpha). READ-ONLY by design:
 * a zero-dependency view over the same files the CLI owns (leads.md, inbox.md,
 * outcomes.tsv, dossiers). Writes stay with the engine scripts and your agent —
 * the web layer cannot mutate state, so it can't corrupt it.
 *
 * Security posture: binds 127.0.0.1 only; dossier paths are resolved inside
 * data/dossiers with traversal rejection; no external requests; no accounts.
 *
 * Usage: npm run web   (then open http://127.0.0.1:4870)
 *        PORT=5000 node web/server.mjs
 */

import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, resolve, normalize } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT || 4870);
const HOST = '127.0.0.1';

const { resolveColumns } = await import('../engine/tracker-parse.mjs');
const { parseOutcomes } = await import('../engine/outcomes.mjs');
const { computePatterns } = await import('../engine/patterns.mjs');
const { mdToHtml, parseFrontMatter } = await import('../engine/render-dossier.mjs');

// ── data readers (exported for tests) ──────────────────────────────
export function readLeads(root = ROOT) {
  const p = join(root, 'data', 'leads.md');
  if (!existsSync(p)) return [];
  const lines = readFileSync(p, 'utf-8').split('\n');
  const colmap = resolveColumns(lines);
  const leads = [];
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const raw = line.trim().split('|').map((c) => c.trim());
    if (raw[1] === '#' || /^[-: ]*$/.test(raw.join(''))) continue;
    const cell = (n) => (colmap[n] != null ? raw[colmap[n]] ?? '' : '');
    const gradeNum = parseFloat(String(cell('score')).replace(/\*\*/g, ''));
    const dossier = (cell('report').match(/\]\(([^)]+)\)/) || [])[1] || '';
    leads.push({
      num: cell('num'), date: cell('date'), company: cell('company'),
      contact: cell('contact'), role: cell('role'), segment: cell('segment'),
      grade: Number.isFinite(gradeNum) ? gradeNum : null,
      channel: cell('channel'), status: cell('status'),
      dossier, notes: cell('notes'),
    });
  }
  return leads;
}

export function readInbox(root = ROOT) {
  const p = join(root, 'data', 'inbox.md');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').split('\n')
    .filter((l) => /^- \[[ x]\]/.test(l.trim()))
    .map((l) => ({ done: /^- \[x\]/i.test(l.trim()), text: l.replace(/^- \[[ x]\]\s*/i, '').trim() }));
}

export function safeDossierPath(root, rel) {
  const base = resolve(root, 'data', 'dossiers');
  const target = resolve(base, normalize(String(rel)).replace(/^([/\\.])+/, ''));
  if (!target.startsWith(base + '/') && target !== base) return null;
  return existsSync(target) ? target : null;
}

// ── HTTP ────────────────────────────────────────────────────────────
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

export function handler(req, res, root = ROOT) {
  const url = new URL(req.url, `http://${HOST}`);
  if (req.method !== 'GET') return json(res, 405, { error: 'read-only server' });

  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(readFileSync(join(ROOT, 'web', 'index.html')));
  }
  if (url.pathname === '/api/leads') return json(res, 200, readLeads(root));
  if (url.pathname === '/api/inbox') return json(res, 200, readInbox(root));
  if (url.pathname === '/api/stats') {
    const p = join(root, 'data', 'outcomes.tsv');
    const rows = existsSync(p) ? parseOutcomes(readFileSync(p, 'utf-8')) : [];
    return json(res, 200, computePatterns(rows));
  }
  if (url.pathname === '/api/dossier') {
    const target = safeDossierPath(root, url.searchParams.get('path') || '');
    if (!target) return json(res, 404, { error: 'not found' });
    const { meta, body } = parseFrontMatter(readFileSync(target, 'utf-8'));
    return json(res, 200, { meta, html: mdToHtml(body) });
  }
  return json(res, 404, { error: 'not found' });
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;
if (isMain) {
  createServer((req, res) => { try { handler(req, res); } catch (e) { json(res, 500, { error: e.message }); } })
    .listen(PORT, HOST, () => console.log(`outreach-ops board (read-only) → http://${HOST}:${PORT}`));
}
