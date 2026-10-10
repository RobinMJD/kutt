# Canonical Local-Time Link Editing

Last updated: 2026-10-10. `3.2.6-sr94.69` is live and healthy under an explicitly
authorized one-off manual deployment. Pre/post NAS recovery and live acceptance
passed. This release includes `.68` country labels. See the
[exact manual deployment receipt](MANUAL-DEPLOYMENT-2026-10-09.md).

## Changes

| Item | Status |
| --- | --- |
| Remove personal/admin relative-duration fields and previous-expiry checkbox | Implemented |
| Align Paused checkbox horizontally with its label | Implemented |
| Reuse accessible calendar/time picker with local `yyyy-MM-dd HH:mm:ss` results | Implemented |
| Preserve earliest legacy/absolute deadline in transactional migration | Passed populated SQLite, PostgreSQL 17 and MySQL 8.4 tests, including multi-batch conversion and rollback |
| Keep legacy API, owner boundaries and protected admin editing | Implemented; focused regression passed |
| Signed atomic stale-policy refusal, retained drafts and current saved values | Passed; an old editor opened before migration cannot clear the migrated deadline |
| EN/FR/ES, light/dark, desktop/390/320px, local zones and DST checks | 18-layout final run passed; UTC creation's separate 18-layout regression and 198 localized page layouts also passed |
| Final full application and database regressions | Full application rerun passed on the final compatibility guard; PostgreSQL/MySQL suites passed |
| Source commit and push | Initial implementation pushed (`5d33607`); final compatibility guard and this closeout are committed together |
| Versioned release and required GitHub CI | Source/tag pushed; remote CI and GHCR publication remain blocked. Operator explicitly authorized only this manual deployment |
| Recoverable pre/post backup, deployment and public/authenticated acceptance | Pre/post encrypted local/NAS restores and writable checks passed (`a9cc2637` / `e8eb34d5`); actual-data migration and recovery preflight passed; 39 public regression checks, live browser acceptance and four strict monitoring samples passed; no rollback performed |

## Choices And Recovery

Only personal/admin editing switches to local time. Explicitly UTC creation
and workspace controls remain unchanged, and API timestamps still require a
timezone. Stored instants stay UTC; seconds display does not truncate an
unchanged timestamp's milliseconds. Empty End plus Save clears both deadlines.
Description updates never reapply an expiry duration. A conflicting save shows
current saved settings and retains drafts; changing visit counts is not a conflict.
Pre-migration HTML editors also require their signed legacy expiry snapshot for
every availability save; if migration changed that expiry, the old draft is
refused atomically rather than silently erasing the migrated End. JSON API
clients keep their existing semantics.

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

## Publication Blocker

On 2026-10-09, a manual dispatch of `fork-release.yaml` returned HTTP 422:
`Actions has been disabled for this repository.` The repository permissions API
still reports Actions enabled and the workflow reports `active`. The cause of
that contradiction is not established; billing or account restrictions are not
assumed. Required release checks have not run, so no `.69` image publication,
live migration, verified deployment backup or authenticated live acceptance is
claimed by that original blocked attempt. The operator subsequently authorized
manual deployment for this occurrence. Exact native-image tests, migration,
recovery and live checks remain mandatory; the new receipt records them.
Resolve Actions before the next normal release. This exception does not weaken
WAF/SSO or turn blocked remote CI into a successful result.

## Local Evidence And Live Boundary

The final full application regression passed with image
`sha256:5c80fc06473e45127d10a69d164adeb01f04138ae928982011d691a3b7657b1e`.
Its isolated fixtures include the pre-migration-tab conflict, API compatibility,
ordinary-user/admin isolation, analytics, reset counters, redirects, migrations
and identity/write-boundary regressions. The final browser matrix passed 18
local-time workflows; separate UTC creation and localized-page regressions
passed 18 and 198 layouts respectively. Migration tests passed on populated
SQLite, PostgreSQL 17 and MySQL 8.4. These are local/disposable-fixture results,
not live acceptance or required GitHub CI.

A read-only live check on 2026-10-09 confirmed `.67.2` running and healthy,
zero container restarts and an HTTP 302 response from the public HTTPS root.
No live database, configuration or deployment source was changed for `.69`
during that earlier read-only check. The later manual cutover is recorded
separately and preserves canonical original records and secret-file hashes.

A separate [live service validation](SERVICE-VALIDATION-2026-10-09.md) passed
39 smoke checks on `.67.2` and preserved original records. It identified and
repaired a shared monitoring DNS-path issue without deploying `.69`, restarting
Kutt/DNS, or weakening filtering, WAF or SSO. Its local restore evidence is not
a verified deployment backup for the pending candidate.
