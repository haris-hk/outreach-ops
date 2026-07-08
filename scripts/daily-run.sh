#!/usr/bin/env bash
# daily-run.sh — the scheduled heartbeat: scan + discover + reply check +
# due-follow-ups, all zero-interaction, all logged. Settings come from the
# same files interactive runs use (profile/icp.yml, preferences, plugins.yml)
# so a scheduled run behaves identically to a manual one.
#
#   bash scripts/daily-run.sh                 # all segments
#   SEGMENT=seed-ai-startups bash scripts/daily-run.sh
#
# Steps tolerate absence (no plugins enabled, no active sequences) so one
# missing piece never kills the run — check the log for the story.
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LOG_DIR="data/run-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d).log"

{
  echo "══ outreach-ops scheduled run $(date '+%Y-%m-%d %H:%M') ══"

  echo "── signal scan ──"
  node engine/scan.mjs ${SEGMENT:+--segment "$SEGMENT"} || echo "(scan skipped: $?)"

  echo "── discovery (search-hook plugins) ──"
  node engine/discover.mjs ${SEGMENT:+--segment "$SEGMENT"} || echo "(discover skipped: exit $? — fine without enabled search plugins)"

  echo "── reply detection ──"
  node engine/check-replies.mjs || echo "(replies skipped: $?)"

  echo "── follow-ups due ──"
  node engine/cadence.mjs 2>/dev/null | head -40 || echo "(no active leads yet)"

  echo "══ done $(date '+%H:%M') — inbox: data/inbox.md ══"
} >> "$LOG" 2>&1

# keep the last 30 logs
ls -1t "$LOG_DIR"/*.log 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
