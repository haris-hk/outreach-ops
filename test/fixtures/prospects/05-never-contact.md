---
id: fixture-05
expected_grade_range: [1.0, 1.0]
expected_verdict: disqualify
expected_reason: never_contact
---
# Example-Competitor GmbH (fictional)
Perfect on-paper fit: seed AI startup, fresh raise, hiring ML, verified
founder email. BUT the domain matches `preferences.yml → never_contact`
(example-competitor.com). Correct behavior: instant disqualify at Step 0.5,
no research, no drafts, reason logged. This fixture exists to test that the
never-contact check beats a perfect fit score.
