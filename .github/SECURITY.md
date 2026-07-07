# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately via **GitHub Security Advisories**:
https://github.com/haris-hk/outreach-ops/security/advisories/new
(or email harishussainkhan.124@gmail.com with subject `SECURITY: outreach-ops`).

Do NOT open a public issue for security reports. You'll get an acknowledgment
within 7 days. Coordinated disclosure preferred; credit given unless you
opt out.

## Scope notes

outreach-ops is a local-first tool: there is no hosted service, no server, no
telemetry. The most security-relevant surfaces are the plugin system (keyed
integrations — see the trust model in docs/PLUGINS.md: consent gating, host
allowlists, commit pinning, tamper detection) and the signal providers
(hostname-allowlisted, HTTPS-only). Reports about weakening the draft-only
invariant (any path that could auto-send) are treated as highest severity.
