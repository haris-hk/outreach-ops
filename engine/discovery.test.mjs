#!/usr/bin/env node

/**
 * discovery.test.mjs — the discovery gap-closers, no live HTTP:
 * pure mappers on canned API payloads (apollo, google-places,
 * companies-house, opencorporates), detect contracts, plugin-engine
 * integration (manifests validate, provider-hook plugins gate correctly,
 * enrich fan-out sees apollo), and scan-with-plugin-provider wiring.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
let passed = 0, failed = 0;
const ok = (c, m) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.log(`  ❌ ${m}`), failed++); };

// ── apollo mappers ──────────────────────────────────────────────────
const { mapPerson, mapOrg } = await import('../plugins/apollo/index.mjs');
const person = mapPerson({ first_name: 'Jane', last_name: 'Ray', title: 'Co-Founder & CEO', email: 'jane@novastack.io', linkedin_url: 'https://linkedin.com/in/janeray' });
ok(person.contact_name === 'Jane Ray' && person.contact_email === 'jane@novastack.io' && /Co-Founder/.test(person.contact_hint), 'apollo: person maps with real email');
const locked = mapPerson({ name: 'Sam Poe', title: 'CTO', email: 'email_not_unlocked@domain.com' });
ok(locked.contact_name === 'Sam Poe' && locked.contact_email === undefined, 'apollo: locked email is NOT passed through');
ok(mapPerson({}) === null && mapPerson(null) === null, 'apollo: empty person → null');
const org = mapOrg({ estimated_num_employees: 12, industry: 'fintech', founded_year: 2024, latest_funding_round_date: '2026-06-15', website_url: 'https://novastack.io' });
ok(org.company_size === 12 && org.latest_funding_date === '2026-06-15' && org.company_url === 'https://novastack.io', 'apollo: org firmographics map');

// ── google-places mapper ────────────────────────────────────────────
const { placeToSignal } = await import('../plugins/google-places/index.mjs');
const place = placeToSignal({ displayName: { text: 'Bright Smile Dental' }, websiteUri: 'https://brightsmile.example', formattedAddress: '12 High St, Leeds', rating: 4.6, userRatingCount: 120, googleMapsUri: 'https://maps.google.com/?cid=1', businessStatus: 'OPERATIONAL' });
ok(place && place.company === 'Bright Smile Dental' && place.signal_type === 'listing' && /★4.6/.test(place.detail), 'google-places: operational business maps');
ok(placeToSignal({ displayName: { text: 'Closed Co' }, businessStatus: 'CLOSED_PERMANENTLY', googleMapsUri: 'https://maps.google.com/?cid=2' }) === null, 'google-places: closed business dropped');
ok(placeToSignal({ displayName: { text: 'Low Rated' }, rating: 3.1, googleMapsUri: 'https://maps.google.com/?cid=3' }, { min_rating: 4.0 }) === null, 'google-places: min_rating filter');
ok(placeToSignal({ displayName: { text: 'No URL Co' } }) === null, 'google-places: no https URL → dropped, not guessed');

// ── companies-house mapper ──────────────────────────────────────────
const { chCompanyToSignal } = await import('../plugins/companies-house/index.mjs');
const ch = chCompanyToSignal({ company_name: 'NORTHERN SOLAR LTD', company_number: '12345678', company_status: 'active', date_of_creation: '2026-06-20', sic_codes: ['43220'], registered_office_address: { locality: 'Manchester' } });
ok(ch && ch.company === 'NORTHERN SOLAR LTD' && /newly incorporated/.test(ch.headline) && ch.source_url.endsWith('/company/12345678') && /Manchester/.test(ch.detail), 'companies-house: fresh incorporation maps');
ok(chCompanyToSignal({ company_name: 'DEAD LTD', company_number: '1', company_status: 'dissolved' }) === null, 'companies-house: non-active dropped');
ok(chCompanyToSignal({ company_name: 'NO NUM LTD' }) === null, 'companies-house: missing number → null');

// ── opencorporates mapper ───────────────────────────────────────────
const { ocToSignal } = await import('../providers/opencorporates.mjs');
const oc = ocToSignal({ company: { name: 'Kalt Kaffee GmbH', jurisdiction_code: 'de', incorporation_date: '2026-06-01', company_type: 'GmbH', opencorporates_url: 'https://opencorporates.com/companies/de/HRB1', inactive: false } });
ok(oc && oc.company === 'Kalt Kaffee GmbH' && /\(DE\)/.test(oc.headline) && oc.signal_type === 'listing', 'opencorporates: registry result maps');
ok(ocToSignal({ company: { name: 'Old Co', incorporation_date: '2019-01-01', opencorporates_url: 'https://opencorporates.com/companies/gb/1' } }, Date.now() - 90 * 864e5) === null, 'opencorporates: days recency filter drops old');
ok(ocToSignal({ company: { name: 'Gone Co', inactive: true, opencorporates_url: 'https://opencorporates.com/companies/gb/2' } }) === null, 'opencorporates: inactive dropped');

// ── detect contracts ────────────────────────────────────────────────
const ocProvider = (await import('../providers/opencorporates.mjs')).default;
ok(ocProvider.detect({ provider: 'opencorporates', query: 'solar' }) !== null && ocProvider.detect({ provider: 'opencorporates' }) === null, 'opencorporates: detect requires a query');
const gp = (await import('../plugins/google-places/index.mjs')).default;
const chP = (await import('../plugins/companies-house/index.mjs')).default;
ok(gp.provider.detect() === null && chP.provider.detect() === null, 'keyed provider plugins never auto-detect');

// ── plugin engine integration ───────────────────────────────────────
const { discoverPlugins, pluginRoots, pluginStatus, mergeProviderPlugins } = await import('../plugins/_engine.mjs');
const manifests = discoverPlugins(pluginRoots(ROOT));
const ids = manifests.map((m) => m.id);
ok(['apollo', 'google-places', 'companies-house'].every((id) => ids.includes(id)), `all three new manifests validate (found: ${ids.join(', ')})`);
ok(manifests.find((m) => m.id === 'apollo').hooks.includes('enrich'), 'apollo participates in the enrich fan-out');
const gated = pluginStatus(manifests.find((m) => m.id === 'google-places'), {});
ok(gated.enabled === false, 'google-places gated off without consent+key');

// scan.mjs merge wiring: with no config/plugins.yml at a temp root, core map untouched
const tmp = mkdtempSync(join(tmpdir(), 'oo-disc-'));
const map = new Map([['core', { id: 'core', fetch: async () => [] }]]);
await mergeProviderPlugins(map, { root: tmp });
ok(map.size === 1, 'mergeProviderPlugins inert without plugins.yml (fail-open)');
ok(readFileSync(join(ROOT, 'engine/scan.mjs'), 'utf-8').includes('mergeProviderPlugins(providers'), 'signal scan merges provider-hook plugins');

// enrich fan-out end-to-end (no keys): apollo discovered but skipped, clean note
const enrichOut = JSON.parse(execFileSync(NODE, [join(ROOT, 'engine/enrich.mjs'), '--company', 'DiscTestCo', '--refresh'], { encoding: 'utf-8', cwd: ROOT }));
ok(enrichOut.plugins_used.length === 0 && /no enrichment plugins enabled/.test(enrichOut.note || ''), 'enrich fan-out: gated plugins no-op cleanly');
if (existsSync(join(ROOT, 'data/enrich-cache/disctestco.json'))) rmSync(join(ROOT, 'data/enrich-cache/disctestco.json'));

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
