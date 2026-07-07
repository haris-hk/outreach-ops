# Mode: scan — ICP signal scan (lands fully in Milestone 2)

Target flow: `node engine/scan.mjs --segment {id}` → provider fan-out
(providers/ + providers/ats/ hiring signals) → trigger-match vs `profile/icp.yml`
→ dedup vs `data/scan-history.tsv` → `data/inbox.md` with a "why now" line per
lead → agent triages: summarize new signals, propose which to grade.

Until M2 wiring lands: the raw ATS scanner works against a `portals.yml`-style
watch file (see `templates/portals.example.yml`); interpret any posting found
as a hiring signal for the matching segment and offer to grade the company.
