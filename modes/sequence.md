# Mode: sequence — Multi-touch plan (fully lands in Milestone 3)

Target: plan max_touches per `preferences.yml → cadence` with channel rotation
(e.g. email → bump → DM), dates from `node engine/followup-cadence.mjs`,
reply-aware: any Replied status cancels pending touches. Each touch must add
ONE new element (hook/proof/deadline) — never "just following up".

Until M3: draft touch 1 via email/dm modes, compute the bump date with
`node engine/followup-cadence.mjs`, and record next action in the ledger row.
