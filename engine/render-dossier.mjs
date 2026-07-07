#!/usr/bin/env node

/**
 * render-dossier.mjs — one-page lead-dossier PDF (Playwright HTML→PDF, same
 * engine as the upstream CV renderer). Give a prospect a designed one-pager
 * (or keep it internal as call-prep material).
 *
 * Usage:
 *   node engine/render-dossier.mjs data/dossiers/001-novastack-2026-07-07.md
 *   node engine/render-dossier.mjs {file} --out output/custom-name.pdf
 * Requires the optional playwright dependency (npx playwright install chromium).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, basename, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Front-matter parse (yaml-lite: k: v lines). Exported for tests. */
export function parseFrontMatter(text) {
  const m = String(text).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

/** Minimal markdown → HTML (headings, bold/italic/code, links, lists, tables,
 * blockquotes, paragraphs). Deliberately dependency-free. Exported for tests. */
export function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => /^https?:\/\//.test(u) ? `<a href="${u}">${t}</a>` : t);

  const lines = String(md).split('\n');
  const out = [];
  let list = false, table = 0, quote = false;
  const closeAll = () => { if (list) { out.push('</ul>'); list = false; } if (table) { out.push('</table>'); table = 0; } if (quote) { out.push('</blockquote>'); quote = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeAll(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*[-*]\s+/.test(line)) { if (table) { out.push('</table>'); table = 0; } if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`); continue; }
    if (/^\|/.test(line)) {
      if (list) { out.push('</ul>'); list = false; }
      if (/^\|[\s:|-]+\|$/.test(line)) continue; // separator row
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!table) { out.push('<table>'); table = 1; out.push(`<tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`); }
      else out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      continue;
    }
    if (/^>\s?/.test(line)) { closeAll(); if (!quote) { out.push('<blockquote>'); quote = true; } out.push(`<p>${inline(line.replace(/^>\s?/, ''))}</p>`); continue; }
    if (!line.trim()) { closeAll(); continue; }
    closeAll();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeAll();
  return out.join('\n');
}

/** Build the full HTML document. Exported for tests. */
export function buildHtml(dossierText, templateText) {
  const { meta, body } = parseFrontMatter(dossierText);
  const chips = ['segment', 'channel', 'status'].filter((k) => meta[k]).map((k) => `<span class="chip">${k}: ${meta[k]}</span>`).join('');
  const head = `<h1>${meta.company || 'Lead dossier'}</h1>
<div class="meta">${meta.grade ? `<span class="grade">${meta.grade}/5</span>` : ''}${chips}${meta.contact ? `<span class="chip">contact: ${meta.contact}</span>` : ''}</div>`;
  return templateText
    .replace('{{TITLE}}', `${meta.company || 'Lead'} — dossier`)
    .replace('{{CONTENT}}', head + mdToHtml(body))
    .replace('{{FOOTER}}', `outreach-ops dossier · generated ${new Date().toISOString().slice(0, 10)} · sources cited inline`);
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) { console.error('usage: render-dossier.mjs data/dossiers/NNN-slug-date.md [--out path.pdf]'); process.exit(1); }
  const outArg = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
  const dossier = readFileSync(resolve(file), 'utf-8');
  const template = readFileSync(join(ROOT, 'templates', 'dossier.html'), 'utf-8');
  const html = buildHtml(dossier, template);

  const outDir = join(ROOT, 'output');
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, basename(file).replace(/\.md$/, '.html'));
  writeFileSync(htmlPath, html);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    console.log(JSON.stringify({ html: htmlPath, pdf: null, note: 'playwright not installed — HTML written; npx playwright install chromium for PDF' }));
    return;
  }
  const pdfPath = outArg ? resolve(outArg) : htmlPath.replace(/\.html$/, '.pdf');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.log(JSON.stringify({ html: htmlPath, pdf: null, note: `chromium unavailable (${err.message.split('\n')[0]}) — HTML written; run: npx playwright install chromium` }));
    return;
  }
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  } finally { await browser.close(); }
  console.log(JSON.stringify({ html: htmlPath, pdf: pdfPath }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
