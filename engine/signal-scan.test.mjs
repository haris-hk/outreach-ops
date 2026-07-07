#!/usr/bin/env node

/**
 * signal-scan.test.mjs — fixture tests for the signal layer. NO live HTTP:
 * mock providers in a temp dir return canned Signals; scan.mjs runs against
 * them via its injection flags. Also unit-tests the exported helpers.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
let passed = 0, failed = 0;
const ok = (c, m) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.log(`  ❌ ${m}`), failed++); };

// ── Unit: trigger matching / why-now ────────────────────────────────
const { matchTrigger, whyNow } = await import('./scan.mjs');
const seg = { id: 's1', triggers: ['raised_round', { hiring_for: ['ml', 'ai'] }, 'launched_product'] };
ok(matchTrigger({ signal_type: 'funding' }, seg) === 'raised_round', 'matchTrigger: funding → raised_round');
ok(matchTrigger({ signal_type: 'hiring', hiring_for: ['ml', 'backend'] }, seg) === 'hiring_for:ml', 'matchTrigger: hiring bucket overlap');
ok(matchTrigger({ signal_type: 'hiring', hiring_for: ['sales'] }, seg) === null, 'matchTrigger: no bucket overlap → null');
ok(matchTrigger({ signal_type: 'news' }, seg) === null, 'matchTrigger: untriggered type → null');
ok(whyNow({ headline: 'raised $4M', observed_at: Date.parse('2026-06-30') }, 'raised_round').includes('2026-06-30'), 'whyNow: dates the signal');

// ── Unit: hiring role buckets ───────────────────────────────────────
const { roleBuckets } = await import('../providers/hiring-signals.mjs');
ok(roleBuckets('Senior Machine Learning Engineer').includes('ml'), 'roleBuckets: ML title');
ok(roleBuckets('Full-Stack Developer').includes('backend') && roleBuckets('Full-Stack Developer').includes('frontend'), 'roleBuckets: full-stack → both');
ok(roleBuckets('Office Manager').includes('other'), 'roleBuckets: unknown → other');

// ── Unit: RSS parse + funding round parse ───────────────────────────
const { parseFeed } = await import('../providers/news-rss.mjs');
const rss = `<rss><channel><item><title>Acme raises $8M Series A</title><link>https://blog.acme.com/raise</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
const items = parseFeed(rss);
ok(items.length === 1 && items[0].title.startsWith('Acme'), 'parseFeed: RSS item extracted');
const { parseRound } = await import('../providers/funding.mjs');
const round = parseRound('Acme raises $8M Series A to fix widgets');
ok(round && round.company === 'Acme' && round.amount === '$8M' && round.series === 'a', 'parseRound: company/amount/series');
ok(parseRound('Acme ships new dashboard') === null, 'parseRound: non-funding → null');

// ── Integration: scan over 3 mock providers, then dedup on re-run ──
const tmp = mkdtempSync(join(tmpdir(), 'oo-scan-'));
const provDir = join(tmp, 'providers');
const mk = (name, body) => { writeFileSync(join(provDir, name), body); };
execFileSync('mkdir', ['-p', provDir]);

mk('mock-hiring.mjs', `export default { id: 'mock-hiring',
  detect: (e) => e.careers_url ? { url: e.careers_url } : null,
  fetch: async (e) => [{ company: e.company, signal_type: 'hiring', headline: 'hiring: ML Engineer', hiring_for: ['ml'], source_url: 'https://jobs.example.com/ml-1' }] };`);
mk('mock-funding.mjs', `export default { id: 'mock-funding',
  detect: (e) => e.provider === 'mock-funding' ? { url: 'x' } : null,
  fetch: async () => [{ company: 'FreshRaise', signal_type: 'funding', headline: 'raised $4M seed', source_url: 'https://news.example.com/raise-1', observed_at: ${Date.now()} }] };`);
mk('mock-oss.mjs', `export default { id: 'mock-oss',
  detect: (e) => e.github_org ? { url: 'x' } : null,
  fetch: async (e) => [
    { company: e.company, signal_type: 'oss', headline: 'new repo: agent-kit', source_url: 'https://github.com/x/agent-kit' },
    { company: e.company, signal_type: 'oss', headline: 'BAD RECORD', source_url: 'http://insecure.example.com' }] };`);

writeFileSync(join(tmp, 'icp.yml'), `
segments:
  - id: seed-ai
    triggers: [raised_round, {hiring_for: [ml]}, news_activity]
    sources:
      - { provider: mock-funding }
watchlists:
  companies:
    - { name: NovaStack, company: NovaStack, careers_url: "https://jobs.example.com/novastack", github_org: novastack }
`);

const inbox = join(tmp, 'inbox.md');
const history = join(tmp, 'history.tsv');
const args = [join(ROOT, 'engine/scan.mjs'), '--icp', join(tmp, 'icp.yml'), '--inbox', inbox, '--history', history, '--providers-dir', provDir];

const out1 = execFileSync(NODE, args, { encoding: 'utf-8', cwd: ROOT });
const inboxText = existsSync(inbox) ? readFileSync(inbox, 'utf-8') : '';
ok(/3 new leads/.test(out1), `first scan finds 3 leads (hiring+funding+oss) — got: ${out1.trim().split('\n')[0]}`);
ok(inboxText.includes('NovaStack') && inboxText.includes('FreshRaise'), 'inbox names both companies');
ok(inboxText.includes('trigger: hiring_for:ml') && inboxText.includes('trigger: raised_round') && inboxText.includes('trigger: news_activity'), 'inbox carries why-now trigger lines');
ok(!inboxText.includes('BAD RECORD'), 'invalid (non-HTTPS) record dropped');
ok(readFileSync(history, 'utf-8').trim().split('\n').length === 4, 'history has header + 3 rows');

const out2 = execFileSync(NODE, args, { encoding: 'utf-8', cwd: ROOT });
ok(/0 new leads/.test(out2) && /3 dups/.test(out2), `re-run dedups all 3 — got: ${out2.trim().split('\n')[0]}`);

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
