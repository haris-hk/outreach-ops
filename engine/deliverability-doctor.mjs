#!/usr/bin/env node

/**
 * deliverability-doctor.mjs — DNS posture check for the user's SENDING domain
 * plus volume advisories. Read-only lookups (SPF, DMARC, MX, optional DKIM
 * selector). This does not touch mail — outreach-ops never sends.
 *
 * Usage: node engine/deliverability-doctor.mjs yourdomain.com [--selector s1]
 */

import { promises as dns } from 'dns';
import { pathToFileURL } from 'url';

/** Classify record sets. Exported for tests (pure, no network). */
export function assess({ spfRecords = [], dmarcRecords = [], mxCount = 0, dkimFound = null }) {
  const checks = [];
  const spf = spfRecords.find((r) => r.startsWith('v=spf1'));
  checks.push(spf
    ? { check: 'SPF', pass: true, detail: spf.length > 255 ? 'present (warning: >255 chars)' : 'present' }
    : { check: 'SPF', pass: false, fix: 'add a TXT record starting v=spf1 authorizing your sender' });
  const dmarc = dmarcRecords.find((r) => r.startsWith('v=DMARC1'));
  const policy = dmarc?.match(/p=(none|quarantine|reject)/)?.[1];
  checks.push(dmarc
    ? { check: 'DMARC', pass: true, detail: `present (p=${policy || '?'})${policy === 'none' ? ' — consider quarantine once aligned' : ''}` }
    : { check: 'DMARC', pass: false, fix: 'add TXT at _dmarc.<domain>: v=DMARC1; p=none; rua=mailto:you@<domain>' });
  checks.push(mxCount > 0
    ? { check: 'MX', pass: true, detail: `${mxCount} record(s)` }
    : { check: 'MX', pass: false, fix: 'no MX — replies cannot reach you' });
  if (dkimFound !== null) checks.push(dkimFound
    ? { check: 'DKIM', pass: true, detail: 'selector resolves' }
    : { check: 'DKIM', pass: false, fix: 'selector not found — check your provider\'s DKIM setup' });
  return { pass: checks.every((c) => c.pass), checks };
}

export const ADVISORIES = [
  'Warm up: new domains start <10 cold sends/day, ramp ~2x weekly.',
  'Stay under ~50 cold first-touches/day/inbox even warmed — quality beats volume (and so does the grade threshold).',
  'Verified addresses only (engine/verify-contact.mjs) — bounce rate >2% burns the domain.',
  'Send from a subdomain (e.g. mail.yourdomain.com) to protect the root domain reputation.',
  'One link max, no attachments, plain text beats HTML for cold.',
];

async function main() {
  const domain = process.argv[2];
  if (!domain || domain.startsWith('--')) { console.error('usage: deliverability-doctor.mjs yourdomain.com [--selector s1]'); process.exit(1); }
  const sel = process.argv.includes('--selector') ? process.argv[process.argv.indexOf('--selector') + 1] : null;
  const txt = async (name) => { try { return (await dns.resolveTxt(name)).map((r) => r.join('')); } catch { return []; } };
  const [spfRecords, dmarcRecords, mx, dkim] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    dns.resolveMx(domain).catch(() => []),
    sel ? txt(`${sel}._domainkey.${domain}`) : Promise.resolve(null),
  ]);
  const result = assess({ spfRecords, dmarcRecords, mxCount: mx.length, dkimFound: dkim === null ? null : dkim.length > 0 });
  console.log(JSON.stringify({ domain, ...result, advisories: ADVISORIES }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
