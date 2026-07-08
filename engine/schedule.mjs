#!/usr/bin/env node

/**
 * schedule.mjs — first-class scheduling for the heartbeat (scripts/daily-run.sh).
 * Installs the OS-native scheduler entry so nobody hand-edits crontab:
 *   macOS  → launchd user agent (~/Library/LaunchAgents/io.outreach-ops.*.plist)
 *   Linux  → crontab entry (marker-tagged for clean uninstall)
 *   Windows→ prints the schtasks command (requires Git Bash for the script)
 *
 * Usage:
 *   node engine/schedule.mjs install --time 08:00 [--days weekdays|daily|mon,wed,fri] [--segment X]
 *   node engine/schedule.mjs status
 *   node engine/schedule.mjs uninstall [--segment X]
 *   node engine/schedule.mjs run            # run the heartbeat once, now
 *   … all commands accept --dry-run (print artifacts, change nothing)
 *
 * The schedule carries no settings of its own — runs read the same
 * profile/icp.yml, preferences and plugins.yml as interactive use, so a
 * scheduled scan behaves identically to a manual one.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { homedir, platform } from 'os';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT = join(ROOT, 'scripts', 'daily-run.sh');
const MARKER = '# outreach-ops-heartbeat';
const DAY_NUM = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// ── pure helpers (exported for tests) ──────────────────────────────
export function parseTime(t) {
  const m = String(t || '').match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function parseDays(d) {
  const v = String(d || 'weekdays').toLowerCase().trim();
  if (v === 'daily' || v === 'everyday') return { cron: '*', launchd: null, label: 'daily' };
  if (v === 'weekdays') return { cron: '1-5', launchd: [1, 2, 3, 4, 5], label: 'weekdays' };
  const days = v.split(',').map((s) => s.trim().slice(0, 3)).filter((s) => s in DAY_NUM);
  if (!days.length) return null;
  const nums = [...new Set(days.map((s) => DAY_NUM[s]))].sort();
  return { cron: nums.join(','), launchd: nums, label: days.join(',') };
}

export function labelFor(segment) {
  return `io.outreach-ops.heartbeat${segment ? `.${segment.replace(/[^a-z0-9-]/gi, '-')}` : ''}`;
}

export function buildCronLine({ time, days, segment, root = ROOT }) {
  const env = segment ? `SEGMENT='${segment.replace(/'/g, '')}' ` : '';
  return `${time.minute} ${time.hour} * * ${days.cron} ${env}/bin/bash '${root}/scripts/daily-run.sh' ${MARKER}:${labelFor(segment)}`;
}

/** Remove this feature's lines (by marker+label) from a crontab body. */
export function removeCronLines(crontab, segment) {
  const tag = `${MARKER}:${labelFor(segment)}`;
  return String(crontab || '').split('\n').filter((l) => !l.includes(tag)).join('\n').replace(/\n{3,}/g, '\n\n');
}

