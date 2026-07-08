# Mode: schedule — "scan every morning" as a sentence

When the user asks for recurring runs ("scan every weekday at 8", "check for
replies daily", "watch the UK segment on Mondays"), install the OS-native
schedule for the heartbeat — never hand them raw crontab instructions.

## What the heartbeat does

`scripts/daily-run.sh` = signal scan → plugin discovery → read-only reply
check → due-follow-ups summary, all logged to `data/run-logs/`, all reading
the SAME profile/icp/preferences/plugins settings as interactive runs. It
finds and triages; it never grades in bulk and never sends — those stay
human-initiated.

## Steps

1. Parse their intent into flags: time (24h HH:MM — confirm am/pm ambiguity
   and note times run in the MACHINE's local timezone), days
   (`daily` | `weekdays` | `mon,wed,fri`), optional `--segment`.
2. Preview first when anything is ambiguous:
   `node engine/schedule.mjs install --time 08:00 --days weekdays --dry-run`
3. Install: same command without `--dry-run`. macOS → launchd user agent;
   Linux → tagged crontab entry; Windows → print the schtasks command for
   them to run (needs Git Bash).
4. Confirm with `node engine/schedule.mjs status` (shows installed schedules
   + the tail of the last run log).
5. Tell them the morning ritual: new leads appear in `data/inbox.md` with a
   "why now" each — say "triage the inbox" here to grade the keepers.

## Managing

- Multiple segments = multiple installs (one schedule each, distinct labels).
- `node engine/schedule.mjs uninstall [--segment X]` removes cleanly (only
  our tagged entries — never touch other cron lines).
- `node engine/schedule.mjs run` = run the heartbeat once, right now.
- Laptop asleep at fire time? launchd runs the job on wake (macOS); plain
  cron does NOT — mention this to Linux laptop users and suggest anacron or
  a time when the machine is reliably awake.
