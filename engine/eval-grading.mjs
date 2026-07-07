#!/usr/bin/env node

/**
 * eval-grading.mjs — agent-level eval: run the grading fixtures through a
 * REAL LLM and check each lands in its expected grade range. This is the
 * regression net for rubric/prompt changes that unit tests can't see.
 *
 * Providers (first configured wins, or force with --provider):
 *   anthropic  ANTHROPIC_API_KEY   (api.anthropic.com, claude-haiku default)
 *   openai     OPENAI_API_KEY      (api.openai.com, gpt-4o-mini default)
 *   ollama     OLLAMA_HOST or local default (http://127.0.0.1:11434)
 *
 * Usage:
 *   node engine/eval-grading.mjs [--provider anthropic|openai|ollama] [--model NAME]
 *   node engine/eval-grading.mjs --mock "4.6,3.8,3.2,1.5,1.0"   # offline self-test
 * Exit: 0 all in range · 1 failures · 2 no provider configured
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(ROOT, 'test', 'fixtures', 'prospects');

// ── fixture loading (exported for the offline unit test) ───────────
export function loadFixtures(dir = FIXTURES) {
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'README.md').sort()) {
    const text = readFileSync(join(dir, f), 'utf-8');
    const fm = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fm) continue;
    const meta = {};
    for (const line of fm[1].split('\n')) {
      const kv = line.match(/^(\w[\w_]*):\s*(.+)$/);
      if (kv) meta[kv[1]] = kv[2].trim();
    }
    const range = (meta.expected_grade_range || '').match(/\[?\s*([\d.]+)\s*,\s*([\d.]+)\s*\]?/);
    if (!range) continue;
    out.push({ file: f, id: meta.id || f, lo: Number(range[1]), hi: Number(range[2]), verdict: meta.expected_verdict || null, body: fm[2].trim() });
  }
  return out;
}

export function inRange(score, fx) {
  return typeof score === 'number' && score >= fx.lo - 1e-9 && score <= fx.hi + 1e-9;
}

/** Extract {score, verdict} from a model reply. Exported for tests. */
export function parseModelReply(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const score = Number(j.score);
    return Number.isFinite(score) ? { score, verdict: j.verdict || null } : null;
  } catch { return null; }
}

function buildPrompt(fx) {
  const rubric = readFileSync(join(ROOT, 'modes', '_shared.md'), 'utf-8');
  const weights = execFileSync(process.execPath, [join(ROOT, 'engine', 'weights.mjs')], { encoding: 'utf-8' });
  const offer = readFileSync(join(ROOT, 'templates', 'profile', 'offer.example.yml'), 'utf-8');
  const icp = readFileSync(join(ROOT, 'templates', 'profile', 'icp.example.yml'), 'utf-8');
  return `You are the outreach-ops grading engine. Grade the prospect below for the user profile given, using ONLY the rubric and weights provided. Do no web research — treat the prospect description as the complete dossier (facts not present are unavailable).

## Rubric (authoritative)
${rubric}

## Effective weights
${weights}

## User offer (example profile)
${offer}

## User ICP
${icp}

## Prospect
${fx.body}

Respond with ONLY a JSON object: {"score": <number 1-5, one decimal>, "verdict": "priority|standard|nurture|disqualify", "reason": "<one line>"}`;
}

// ── model callers (thin; hosts hardcoded) ──────────────────────────
async function callAnthropic(prompt, model) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: model || 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);
  const j = await res.json();
  return j?.content?.[0]?.text || '';
}
async function callOpenAI(prompt, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: model || 'gpt-4o-mini', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`openai HTTP ${res.status}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content || '';
}
async function callOllama(prompt, model) {
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3.1', prompt, stream: false }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  const j = await res.json();
  return j?.response || '';
}

async function main() {
  const argv = process.argv.slice(2);
  const val = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };
  const fixtures = loadFixtures();
  if (!fixtures.length) { console.error('no fixtures found'); process.exit(1); }

  const mock = val('--mock');
  let ask;
  let providerName;
  if (mock) {
    const scores = mock.split(',').map(Number);
    let i = 0;
    providerName = 'mock';
    ask = async () => JSON.stringify({ score: scores[i++], verdict: 'n/a' });
  } else {
    const forced = val('--provider');
    const pick = forced
      || (process.env.ANTHROPIC_API_KEY && 'anthropic')
      || (process.env.OPENAI_API_KEY && 'openai')
      || (process.env.OLLAMA_HOST && 'ollama');
    if (!pick) {
      console.error('No provider configured. Set ANTHROPIC_API_KEY / OPENAI_API_KEY / OLLAMA_HOST (or use --mock for a dry run).');
      process.exit(2);
    }
    providerName = pick;
    const model = val('--model');
    const fn = { anthropic: callAnthropic, openai: callOpenAI, ollama: callOllama }[pick];
    if (!fn) { console.error(`unknown provider ${pick}`); process.exit(1); }
    ask = (prompt) => fn(prompt, model);
  }

  console.log(`Grading ${fixtures.length} fixtures via ${providerName}...\n`);
  let failed = 0;
  for (const fx of fixtures) {
    let reply, parsed;
    try {
      reply = await ask(buildPrompt(fx));
      parsed = parseModelReply(reply);
    } catch (err) {
      console.log(`  ❌ ${fx.file}: provider error — ${err.message}`); failed++; continue;
    }
    if (!parsed) { console.log(`  ❌ ${fx.file}: unparseable reply: ${String(reply).slice(0, 80)}`); failed++; continue; }
    const pass = inRange(parsed.score, fx);
    console.log(`  ${pass ? '✅' : '❌'} ${fx.file}: scored ${parsed.score} (expected ${fx.lo}–${fx.hi})${parsed.verdict ? ` verdict=${parsed.verdict}` : ''}`);
    if (!pass) failed++;
  }
  console.log(`\n${fixtures.length - failed}/${fixtures.length} fixtures in range`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
