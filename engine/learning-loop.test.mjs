#!/usr/bin/env node

/**
 * learning-loop.test.mjs — M3 acceptance on fixtures, no live HTTP:
 * outcomes log → reply-aware next-action → patterns → observation/suggestion
 * → spam preflight blocks a spammy draft, passes a clean one →
 * deliverability assess() on canned DNS records → dossier HTML build.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
let passed = 0, failed = 0;
const ok = (c, m) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.log(`  ❌ ${m}`), failed++); };
const tmp = mkdtempSync(join(tmpdir(), 'oo-loop-'));
const OUT = join(tmp, 'outcomes.tsv');
const env = { ...process.env, OUTREACH_OPS_OUTCOMES: OUT };
const outcomes = (args) => execFileSync(NODE, [join(ROOT, 'engine/outcomes.mjs'), ...args], { env, encoding: 'utf-8' });

// ── 1. Simulated campaign: 6 leads, email vs dm, two angles ────────
const log = (lead, company, channel, angle, event, ts) =>
  outcomes(['log', '--lead', lead, '--company', company, '--segment', 'seed-ai', '--channel', channel, '--angle', angle, '--event', event, '--ts', ts]);
const D = (d) => `2026-06-${String(d).padStart(2, '0')}T09:00:00.000Z`;
// email+timing angle: 3 leads, 2 replies (one wins)
log('001', 'NovaStack', 'email', 'timing-raise', 'sent', D(1)); log('001', 'NovaStack', 'email', 'timing-raise', 'replied', D(3)); log('001', 'NovaStack', 'email', 'timing-raise', 'won', D(20));
log('002', 'Parcelwise', 'email', 'timing-raise', 'sent', D(2)); log('002', 'Parcelwise', 'email', 'timing-raise', 'replied', D(6));
log('003', 'Brightline', 'email', 'timing-raise', 'sent', D(2)); log('003', 'Brightline', 'email', 'timing-raise', 'bumped', D(8));
// dm+generic angle: 3 leads, 0 replies
log('004', 'AlphaCo', 'dm', 'generic-intro', 'sent', D(3));
log('005', 'BetaCo', 'dm', 'generic-intro', 'sent', D(3));
log('006', 'GammaCo', 'dm', 'generic-intro', 'sent', D(4));

// ── 2. Reply-aware sequencing ──────────────────────────────────────
const next1 = JSON.parse(outcomes(['next', '--lead', '001']));
ok(next1.action === 'stop' && /replied|won/.test(next1.reason), 'replied lead → sequence stopped');
const next3 = JSON.parse(outcomes(['next', '--lead', '003', '--gap-days', '4']));
ok(next3.action === 'bump' && next3.touch === 3, 'quiet lead past gap → bump due (touch 3)');
const next3max = JSON.parse(outcomes(['next', '--lead', '003', '--max-touches', '2']));
ok(next3max.action === 'stop' && /max_touches/.test(next3max.reason), 'max_touches respected');

// ── 3. Patterns: email/timing angle should dominate ────────────────
const pat = JSON.parse(execFileSync(NODE, [join(ROOT, 'engine/patterns.mjs'), '--file', OUT, '--min-n', '3'], { encoding: 'utf-8' }));
ok(pat.totals.replies === 2 && pat.totals.wins === 1, `totals correct (replies=2, wins=1) — got ${JSON.stringify(pat.totals)}`);
ok(pat.by.channel.email.reply_rate > pat.by.channel.dm.reply_rate, 'email reply rate > dm');
const chanObs = pat.observations.find((o) => o.dim === 'channel');
ok(!!chanObs && /email/.test(chanObs.finding), 'observation surfaces email > dm with evidence');
ok(!!pat.observations.find((o) => o.dim === 'angle_tag' && /timing-raise/.test(o.finding)), 'observation surfaces winning angle');

// ── 4. Spam preflight ──────────────────────────────────────────────
const { lint } = await import('./spam-preflight.mjs');
const spammy = lint({ body: 'CLICK HERE for a limited time exclusive deal!!! https://a.com https://b.com Buy now, this is not spam.', subject: 'FREE money!', company: 'NovaStack' });
ok(!spammy.pass && spammy.fails >= 4, `spammy draft blocked (${spammy.fails} fails)`);
const clean = lint({ body: 'Saw NovaStack raised the $4M seed — congrats. We cut LLM routing costs 40% for a similar Series A team; the write-up maps closely to what Jane is building. Worth a 15-min look at how?', subject: 'NovaStack + eval pipelines', company: 'NovaStack', contact: 'Jane Ray' });
ok(clean.pass, `clean personalized draft passes — issues: ${JSON.stringify(clean.issues)}`);
const impersonal = lint({ body: 'We are a leading provider of AI solutions helping businesses transform. Our platform delivers results for teams of any size and industry vertical today.', company: 'NovaStack' });
ok(!impersonal.pass && impersonal.issues.some((i) => i.rule === 'personalization'), 'unpersonalized draft blocked');

// ── 5. Deliverability assess (canned records, no DNS) ──────────────
const { assess } = await import('./deliverability-doctor.mjs');
const good = assess({ spfRecords: ['v=spf1 include:_spf.google.com ~all'], dmarcRecords: ['v=DMARC1; p=quarantine;'], mxCount: 2, dkimFound: true });
ok(good.pass, 'healthy DNS posture passes');
const bad = assess({ spfRecords: [], dmarcRecords: [], mxCount: 0 });
ok(!bad.pass && bad.checks.filter((c) => !c.pass).length === 3, 'missing SPF/DMARC/MX all flagged with fixes');

// ── 6. Dossier render (HTML build; PDF needs playwright, skipped) ──
const { buildHtml, mdToHtml, parseFrontMatter } = await import('./render-dossier.mjs');
const dossier = `---\ncompany: NovaStack\ngrade: 4.6\nsegment: seed-ai\ncontact: Jane Ray\n---\n## Fit map\n\n| Their need | Our proof |\n|---|---|\n| ML lead gap | shipped RAG in 3 weeks |\n\n- hook: raised $4M ([source](https://example.com/raise))\n`;
const html = buildHtml(dossier, readFileSync(join(ROOT, 'templates/dossier.html'), 'utf-8'));
ok(html.includes('<h1>NovaStack</h1>') && html.includes('4.6/5'), 'dossier header + grade rendered');
ok(html.includes('<table>') && html.includes('<a href="https://example.com/raise">'), 'tables + source links rendered');
ok(parseFrontMatter(dossier).meta.contact === 'Jane Ray' && mdToHtml('**x**').includes('<strong>'), 'front-matter + inline md helpers');

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
