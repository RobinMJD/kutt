# Canonical Local-Time Link Editing

Last updated: 2026-10-09. Candidate `3.2.6-sr94.69`; **not deployed**.
Accepted live release remains `.67.2`. This candidate includes `.68` country labels.

## Changes

| Item | Status |
| --- | --- |
| Remove personal/admin relative-duration fields and previous-expiry checkbox | Implemented |
| Align Paused checkbox horizontally with its label | Implemented |
| Reuse accessible calendar/time picker with local `yyyy-MM-dd HH:mm:ss` results | Implemented |
| Preserve earliest legacy/absolute deadline in transactional migration | Passed populated SQLite, PostgreSQL 17 and MySQL 8.4 tests, including multi-batch conversion and rollback |
| Keep legacy API, owner boundaries and protected admin editing | Implemented; focused regression passed |
| Signed atomic stale-policy refusal, retained drafts and current saved values | Implemented; focused regression passed |
| EN/FR/ES, light/dark, desktop/390/320px, local zones and DST checks | 18-layout final run passed; UTC creation's separate 18-layout regression and 198 localized page layouts also passed |
| Final full application and database regressions | Full application rerun in progress; PostgreSQL/MySQL suites passed |
| Commit, push, versioned tag and required GitHub CI | Pending |
| Recoverable pre/post backup, deployment and public/authenticated acceptance | Pending; required publication checks remain gated |

## Choices And Recovery

Only personal/admin editing switches to local time. Explicitly UTC creation
and workspace controls remain unchanged, and API timestamps still require a
timezone. Stored instants stay UTC; seconds display does not truncate an
unchanged timestamp's milliseconds. Empty End plus Save clears both deadlines.
Description updates never reapply an expiry duration. A conflicting save shows
current saved settings and retains drafts; changing visit counts is not a conflict.

The migration retains `min(legacy expiry, ends_at)`, clears only the legacy
field, and does not touch users, targets, identities, secrets or analytics.
Invalid timestamps fail transactionally. Its down migration keeps canonical
deadlines: older lifecycle-capable images already enforce them. Use the
[recoverable upgrade procedure](DEPLOYMENT.md) and compare effective deadlines
after restoring/migrating a copy before touching the live database.

The new admin endpoint uses existing fresh session authorization and transaction
revalidation. The owner endpoint deliberately stays owner-only, even for admins.
WAF, SSO, CSP, public redirects and domain/token checks are not weakened.

Browser plugin not available; bundled Playwright/Chromium is used. Native
Safari/Firefox and physical phone acceptance are not claimed. Evidence stays
outside Git; this public ledger contains no credentials or user records.
