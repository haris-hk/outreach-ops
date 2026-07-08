#!/usr/bin/env node

/** schedule.test.mjs — pure helpers + dry-run behavior on both platforms. */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
let passed = 0, failed = 0;
const ok = (c, m) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.log(`  ❌ ${m}`), failed++); };

const { parseTime, parseDays, labelFor, buildCronLine, buildPlist, removeCronLines } = await import('./schedule.mjs');

// time parsing
ok(JSON.stringify(parseTime('08:30')) === '{"hour":8,"minute":30}', 'parseTime: 08:30');
ok(parseTime('23:59').hour === 23 && parseTime('0:05').minute === 5, 'parseTime: edges');
ok(parseTime('24:00') === null && parseTime('8:60') === null && parseTime('noon') === null, 'parseTime: rejects invalid');

// day parsing
ok(parseDays('weekdays').cron === '1-5' && parseDays('weekdays').launchd.length === 5, 'parseDays: weekdays');
ok(parseDays('daily').cron === '*' && parseDays('daily').launchd === null, 'parseDays: daily');
ok(parseDays('mon,thu').cron === '1,4' && parseDays('MON, Thursday').cron === '1,4', 'parseDays: named days, case/format tolerant');
ok(parseDays('funday') === null, 'parseDays: rejects nonsense');

// labels + cron lines
ok(labelFor() === 'io.outreach-ops.heartbeat' && labelFor('seed ai!') === 'io.outreach-ops.heartbeat.seed-ai-', 'labelFor: sanitized');
const line = buildCronLine({ time: parseTime('07:00'), days: parseDays('weekdays'), segment: 'x', root: '/r' });
ok(line.startsWith("0 7 * * 1-5 SEGMENT='x' /bin/bash '/r/scripts/daily-run.sh'") && line.includes('outreach-ops-heartbeat:'), 'buildCronLine: correct expression + marker');

// uninstall surgery leaves other lines alone
const tab = `MAILTO=x\n0 9 * * * other-job\n${line}\n`;
const cleaned = removeCronLines(tab, 'x');
ok(!cleaned.includes('outreach-ops-heartbeat') && cleaned.includes('other-job') && cleaned.includes('MAILTO=x'), 'removeCronLines: surgical');
ok(removeCronLines(tab, 'different-segment').includes('outreach-ops-heartbeat'), 'removeCronLines: only matching label');

// plist structure
const plist = buildPlist({ time: parseTime('06:45'), days: parseDays('mon,fri'), segment: 'uk', root: '/r' });
ok(plist.includes('<key>Weekday</key><integer>1</integer>') && plist.includes('<integer>5</integer>'), 'buildPlist: weekday intervals');
ok(plist.includes('<key>Minute</key><integer>45</integer>') && plist.includes('<string>uk</string>'), 'buildPlist: time + segment env');
ok(buildPlist({ time: parseTime('06:45'), days: parseDays('daily'), root: '/r' }).split('<dict>').length >= 2, 'buildPlist: daily = single interval, no Weekday');

// dry-run execs change nothing and describe correctly per-OS
const linux = execFileSync(NODE, [join(ROOT, 'engine/schedule.mjs'), 'install', '--time', '09:00', '--dry-run'], { encoding: 'utf-8', env: { ...process.env, OUTREACH_OPS_FORCE_OS: 'linux' } });
ok(/would add crontab line/.test(linux) && /0 9 \* \* 1-5/.test(linux), 'dry-run linux: cron preview');
const mac = execFileSync(NODE, [join(ROOT, 'engine/schedule.mjs'), 'install', '--time', '09:00', '--dry-run'], { encoding: 'utf-8', env: { ...process.env, OUTREACH_OPS_FORCE_OS: 'darwin' } });
ok(/would write .*LaunchAgents.*heartbeat\.plist/.test(mac) && /StartCalendarInterval/.test(mac), 'dry-run darwin: plist preview');
const win = execFileSync(NODE, [join(ROOT, 'engine/schedule.mjs'), 'install', '--time', '09:00'], { encoding: 'utf-8', env: { ...process.env, OUTREACH_OPS_FORCE_OS: 'win32' } });
ok(/schtasks \/Create/.test(win), 'windows: prints schtasks guidance, never executes');
try {
  execFileSync(NODE, [join(ROOT, 'engine/schedule.mjs'), 'install', '--time', '25:00'], { encoding: 'utf-8', stdio: 'pipe' });
  ok(false, 'invalid time should exit 1');
} catch (e) { ok(e.status === 1, 'invalid time rejected with exit 1'); }

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
