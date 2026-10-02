# Kutt Advanced Security Audit (2 October 2026)

**Status:** In progress
**Last updated:** 2026-10-02 11:48 CEST
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
| Direct source and dependency review | Complete | Core auth, tokens, redirect, proxy, outbound HTTP, SQL query construction, templates and CSP paths reviewed. Follow-up route/template reviews found unsafe URI schemes accepted at writes (SEC-011) and still linked from legacy records in management tables (SEC-012). Both npm audits report zero known advisories against the candidate lockfile; documentation build passed. A pinned Gitleaks 8.29.1 scan covered 1,001 commits and the current tree, with only test/documentation matches after triage. |
| Live deployment and edge audit | In progress | Container isolation, valid public TLS certificate, management 401/public redirect boundary, private secret directories and Prometheus target/probe health checked. Continue identity-provider and post-cutover negative cases. |
| Finding validation and prioritization | Complete | Package advisories and first-run admin race reproduced against the baseline. SEC-012 reproduced as `href="javascript:alert(1)"` in an isolated personal-link HTML response before its fix; the admin templates shared the same pattern. All 12 findings have a remediation or explicit residual-risk decision. |
| Remediation | In progress | Source fixes through `764c93f` are pushed. The SEC-012 template/helper change passed focused tests. Documentation now describes the mandatory safe-scheme baseline and legacy unsafe-link rendering. Live `.65` is unchanged. |
| Candidate verification | In progress | Both npm audits, documentation build, full isolated source/wrapper regressions and cross-database bootstrap passed on prior candidates. The latest scheme/template candidate passes focused personal/admin/domain unsafe-and-safe HTML regressions; its full isolated suite is still running. The `18bbbdc` CI was canceled as superseded; final exact-commit CI must follow the documentation correction. Final-image Grype before the template-only change reports zero Critical/High and three Medium BusyBox package matches. |
| Backup and deployment | In progress | Kutt SQLite online recovery snapshot, local Restic snapshot `0b629a89`, NAS copy `340715fe`, NAS restore (75 files) and candidate-image writable recovery passed. Guarded fresh-backup, cutover, rollback and post-backup scripts are staged privately and syntax-checked. Live service is unchanged; release publication, immediate pre-cutover backup and cutover remain pending. |
| Final report and source alignment | Pending | Reconcile the final release commit, tag/image, hardened wrapper and live versions after CI; keep unrelated homelab changes untouched. |

## Findings

