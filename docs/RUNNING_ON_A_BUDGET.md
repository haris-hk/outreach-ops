# Running on a Budget

outreach-ops is engineered so the expensive part (LLM judgment) is spent only
where it matters.

## Zero-token by architecture

Scanning costs nothing: `node engine/scan.mjs` is pure HTTP against public
APIs/feeds. Dedup, cadence math, verification, pattern mining, PDFs — all
deterministic scripts. Tokens are spent ONLY on grading and drafting, and
grading is capped at 5 web searches per prospect.

## Cheap → free paths

1. **Existing subscription** (Claude Max, Copilot, etc.): batch workers run on
   flat-rate plans — `bash batch/batch-runner.sh --parallel 3` costs $0 marginal.
2. **Free tiers**: Antigravity CLI auth or Gemini API free tier both run the
   full skill. Keep `--parallel 1` under free-tier rate limits.
3. **Local models**: any CLI that speaks Ollama (e.g. OpenCode) runs grading
   fully offline. Quality note: small local models grade less reliably —
   keep the human review habit and the fixture expectations honest.

## Enrichment credits (the real money)

Paid enrichment is LAZY and last: free signals → cache → paid plugins, only
for leads already past firmographic filters (engine/enrich.mjs enforces the
order). Verification verdicts are cached so each address is paid for once.
Practical budget: enrich only priority + standard leads, never inbox raws.

## Volume discipline is also cost discipline

The grade threshold means you draft for the few — which keeps token spend,
enrichment credits, and sender reputation all in the same healthy place.
