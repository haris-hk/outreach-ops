# FAQ

**Does it send emails/DMs for me?** No, never, by design. It drafts; you send.
There are no sending code paths (the test suite greps for them) and mail
plugins are read-only. This is the product, not a missing feature — see
README "philosophy" and LEGAL.md.

**Why did it refuse to draft for a prospect?** Grade below your
`contact_threshold` (default 3.5). It tells you what would change the verdict
(the "nurture trigger"). Lower the threshold in `profile/preferences.yml` if
you disagree — but the filter is why replies stay high.

**Where does it get prospect data?** Free signal providers (hiring boards,
GitHub, RSS/news, Show HN, YC/a16z lists) plus optional paid enrichment
plugins you bring keys for. No LinkedIn scraping — that violates their ToS.

**What does it cost to run?** Discovery is zero-token (pure HTTP). Grading
uses your existing CLI subscription or API keys; hard caps (5 searches/grade)
keep it bounded. See RUNNING_ON_A_BUDGET.md for free/local model paths.

**Can my agency run multiple clients?** Yes — business mode:
`node engine/campaign.mjs new acme` gives each client its own ICP,
preferences, voice, sender identity, ledger, and learning loop.

**Is my data safe?** Local-first: profile and pipeline live in your files,
sent only to the LLM provider you chose. Updates can never touch the user
layer (DATA_CONTRACT.md). Plugins are consent-gated, host-allowlisted, and
tamper-checked.

**A grade seems wrong.** Weights are yours to tune (`profile/_weights.yml`),
and the weekly `review` mode proposes evidence-based adjustments from your
actual reply data. Also check the dossier — every input to the score is cited.

**How do I add a data source?** docs/ADDING_PROVIDERS.md — one file, ~150
lines, fixture-tested. PRs welcome.
