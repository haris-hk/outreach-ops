# Legal & Responsible-Use Notes

**outreach-ops is a local, open-source tool, NOT a hosted service.** Your
profile, leads, and drafts stay on your machine and go only to the AI provider
you configured. The authors collect nothing.

## Draft-first, by design

outreach-ops **never sends anything**. No email is sent, no DM submitted, no
call placed, no form filled-and-submitted. The core has no sending code paths
(enforced by the test suite); mail plugins are read-only by manifest. You
review and send every message yourself, and you are responsible for what you
send.

## Your compliance obligations (not legal advice — consult a lawyer)

- **Email (US, CAN-SPAM):** identify yourself truthfully, include a physical
  postal address, honor opt-outs promptly, no deceptive subjects.
- **Email (EU/UK, GDPR + ePrivacy/PECR):** B2B cold email is lawful in some
  member states under legitimate interest and restricted in others — rules
  vary BY COUNTRY; B2C cold email generally requires consent. You are the
  data controller for prospect data you process; honor erasure requests.
- **Cold calls (US, TCPA + state law):** check Do-Not-Call registries; no
  auto-dialers/robocalls; time-of-day restrictions apply. Other countries
  have equivalents (e.g. UK TPS).
- **Platform ToS:** LinkedIn prohibits automation/scraping — outreach-ops
  contains none and drafts are for manual paste; keep it that way. Respect
  every platform's messaging rules. Enrichment data must come from licensed
  vendors (the plugin layer) under their terms.
- **Truthfulness:** the source-of-truth boundary exists so drafts never claim
  things you haven't evidenced. A fabricated claim in a sales pitch can be
  fraud/misrepresentation — do not weaken those rules.

## No guarantees

Grades are recommendations, not truth; models can be wrong. The authors are
not liable for outcomes: lost deals, spam-folder placement, account
restrictions, or legal consequences of your outreach. MIT license, "as is",
without warranty (see LICENSE — code copyright includes the upstream
career-ops authors).
