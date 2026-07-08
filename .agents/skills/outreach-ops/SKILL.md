---
name: outreach-ops
description: AI prospect research, grading & outreach engine — grade leads, scan ICP signals, draft DMs/emails/call scripts (draft-only, never sends)
arguments: mode
user_invocable: true
user-invocable: true
argument-hint: "[grade | scan | discover | dossier | dm | email | call | sequence | batch | ledger | review | schedule | campaign | onboard]"
license: MIT
---

# outreach-ops — Router

Multi-CLI prospect research and outreach command center. Same routing whether
invoked as `/outreach-ops <mode>` or by natural language ("run the outreach-ops
grade mode for ...").

## Before anything

Read `AGENTS.md` (prime directives: DRAFT-ONLY, never fabricate, grade
threshold, bounded research), then `modes/_shared.md`, then user-layer
overrides in `profile/` (read LAST — they win), then the mode file.

If `node engine/doctor.mjs --json` reports `onboardingNeeded: true`, route to
`modes/onboard.md` regardless of the requested mode.

## Mode Routing

Determine the mode from `$mode`:

| Input | Mode file |
|-------|-----------|
| (empty / no args) | Show the command menu from AGENTS.md "Mode Routing" |
| Company URL, person + company, or pasted prospect info | `modes/grade.md` (default) |
| `grade {target}` | `modes/grade.md` |
| `scan [segment]` | `modes/scan.md` |
| `dossier {lead}` | `modes/dossier.md` |
| `dm {lead}` | `modes/dm.md` |
| `email {lead}` | `modes/email.md` |
| `call {lead}` | `modes/call.md` |
| `sequence {lead}` | `modes/sequence.md` |
| `batch` | `modes/batch.md` |
| `ledger [update ...]` | `modes/ledger.md` |
| `review` | `modes/review.md` |
| `schedule ...` | `modes/schedule.md` |
| `onboard` | `modes/onboard.md` |

Unknown mode → show the menu and ask.
