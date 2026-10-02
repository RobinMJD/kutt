# Kutt Advanced Security Audit (2 October 2026)

**Status:** In progress
**Last updated:** 2026-10-02 09:56 CEST
**Source baseline:** `55d1d1ad0d3789909a8a9c0d8584beddb2503c2c` (`main`, clean before this ledger)
**Live baseline:** `local/kutt:3.2.6-sr94.65`, image `sha256:2c13ec0b963dade59dec6e8bfaa0f54339d21e4a5c9cb864697e0cc12bab9c09`, healthy, zero restarts at intake
**Private deployment evidence:** `/srv/homelab/security-reports/` on Debian3

This file tracks the audit as it runs. A finding is not fixed merely because a
source patch exists: tests, protected public routes, backup/restore and the
deployed image must be checked separately. Existing links, users, secrets,
public redirects, WAF and Authentik protections must remain intact.

## Progress

| Phase | Status | Evidence / next action |
| --- | --- | --- |
| Scope and baseline | Complete | Confirmed clean Kutt fork, live `.65` health, NAS mount and pre-existing dirty homelab checkout. |
| Independent deep source audit | Blocked | The plugin refused to start a read-only worker because this parent has no managed filesystem permission profile. No scan artifact or result exists; do not infer clean coverage. |
| Direct source and dependency review | In progress | Core auth, tokens, redirect, proxy, outbound HTTP, SQL query construction and CSP paths reviewed. Both production and full npm audits report zero known advisories against the candidate lockfile; documentation build passed. Continue final route and release diff review. |
| Live deployment and edge audit | In progress | Container isolation and public/management route boundary checked; continue TLS, identity-provider, backups, secret/data permissions, monitoring and negative cases. |
| Finding validation and prioritization | In progress | Package advisories reproduced against the baseline lockfile; source-level proxy default risk distinguished from live deployment guard. Continue reviewing first-run and remaining authorization paths. |
| Remediation | In progress | Patched Nodemailer, ip-address and development transitive lockfile; changed proxy and rate-limit defaults to secure values with config test and docs. No live change yet. |
| Candidate verification | In progress | Both npm audits, documentation build and the full isolated exact-image regression passed. Concurrent bootstrap passes on SQLite, MySQL and PostgreSQL. Grype has zero Critical/High and three non-fixable Medium matches for one BusyBox advisory. Versioned `.66` image, release CI and live negative checks remain. |
| Backup and deployment | In progress | Fresh Kutt SQLite online recovery snapshot, local Restic snapshot `0b629a89`, NAS copy `340715fe`, NAS restore (75 files) and candidate-image writable recovery passed. Live service is unchanged; cutover/post-backup remain pending. |
| Final report and source alignment | Pending | Reconcile findings, source/tag/image/live versions, CI and remaining risks; keep unrelated homelab changes untouched. |

## Findings

| ID | Severity | Status | Evidence and remediation |
| --- | --- | --- | --- |
| KUTT-SEC-001 | High package advisory; lower current live reachability | Fix in progress | Baseline `nodemailer@9.1.1` is vulnerable. Candidate uses `10.0.13`; candidate production and full npm audits report zero. Live `MAIL_ENABLED=false`; mail composition test and deployment remain. |
| KUTT-SEC-002 | Moderate package advisories | Fix in progress | Baseline `ip-address@10.3.1` through `geoip-lite` is vulnerable. Candidate override `10.7.1` audits clean; geography and deployment tests remain. |
| KUTT-SEC-003 | Moderate deployment footgun | Fix in progress | Candidate changes `TRUST_PROXY` default from `true` to `false`; live Compose explicitly enables it behind a BunkerWeb guard that strips external forwarding headers. Config test added. Isolated/full tests and live version reconciliation remain. |
| KUTT-SEC-004 | Low deployment footgun | Fix in progress | Candidate changes `ENABLE_RATE_LIMIT` default from `false` to `true`; live Compose already explicitly enables it. Config test and example/docs updated. Verify local development and live controls before closure. |
| KUTT-SEC-005 | Development dependency advisories | Fix in progress | Baseline full audit additionally found five vulnerable development-only packages. `npm audit fix --package-lock-only` updated seven development transitive entries within declared ranges; candidate full audit now reports zero. Documentation build and CI remain to verify. |
| KUTT-SEC-006 | High on uninitialized deployments | Fixed and tested | Two concurrent `POST /api/v2/auth/create-admin` requests against a fresh isolated database both returned 201 before the fix. Candidate serializes the empty-user check and insert inside one transaction using the existing `domain_access_state` write guard. Concurrent regression passed on SQLite, MySQL and PostgreSQL; exact-image full suite and live deployment remain. The live service has existing users and BunkerWeb blocks public bootstrap, so this is not currently exploitable there. |
| KUTT-SEC-007 | Medium upstream OS advisory; lower application reachability | Residual/blocked | Candidate Grype reports `CVE-2025-60876` against BusyBox, `busybox-binsh` and `ssl_client` (one advisory represented by three package matches). It affects the BusyBox `wget` applet, which Kutt does not use for outbound HTTP. No fix version is reported for the installed Alpine package. Recheck when Alpine publishes a fixed package; do not replace the tested Node runtime solely to silence an unfixed scanner record. |

