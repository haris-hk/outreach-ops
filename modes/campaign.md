# Mode: campaign — Business mode, multi-campaign

One engine, N client campaigns. Each `campaigns/{name}/` carries its own
icp.yml, preferences.yml, voice-dna.md, sender.yml and data (ledger, inbox,
outcomes, dossiers). `profile/background.md` + `offer.yml` stay global unless
the campaign adds its own copies (campaign files always win).

## Commands

- `node engine/campaign.mjs new {name}` — scaffold (seeds from the user's
  profile where present, templates otherwise).
- `node engine/campaign.mjs list` · `node engine/campaign.mjs env {name}` —
  the env overrides that point every engine script at the campaign's data.

## Agent rules when a campaign is active

1. The user names the campaign ("for acme-client: …") or asks to switch;
   confirm which campaign is active when ambiguous. State it in every
   grading/drafting response header.
2. Read order becomes: AGENTS.md → _shared.md → campaign icp/preferences/
   voice-dna/sender (INSTEAD of profile equivalents) → mode file.
3. **Drafts speak as the campaign sender** (`sender.yml`), not the operator.
   Proof points still come only from background/offer in scope — never invent
   client case studies.
4. All engine calls use the campaign env overrides (`campaign.mjs env`);
   ledger integrity runs campaign-scoped after merges.
5. Outcomes/patterns/review run per campaign — never mix campaigns' learning
   loops (different ICPs poison each other's stats).
6. `never_contact` lists are unioned: global + campaign (most restrictive wins).