| ID | Severity | Status | Evidence and remediation |
| --- | --- | --- | --- |
| KUTT-SEC-001 | High package advisory; lower current live reachability | Fix in progress | Baseline `nodemailer@9.1.1` is vulnerable. Candidate uses `10.0.13`; candidate production and full npm audits report zero. Live `MAIL_ENABLED=false`; mail composition test and deployment remain. |
| KUTT-SEC-002 | Moderate package advisories | Fix in progress | Baseline `ip-address@10.3.1` through `geoip-lite` is vulnerable. Candidate override `10.7.1` audits clean; geography and deployment tests remain. |
| KUTT-SEC-003 | Moderate deployment footgun | Fix in progress | Candidate changes `TRUST_PROXY` default from `true` to `false`; live Compose explicitly enables it behind a BunkerWeb guard that strips external forwarding headers. Config test added. Isolated/full tests and live version reconciliation remain. |
| KUTT-SEC-004 | Low deployment footgun | Fix in progress | Candidate changes `ENABLE_RATE_LIMIT` default from `false` to `true`; live Compose already explicitly enables it. Config test and example/docs updated. Verify local development and live controls before closure. |
| KUTT-SEC-005 | Development dependency advisories | Fix in progress | Baseline full audit additionally found five vulnerable development-only packages. `npm audit fix --package-lock-only` updated seven development transitive entries within declared ranges; candidate full audit now reports zero. Documentation build and CI remain to verify. |
| KUTT-SEC-006 | High on uninitialized deployments | Fixed and tested | Two concurrent `POST /api/v2/auth/create-admin` requests against a fresh isolated database both returned 201 before the fix. Candidate serializes the empty-user check and insert inside one transaction using the existing `domain_access_state` write guard. Concurrent regression passed on SQLite, MySQL and PostgreSQL; exact-image full suite and live deployment remain. The live service has existing users and BunkerWeb blocks public bootstrap, so this is not currently exploitable there. |
| KUTT-SEC-007 | Medium upstream OS advisory; lower application reachability | Residual/blocked | Candidate Grype reports `CVE-2025-60876` against BusyBox, `busybox-binsh` and `ssl_client` (one advisory represented by three package matches). The [upstream report](https://lists.busybox.net/pipermail/busybox/2025-November/091817.html) concerns BusyBox `wget`, which Kutt does not use for outbound HTTP. No fix version is reported for the installed Alpine package. Recheck when Alpine publishes a fixed package; do not replace the tested Node runtime solely to silence an unfixed scanner record. |
| KUTT-SEC-008 | Low monitoring gap | Remediated and verified | GitHub Dependabot vulnerability alerts were disabled for `RobinMJD/kutt`. Enabled only the read-only alerts, then verified GitHub's check endpoint returned HTTP 204. Secret scanning and push protection were already enabled. Automatic security-update PRs remain disabled so upgrades still require this project's functional and deployment gates. |
| KUTT-SEC-009 | Moderate container hardening gap outside the homelab wrapper | Fix in progress | The current published source image defaults to root even though the live hardened wrapper already runs as UID 1000. The candidate source Dockerfile now owns only its intended database directory with the Node user and sets `USER node`; both source-image CI workflows assert UID 1000 and write access to that directory. The rebuilt image passed direct UID/write checks, runtime hardening, full application regression and writable restore of the NAS backup. A disposable root-owned legacy volume failed as expected, then passed after a one-time UID 1000 ownership change; the [backup-first upgrade procedure](DEPLOYMENT.md#october-security-maintenance-326-sr9466) documents this compatibility step. Exact-commit release CI, publication and live wrapper reconciliation remain. |
| KUTT-SEC-010 | Moderate east-west architecture risk; no direct public exposure | Residual/blocked | The shared Docker `proxy` network has 36 members, so a compromised sibling can reach `kutt:3000` without BunkerWeb. A direct peer-network request to the unauthenticated management API returned 401, and no host port is published; public WAF still protects external traffic. A dedicated Kutt/BunkerWeb network would reduce lateral reach but needs coordinated changes and validation in the shared edge stack, not a narrow Kutt-only rolling change. Do not describe BunkerWeb as protecting requests originating inside the Docker network. |
| KUTT-SEC-011 | Moderate unsafe redirect URI acceptance; browser impact varies by client | Fix in progress | With `DESTINATION_ALLOWED_HOSTS` unset, the create-link validator accepted `javascript:` and `data:` targets; a disposable Express redirect emitted `Location: javascript:alert(1)`. This proves an unsafe response, not script execution in a particular browser. A mandatory safe-scheme baseline now permits web URLs and common external-app schemes but rejects script, data, file, blob, unknown schemes and web URLs with embedded credentials at writes and on existing-link redirects. Focused API/runtime regressions pass on the rebuilt final UID 1000 image; full suite, release CI and live deployment remain. |
| KUTT-SEC-012 | Moderate legacy unsafe-target management link | Fix in progress | Existing rows with unsafe target/homepage strings remain stored for operator repair. The personal link table rendered `href="javascript:alert(1)"` in an isolated HTML response before the fix; Handlebars escapes HTML but does not make that URL safe. Admin link/domain templates had the same pattern. Default source CSP is off; client execution depends on browser/CSP behavior. A shared helper now renders only policy-allowed destinations as links. Focused personal/admin/domain HTML tests pass for both unsafe text and safe clickable HTTPS destinations; full release CI and deployment remain. |

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
- The versioned `.66` source and hardened-wrapper images both built with the
  image-hardening check. The wrapper's isolated restore against the NAS copy
  passed integrity, migration and writeability. Wrapper Grype likewise reports
  zero Critical/High and only the three BusyBox Medium package matches. The
  hardened wrapper passed the same full isolated regression suite as the source
  image.
- A revised `.66` source image now defaults to UID 1000 rather than root. Direct
  write checks on `/var/lib/kutt`, the runtime hardening test and an isolated
  writable restore from the NAS recovery database all passed as UID 1000.
  Its full application regression passed. Grype on this non-root image reported
  zero Critical/High and the same three non-fixable BusyBox Medium package
  matches as the wrapper. Exact-commit GitHub release CI is running.
- A disposable root-owned Docker named volume reproduced the expected upgrade
  incompatibility: UID 1000 could not write it. A one-time ownership transfer
  of only that volume restored node-user write access. The deployment guide
  makes backup, service stop and the exact Compose command explicit. The live
  wrapper's volume is already owned for UID 1000 and is unaffected.
- A separate fresh named volume inherited UID/GID 1000 ownership. The default
  source container command started with a read-only root filesystem, dropped
  capabilities and no network; it applied all 29 SQLite migrations, answered
  HTTP on loopback and passed SQLite integrity. The disposable container and
  volume were removed afterward.
- A final-tree Gitleaks pass had the same four previously triaged fixture/prose
  matches; the three new security-audit commits had no matches.
- The separately installed homelab wrapper lockfile has the same production
  dependencies and overrides as the fork source. A fresh npm audit of that
  lockfile also returned zero known advisories.
- Vendored htmx 2.0.1 and Chart.js 4.4.4 are not in npm's lockfile. Their
  [maintainer](https://github.com/bigskysoftware/htmx/security)
  [advisory](https://github.com/chartjs/Chart.js/security/advisories) pages
  currently list none. An [open Chart.js defaults-path gadget report](https://github.com/chartjs/Chart.js/issues/12265)
  requires untrusted input to reach `Chart.defaults` path APIs; Kutt constructs
  charts with fixed options and only assigns a validated locale to defaults.
  This is reachability analysis, not a general claim that vendored scripts are
  vulnerability-free. Upgrade them separately with the browser regression suite.
- The baseline create-link validator accepted `javascript:` and
  `data:` destinations while the optional host allowlist was blank. A disposable
  Express request confirmed the resulting 302 can carry a `javascript:`
  `Location`. The new scheme baseline is enforced by the destination-policy
  check at creation and again at redirect, without changing stored rows.
- Gitleaks 8.29.1 was checksum-verified against its official release and first
  confirmed to detect a synthetic token. Its redacted scan covered 1,001 Git
  commits (nine matches) and the current tree (four matches). The matches are
  test-generated API keys, historical frontend JWT fixtures and prose/examples
  that contain words such as `credential` or `Idempotency-Key`; none is a live
  Kutt credential. No token value or unredacted report is kept in this repo.
- Live TLS for `shorter-link.com` has a matching certificate valid through
  12 December 2026. Unauthenticated management API and account-security
  requests returned 401; the known short link remained publicly redirectable.
  Prometheus reported `kutt-performance` up and a successful public HTTPS
  blackbox probe. No failed Debian3 units or unhealthy containers were found.
- The live Authentik `kutt-oidc` application has exactly two enabled,
  non-negated group bindings: `authentik Admins` and `Kutt Users`. The OIDC
  discovery document returns the configured issuer and endpoints. The public
  login route serves strict CSP, HSTS and no-store headers.
- GitHub vulnerability alerts are enabled with no currently open Dependabot
  alerts. GitHub secret scanning and push protection are enabled, with no open
  secret-scanning alerts; automatic security-update PRs remain disabled.

## Boundaries and Known Caveats

- This audit covers both the Kutt fork source and its Debian3 deployment. A
  source-only scan does not establish live WAF/SSO/backup health.
- The live homelab Git checkout had unrelated existing changes at intake; do not
  reset, broadly stage or overwrite them to close this audit.
- The guarded deployment replaces only the four checksum-verified Kutt wrapper
  files (`Dockerfile`, `docker-compose.yml`, and the two `security/package*`
  files). It neither rewrites nor commits the other dirty homelab files.
- Do not weaken Authentik, WAF, TLS, private backend networking or public-link
  behavior to make a test pass.
- No credentials or private database contents belong in this ledger.