Statuses are **Open**, **Fix in progress**, **Fixed and tested**,
**Deployed and verified**, or **Residual/blocked**. Findings are not closed by
a source patch alone.

## Checks Completed So Far

- Live image `.65` is healthy with no published host port. The container runs as
  UID/GID 1000 with read-only root, all capabilities dropped,
  `no-new-privileges`, and separate read-only secrets.
- An unauthenticated request to `/settings/security` returned 401; `/ggl`
  returned the expected public 302 to Google with valid TLS. These narrow
  probes do not prove all authorization or redirect routes.
- BunkerWeb's generated `shorter-link.com/server.conf` includes the custom
  guard file from `/etc/bunkerweb/configs/server-http/shorter-link.com/`.
  The guard clears client-supplied forwarding headers and denies public admin
  bootstrap paths. The default reverse proxy then forwards the validated
  `$remote_addr`. This protects the current `TRUST_PROXY=true` configuration;
  a source-level secure default is still under review.
- The 2026-10-02 production `npm audit --omit=dev` returned two vulnerable
  package names: one high (`nodemailer`) and one moderate (`ip-address`), no
  critical. The previous clean audit recorded for `.65` predated these newly
  published advisories.
- Candidate lockfile: both `npm audit --omit=dev` and full `npm audit` report
  zero known advisories. This is dependency metadata validation only, not an
  image scan or functional acceptance.
- The new concurrent bootstrap regression test failed on the pre-fix candidate
  with actual statuses `[201, 201]`; this confirms the first-run race in an
  isolated database. It has not touched live users.
- The corrected candidate passed the concurrent bootstrap regression in the
  isolated SQLite smoke test and in separate disposable MySQL and PostgreSQL
  databases. The exact candidate image passed its build-time hardening check
  and full isolated regression suite, including tokens, authorization,
  DNS/SSRF, CSP, OIDC RS256/logout, webhooks, migration and public redirects.
- Live baseline image scan: 2 High and 10 Medium package matches, including 2
  fixable High and 7 fixable Medium. Candidate Grype scan: zero Critical/High,
  three Medium matches, all for `CVE-2025-60876` in BusyBox components, with
  no fix version reported. This is a point-in-time scanner result, not proof of
  zero unknown vulnerabilities.
- Before any live change, Kutt's online SQLite recovery script completed. A
  dedicated local Restic snapshot `0b629a89` was copied to the NAS as
  `340715fe`. The NAS snapshot restored 75 files; its recovery database and
  private secrets matched the live snapshot byte-for-byte. The disposable
  candidate image completed integrity, migration and writable-restore checks
  against that restored database, retaining one user and one link. Private
  evidence is under `/srv/homelab/security-reports/2026-10-02-kutt-security-audit/`.
- The candidate lockfile installed in an isolated Node 24 Alpine workspace and
  `npm run docs:build` passed. This does not replace the complete release CI.

## Boundaries and Known Caveats

- This audit covers both the Kutt fork source and its Debian3 deployment. A
  source-only scan does not establish live WAF/SSO/backup health.
- The live homelab Git checkout had unrelated existing changes at intake; do not
  reset, broadly stage or overwrite them to close this audit.
- Do not weaken Authentik, WAF, TLS, private backend networking or public-link
  behavior to make a test pass.
- No credentials or private database contents belong in this ledger.
