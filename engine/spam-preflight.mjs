#!/usr/bin/env node

/**
 * spam-preflight.mjs — deterministic draft linter. Gates Drafted→Queued
 * together with verify-contact. Checks: spam-trigger vocabulary, link count,
 * length bounds, caps/exclamation abuse, personalization presence.
 *
 * Usage:
 *   node engine/spam-preflight.mjs --file draft.md [--subject "..."] [--company NovaStack] [--contact Jane]
 *   echo "body" | node engine/spam-preflight.mjs --stdin --company X
 * Exit: 0 pass · 1 fail (JSON verdict on stdout either way).
 */

import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

const SPAM_VOCAB = [
  'act now', 'limited time', 'exclusive deal', 'once in a lifetime', 'risk-free',
  'guarantee', 'guaranteed', 'no obligation', '100% free', 'winner', 'congratulations',
  'click here', 'click below', 'buy now', 'order now', 'special promotion',
  'this is not spam', 'unsubscribe', 'earn money', 'make money fast', 'double your',
  'amazing opportunity', 'dear friend', 'dear sir', 'to whom it may concern',
];
const SLOP_VOCAB = [
  "i'm passionate about", 'i hope this finds you well', 'quick question',
  'just following up', 'touching base', 'circling back', 'synergies',
  'i came across your profile', 'hope you are doing well',
];

/** Lint a draft. Exported for tests. Returns {pass, score, issues[]}. */
export function lint({ body, subject = '', company = '', contact = '' }) {
  const issues = [];
  const text = String(body || '');
  const lower = `${subject}\n${text}`.toLowerCase();

  for (const w of SPAM_VOCAB) if (lower.includes(w)) issues.push({ severity: 'fail', rule: 'spam_vocab', detail: `"${w}"` });
  for (const w of SLOP_VOCAB) if (lower.includes(w)) issues.push({ severity: 'fail', rule: 'slop_vocab', detail: `"${w}"` });

  const links = (text.match(/https?:\/\//g) || []).length;
  if (links > 1) issues.push({ severity: 'fail', rule: 'link_count', detail: `${links} links (max 1 in a cold first touch)` });

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words > 180) issues.push({ severity: 'fail', rule: 'length', detail: `${words} words (cold email should be < 180)` });
  if (words < 25) issues.push({ severity: 'warn', rule: 'length', detail: `${words} words — unusually short for email (fine for a DM)` });

  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !['CEO', 'CTO', 'API', 'LLM', 'RAG', 'SDK', 'AI', 'ML', 'SRE', 'B2B'].includes(w));
  if (capsWords.length) issues.push({ severity: 'fail', rule: 'all_caps', detail: capsWords.slice(0, 3).join(', ') });

  const bangs = (text.match(/!/g) || []).length;
  if (bangs > 1) issues.push({ severity: 'fail', rule: 'exclamations', detail: `${bangs} exclamation marks` });

  if (subject) {
    if (subject.split(/\s+/).length > 8) issues.push({ severity: 'warn', rule: 'subject_length', detail: 'subject > 8 words' });
    if (/re:|fwd:/i.test(subject)) issues.push({ severity: 'fail', rule: 'fake_thread', detail: 'fake Re:/Fwd: subject' });
    if (/[!$]|free\b/i.test(subject)) issues.push({ severity: 'fail', rule: 'subject_spam', detail: 'spammy subject characters' });
  }

  // personalization: company or contact name must appear in the first 2 sentences
  const head = text.split(/(?<=[.?!])\s/).slice(0, 2).join(' ').toLowerCase();
  const personalized = (company && head.includes(company.toLowerCase())) || (contact && head.includes(String(contact).split(/\s+/)[0].toLowerCase()));
  if ((company || contact) && !personalized) issues.push({ severity: 'fail', rule: 'personalization', detail: 'neither company nor contact name in the first two sentences — lead with the hook' });

  const fails = issues.filter((i) => i.severity === 'fail');
  return { pass: fails.length === 0, fails: fails.length, warnings: issues.length - fails.length, issues };
}

function main() {
  const argv = process.argv.slice(2);
  const val = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : undefined; };
  let body = '';
  if (argv.includes('--stdin')) body = readFileSync(0, 'utf-8');
  else if (val('--file')) body = readFileSync(val('--file'), 'utf-8');
  else { console.error('usage: spam-preflight.mjs --file draft.md | --stdin [--subject S] [--company C] [--contact N]'); process.exit(1); }
  const verdict = lint({ body, subject: val('--subject') || '', company: val('--company') || '', contact: val('--contact') || '' });
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(verdict.pass ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
