#!/usr/bin/env node

/**
 * test-all.mjs — outreach-ops test suite.
 *
 * Lean rewrite of the upstream suite (see docs/DECISIONS.md): syntax sweep,
 * unit tests, data-contract coverage, required files, brand purge, and the
 * two safety invariants (no sending code, no absolute user paths).
 *
 * Usage: node engine/test-all.mjs [--quick]
 */

import { execFileSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
let passed = 0, failed = 0, warnings = 0;
const pass = (m) => { console.log(`  ✅ ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ ${m}`); failed++; };
const warn = (m) => { console.log(`  ⚠️  ${m}`); warnings++; };

function walk(dir, exts, skip = ['node_modules', '.git', '.upstream', 'web', 'dashboard']) {
  const out = [];
  for (const e of readdirSync(join(ROOT, dir || '.'), { withFileTypes: true })) {
    if (e.name.startsWith('.git')) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!skip.includes(e.name)) out.push(...walk(rel, exts, skip));
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(rel);
  }
  return out;
}

// ── 1. Syntax sweep ────────────────────────────────────────────────
console.log('\n1) Syntax check (all .mjs)');
const mjs = walk('', ['.mjs']);
let synBad = 0;
for (const f of mjs) {
  try { execFileSync(NODE, ['--check', join(ROOT, f)], { stdio: 'pipe' }); }
  catch (e) { fail(`syntax: ${f}`); synBad++; }
}
if (!synBad) pass(`${mjs.length} .mjs files parse`);

// ── 2. Unit tests ──────────────────────────────────────────────────
console.log('\n2) Unit tests');
const UNIT = [
  'engine/updater-migration-tests.mjs',
  'engine/tracker-columns-tests.mjs',
  'engine/followup-seed-tests.mjs',
  'engine/followup-cadence.test.mjs',
  'engine/detect-reposts.test.mjs',
  'engine/test-trust-validator.mjs',
];
for (const t of UNIT) {
  if (!existsSync(join(ROOT, t))) { warn(`missing unit test ${t}`); continue; }
  try {
    execFileSync(NODE, [join(ROOT, t)], { stdio: 'pipe', cwd: ROOT, timeout: 120000 });
    pass(t);
  } catch (e) {
    fail(`${t}: exit ${e.status ?? 'error'}`);
    const out = `${e.stdout || ''}${e.stderr || ''}`.trim().split('\n').slice(-6).join('\n');
    if (out) console.log(out.replace(/^/gm, '      '));
  }
}

// ── 3. Data-contract coverage ─────────────────────────────────────
console.log('\n3) Data-contract path coverage');
try {
  execFileSync(NODE, [join(ROOT, 'engine/validate-system-paths-coverage.mjs')], { stdio: 'pipe', cwd: ROOT });
  pass('every tracked file classified system/user');
} catch (e) {
  fail('paths-coverage');
  console.log(`${e.stdout || ''}${e.stderr || ''}`.trim().split('\n').slice(-10).join('\n').replace(/^/gm, '      '));
}

// ── 4. Required files ─────────────────────────────────────────────
console.log('\n4) Required files');
const REQUIRED = [
  'CLAUDE.md', 'DATA_CONTRACT.md', 'LICENSE', 'VERSION', 'package.json',
  'engine/doctor.mjs', 'engine/update-system.mjs', 'engine/scan.mjs',
  'providers/_registry.mjs', 'providers/_http.mjs', 'providers/_trust-validator.mjs',
  'plugins.mjs', 'plugins/_engine.mjs', 'plugins-registry.json',
  'templates/states.yml', 'templates/profile/offer.example.yml',
  'templates/profile/icp.example.yml', 'templates/profile/preferences.example.yml',
  'templates/profile/background.example.md',
  'batch/batch-runner.sh', 'docs/ARCHITECTURE.md', 'docs/DECISIONS.md',
];
let reqBad = 0;
for (const f of REQUIRED) if (!existsSync(join(ROOT, f))) { fail(`missing ${f}`); reqBad++; }
if (!reqBad) pass(`${REQUIRED.length} required files present`);

// ── 5. Brand purge ────────────────────────────────────────────────
console.log('\n5) Brand purge (career-ops only allowed in LICENSE/attribution docs)');
const ALLOW = new Set(['LICENSE', 'README.md', 'CLAUDE.md', 'AGENTS.md', 'CHANGELOG.md', 'docs/DECISIONS.md', 'docs/ARCHITECTURE.md', 'docs/BUILD_PROMPT.md', 'engine/test-all.mjs']);
const textFiles = walk('', ['.mjs', '.js', '.md', '.yml', '.json', '.sh', '.html']);
let brandBad = 0;
for (const f of textFiles) {
  if (ALLOW.has(f)) continue;
  const c = readFileSync(join(ROOT, f), 'utf-8');
  if (/career-ops|careerops|Career-Ops/i.test(c)) { fail(`brand string in ${f}`); brandBad++; }
}
if (!brandBad) pass('no career-ops brand strings outside attribution files');

// ── 6. Safety invariants ──────────────────────────────────────────
console.log('\n6) Safety invariants');
const SEND_RE = /nodemailer|createTransport|smtp:\/\/|sendmail|gmail\.users\.messages\.send|users\.messages\.send|linkedin.*automation/i;
let sendBad = 0;
for (const f of walk('', ['.mjs', '.js', '.sh'])) {
  if (f === 'engine/test-all.mjs') continue;
  const c = readFileSync(join(ROOT, f), 'utf-8');
  if (SEND_RE.test(c)) { fail(`possible sending code path in ${f}`); sendBad++; }
}
if (!sendBad) pass('no sending code paths (draft-only invariant holds)');

let absBad = 0;
for (const f of walk('', ['.mjs', '.sh', '.yml'])) {
  const c = readFileSync(join(ROOT, f), 'utf-8');
  if (/\/Users\/[a-zA-Z]/.test(c)) { fail(`absolute user path in ${f}`); absBad++; }
}
if (!absBad) pass('no absolute /Users/ paths');

// ── Summary ───────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}\n  passed: ${passed}  failed: ${failed}  warnings: ${warnings}`);
process.exit(failed ? 1 : 0);