export function buildPlist({ time, days, segment, root = ROOT }) {
  const intervals = (days.launchd || [null]).map((wd) => `    <dict>
      <key>Hour</key><integer>${time.hour}</integer>
      <key>Minute</key><integer>${time.minute}</integer>${wd === null ? '' : `
      <key>Weekday</key><integer>${wd}</integer>`}
    </dict>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${labelFor(segment)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${root}/scripts/daily-run.sh</string>
  </array>${segment ? `
  <key>EnvironmentVariables</key>
  <dict><key>SEGMENT</key><string>${segment}</string></dict>` : ''}
  <key>WorkingDirectory</key><string>${root}</string>
  <key>StartCalendarInterval</key>
  <array>
${intervals}
  </array>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
`;
}

// ── commands ────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const cmd = argv[0];
const val = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const DRY = argv.includes('--dry-run');
const OS = process.env.OUTREACH_OPS_FORCE_OS || platform(); // test override

function agentsDir() { return join(homedir(), 'Library', 'LaunchAgents'); }
function plistPath(segment) { return join(agentsDir(), `${labelFor(segment)}.plist`); }

function currentCrontab() {
  try { return execFileSync('crontab', ['-l'], { encoding: 'utf-8' }); } catch { return ''; }
}
function writeCrontab(body) {
  execFileSync('crontab', ['-'], { input: body.endsWith('\n') ? body : body + '\n' });
}

function install() {
  const time = parseTime(val('--time', '08:00'));
  const days = parseDays(val('--days', 'weekdays'));
  const segment = val('--segment');
  if (!time) { console.error('Invalid --time (use HH:MM, 24h — e.g. 08:00)'); process.exit(1); }
  if (!days) { console.error('Invalid --days (daily | weekdays | mon,wed,fri)'); process.exit(1); }
  if (!existsSync(SCRIPT)) { console.error(`heartbeat script missing: ${SCRIPT}`); process.exit(1); }

  if (OS === 'darwin') {
    const plist = buildPlist({ time, days, segment });
    const path = plistPath(segment);
    if (DRY) { console.log(`— would write ${path}:\n${plist}`); return; }
    mkdirSync(agentsDir(), { recursive: true });
    try { execFileSync('launchctl', ['unload', path], { stdio: 'ignore' }); } catch { /* not loaded */ }
    writeFileSync(path, plist);
    execFileSync('launchctl', ['load', path]);
    console.log(`✓ Scheduled via launchd: ${days.label} at ${val('--time', '08:00')}${segment ? ` (segment: ${segment})` : ''}\n  agent: ${path}\n  logs:  data/run-logs/`);
  } else if (OS === 'linux') {
    const line = buildCronLine({ time, days, segment });
    if (DRY) { console.log(`— would add crontab line:\n${line}`); return; }
    const body = removeCronLines(currentCrontab(), segment);
    writeCrontab(`${body.trim()}\n${line}`);
    console.log(`✓ Scheduled via cron: ${days.label} at ${val('--time', '08:00')}${segment ? ` (segment: ${segment})` : ''}\n  view:  crontab -l\n  logs:  data/run-logs/`);
  } else {
    console.log(`Windows: create the task manually (requires Git Bash):\n  schtasks /Create /SC DAILY /TN "${labelFor(segment)}" /ST ${val('--time', '08:00')} /TR "bash '${ROOT}/scripts/daily-run.sh'"\nThen verify with: schtasks /Query /TN "${labelFor(segment)}"`);
  }
}

function status() {
  let found = 0;
  if (OS === 'darwin') {
    const dir = agentsDir();
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      if (f.startsWith('io.outreach-ops.heartbeat')) { console.log(`launchd agent: ${join(dir, f)}`); found++; }
    }
  } else if (OS === 'linux') {
    for (const l of currentCrontab().split('\n')) if (l.includes(MARKER)) { console.log(`cron: ${l}`); found++; }
  }
  if (!found) console.log('No schedules installed. Add one: node engine/schedule.mjs install --time 08:00');
  const logDir = join(ROOT, 'data', 'run-logs');
  const logs = existsSync(logDir) ? readdirSync(logDir).filter((f) => f.endsWith('.log')).sort() : [];
  if (logs.length) {
    const last = logs[logs.length - 1];
    console.log(`\nlast run (${last}):`);
    console.log(readFileSync(join(logDir, last), 'utf-8').trim().split('\n').slice(-8).join('\n'));
  } else {
    console.log('\nNo runs logged yet (first run writes data/run-logs/).');
  }
}

function uninstall() {
  const segment = val('--segment');
  if (OS === 'darwin') {
    const path = plistPath(segment);
    if (!existsSync(path)) { console.log(`nothing installed at ${path}`); return; }
    if (DRY) { console.log(`— would unload + remove ${path}`); return; }
    try { execFileSync('launchctl', ['unload', path], { stdio: 'ignore' }); } catch { /* fine */ }
    unlinkSync(path);
    console.log(`✓ Removed ${path}`);
  } else if (OS === 'linux') {
    const before = currentCrontab();
    const after = removeCronLines(before, segment);
    if (before === after) { console.log('no matching cron entry found'); return; }
    if (DRY) { console.log('— would remove the tagged crontab line'); return; }
    writeCrontab(after);
    console.log('✓ Removed cron entry');
  } else {
    console.log(`Windows: schtasks /Delete /TN "${labelFor(segment)}" /F`);
  }
}

function runOnce() {
  execFileSync('/bin/bash', [SCRIPT], { stdio: 'inherit', env: { ...process.env, ...(val('--segment') ? { SEGMENT: val('--segment') } : {}) } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (cmd === 'install') install();
  else if (cmd === 'status') status();
  else if (cmd === 'uninstall') uninstall();
  else if (cmd === 'run') runOnce();
  else { console.error('usage: schedule.mjs install|status|uninstall|run [--time HH:MM] [--days weekdays|daily|mon,wed] [--segment X] [--dry-run]'); process.exit(1); }
}
