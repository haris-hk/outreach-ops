# Mode: onboard — Conversational profile setup

Triggered when `node engine/doctor.mjs --json` → `onboardingNeeded: true`, or
by request. Do NOT grade, scan, or draft until the basics exist.

Interview conversationally — one topic at a time, not a form dump. After each
topic, write the file, show what was written, and confirm.

## Interview flow

1. **Who are you?** (→ `profile/background.md`) Individual or business? Story,
   strengths, what they're best known for. Then: **proof points** — for each
   claimed outcome ask for evidence (URL, artifact, or "conversation-attested").
   Record ONLY evidenced claims in the proof table; put the rest under "Things
   you will NOT claim" and explain why that section protects them.
2. **What are you selling / seeking?** (→ `profile/offer.yml`) Offer headline,
   deliverables, pricing band (or target role + arrangement), differentiators.
   Set `mode: individual` or `business`.
3. **Who should buy it?** (→ `profile/icp.yml`) 1–3 segments: firmographics,
   roles to reach, and — push on this — the TRIGGERS that make a lead timely
   (raised, hiring for X, launched, exec change). Named watchlist companies.
4. **How do you want to behave?** (→ `profile/preferences.yml`) Channels per
   segment, tone in their words, dm char cap, never-contact list, cadence,
   contact threshold (default 3.5 — explain the filter philosophy: fewer,
   better messages).
5. **How do you sound?** (→ `profile/voice-dna.md` + `profile/writing-samples/`)
   Ask for 2–3 real messages they've sent (paste). Derive: sentence length,
   formality, warmth, punctuation habits, words they'd never use. Write the
   voice-dna file; save samples verbatim into writing-samples/.

## Close

Run `node engine/doctor.mjs --json` — confirm `onboardingNeeded: false`. Then
offer the natural first action: "paste a company URL or a person+company and
I'll grade it" or "run a scan once your watchlist has entries".
