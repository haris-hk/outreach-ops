#!/usr/bin/env node

/**
 * web.test.mjs — the read-only board: data readers, dossier path-traversal
 * protection, and live endpoint round-trip on an ephemeral port.
 */

import { createServer } from 'http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let passed = 0, failed = 0;
const ok = (c, m) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.log(`  ❌ ${m}`), failed++); };

const { readLeads, readInbox, safeDossierPath, handler } = await import('../web/server.mjs');

// fixture root
const root = mkdtempSync(join(tmpdir(), 'oo-web-'));
mkdirSync(join(root, 'data', 'dossiers'), { recursive: true });
writeFileSync(join(root, 'data', 'leads.md'), `# Lead Ledger

| # | Date | Company | Contact | Role | Segment | Grade | Channel | Status | Dossier | Notes |
|---|------|---------|---------|------|---------|-------|---------|--------|---------|-------|
| 001 | 2026-07-07 | NovaStack | Jane Ray | Founder | seed-ai | 4.6/5 | email | Graded | [001](dossiers/001-nova.md) | hot |
| 002 | 2026-07-06 | Brightline | Kim Lee | Founder | seed-ai | 3.2/5 | email | Nurture | [002](dossiers/002-bright.md) | watch |
`);
writeFileSync(join(root, 'data', 'inbox.md'), `# Lead Inbox\n\n- [ ] **FreshCo** — raised $2M\n- [x] **DoneCo** — graded\n`);
writeFileSync(join(root, 'data', 'dossiers', '001-nova.md'), `---\ncompany: NovaStack\ngrade: 4.6\n---\n## Fit\n\n- strong\n`);
writeFileSync(join(root, 'data', 'outcomes.tsv'), 'ts\tlead_id\tcompany\tsegment\tchannel\tangle_tag\tvariant\tevent\n2026-07-01T09:00:00Z\t001\tNovaStack\tseed-ai\temail\ttiming\ta\tsent\n2026-07-03T09:00:00Z\t001\tNovaStack\tseed-ai\temail\ttiming\ta\treplied\n');

// readers
const leads = readLeads(root);
ok(leads.length === 2 && leads[0].company === 'NovaStack' && leads[0].grade === 4.6 && leads[0].contact === 'Jane Ray', 'readLeads: 11-col ledger parsed with grades');
const inbox = readInbox(root);
ok(inbox.length === 2 && !inbox[0].done && inbox[1].done, 'readInbox: open/done items');

// traversal protection
ok(safeDossierPath(root, '001-nova.md') !== null, 'safeDossierPath: legit path resolves');
ok(safeDossierPath(root, '../leads.md') === null, 'safeDossierPath: ../ rejected');
ok(safeDossierPath(root, '../../etc/passwd') === null, 'safeDossierPath: deep traversal rejected');
ok(safeDossierPath(root, '/etc/passwd') === null, 'safeDossierPath: absolute rejected');

// live endpoints
const srv = createServer((req, res) => handler(req, res, root));
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const get = async (p) => { const r = await fetch(`http://127.0.0.1:${port}${p}`); return { code: r.status, body: await r.json().catch(() => null) }; };

const apiLeads = await get('/api/leads');
ok(apiLeads.code === 200 && apiLeads.body.length === 2, '/api/leads serves the ledger');
const apiStats = await get('/api/stats');
ok(apiStats.code === 200 && apiStats.body.totals.replies === 1, '/api/stats computes outcome totals');
const apiDoss = await get('/api/dossier?path=001-nova.md');
ok(apiDoss.code === 200 && apiDoss.body.meta.company === 'NovaStack' && apiDoss.body.html.includes('<h2>Fit</h2>'), '/api/dossier renders md → html');
const apiEvil = await get('/api/dossier?path=../leads.md');
ok(apiEvil.code === 404, '/api/dossier blocks traversal');
const post = await fetch(`http://127.0.0.1:${port}/api/leads`, { method: 'POST' });
ok(post.status === 405, 'POST rejected — server is read-only');

srv.close();
rmSync(root, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
