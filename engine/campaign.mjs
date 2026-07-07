#!/usr/bin/env node

/**
 * campaign.mjs — business-mode campaign scaffolding + env helper.
 *
 * Each campaign is a self-contained context: its own icp, preferences,
 * voice-dna, ledger, inbox, history, outcomes, dossiers. The global
 * profile/background.md + offer.yml stay shared unless the campaign
 * overrides them with its own copies.
 *
 * Usage:
 *   node engine/campaign.mjs new acme-client        # scaffold campaigns/acme-client/
 *   node engine/campaign.mjs list
 *   node engine/campaign.mjs env acme-client        # print the env overrides to run engine scripts campaign-scoped
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, 'campaigns');
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const cmd = process.argv[2];
const name = process.argv[3];

if (cmd === 'new') {
  if (!name || !NAME_RE.test(name)) { console.error('usage: campaign.mjs new <kebab-case-name>'); process.exit(1); }
  const base = join(DIR, name);
  if (existsSync(base)) { console.error(`campaign "${name}" already exists`); process.exit(1); }
  mkdirSync(join(base, 'data', 'dossiers'), { recursive: true });
  const seed = (target, template) => {
    const t = join(ROOT, 'templates', 'profile', template);
    const userCopy = join(ROOT, 'profile', template.replace('.example', ''));
    copyFileSync(existsSync(userCopy) ? userCopy : t, join(base, target));
  };
  seed('icp.yml', 'icp.example.yml');
  seed('preferences.yml', 'preferences.example.yml');
  if (existsSync(join(ROOT, 'profile', 'voice-dna.md'))) copyFileSync(join(ROOT, 'profile', 'voice-dna.md'), join(base, 'voice-dna.md'));
  writeFileSync(join(base, 'sender.yml'), `# Whose name goes on this campaign's outreach\nsender:\n  name: ""\n  role: ""\n  email: ""\n  # signature lines, calendly, etc.\n`);
  writeFileSync(join(base, 'data', 'leads.md'), `# Lead Ledger — campaign: ${name}\n\n| # | Date | Company | Contact | Role | Segment | Grade | Channel | Status | Dossier | Notes |\n|---|------|---------|---------|------|---------|-------|---------|--------|---------|-------|\n`);
  console.log(JSON.stringify({ created: name, next: `edit campaigns/${name}/{icp,preferences,sender}.yml, then run modes with: node engine/campaign.mjs env ${name}` }, null, 2));
} else if (cmd === 'list') {
  const list = existsSync(DIR) ? readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  console.log(JSON.stringify({ campaigns: list }, null, 2));
} else if (cmd === 'env') {
  if (!name || !existsSync(join(DIR, name))) { console.error('unknown campaign'); process.exit(1); }
  const b = `campaigns/${name}`;
  console.log([
    `OUTREACH_OPS_TRACKER=${b}/data/leads.md`,
    `OUTREACH_OPS_REPORTS=${b}/data/dossiers`,
    `OUTREACH_OPS_OUTCOMES=${b}/data/outcomes.tsv`,
    `# scan: node engine/scan.mjs --icp ${b}/icp.yml --inbox ${b}/data/inbox.md --history ${b}/data/scan-history.tsv`,
  ].join('\n'));
} else {
  console.error('usage: campaign.mjs new|list|env <name>');
  process.exit(1);
}
