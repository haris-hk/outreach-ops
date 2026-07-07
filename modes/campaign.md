# Mode: campaign — Business mode, multi-campaign (fully lands in Milestone 4)

Target: `campaigns/{name}/` each with own icp.yml, preferences.yml, leads.md,
voice-dna.md and a `sender:` profile per draft. All other modes accept
`--campaign {name}` context: read that campaign's files INSTEAD of profile/
equivalents (background.md stays global unless the campaign overrides it).

Until M4: single-campaign operation via profile/ as normal.
