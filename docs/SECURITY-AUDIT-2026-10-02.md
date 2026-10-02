# Kutt Advanced Security Audit (2 October 2026)

**Status:** Complete, with two bounded residual risks
**Last updated:** 2026-10-02 13:40 CEST
**Source baseline:** `55d1d1ad0d3789909a8a9c0d8584beddb2503c2c` (`main`, clean before this ledger)
**Live baseline:** `local/kutt:3.2.6-sr94.65`, image `sha256:2c13ec0b963dade59dec6e8bfaa0f54339d21e4a5c9cb864697e0cc12bab9c09`, healthy, zero restarts at intake
**Accepted release:** `v3.2.6-sr94.66` at `6e2fc332dcdf33a43fab8e7b0efd216c28c53d13`
**Live image:** `local/kutt:3.2.6-sr94.66`, `sha256:682dbd1a736398cb95f1b8469ac76c3c908fd258dddba18be4279db8bdce15fa`
**Private deployment evidence:** `/srv/homelab/security-reports/2026-10-02-kutt-security-audit/` on Debian3

This ledger records the audit from intake to deployed acceptance. A finding is not fixed merely because a
source patch exists: tests, protected public routes, backup/restore and the
deployed image must be checked separately. Existing links, users, secrets,
public redirects, WAF and Authentik protections must remain intact.

## Progress

| Phase | Status | Evidence / next action |
| --- | --- | --- |
| Scope and baseline | Complete | Confirmed clean Kutt fork, live `.65` health, NAS mount and pre-existing dirty homelab checkout. |
| Independent deep source audit | Blocked | The plugin refused to start a read-only worker because this parent has no managed filesystem permission profile. No scan artifact or result exists; do not infer clean coverage. |
| Direct source and dependency review | Complete | Core auth, tokens, redirect, proxy, outbound HTTP, SQL query construction, templates and CSP paths reviewed. Follow-up route/template reviews found unsafe URI schemes accepted at writes (SEC-011) and still linked from legacy records in management tables (SEC-012). Both npm audits report zero known advisories against the release lockfile; documentation build passed. A pinned Gitleaks 8.29.1 scan covered 1,001 commits and the current tree, with only test/documentation matches after triage. |
| Live deployment and edge audit | Complete | Container isolation, valid public TLS certificate, management/API 401, public redirect 302, Authentik authorization-code/PKCE start, private secrets and Prometheus target/probe health checked before/after. No authenticated browser ceremony or dedicated edge-network migration was claimed. |
| Finding validation and prioritization | Complete | Package advisories and first-run admin race reproduced against the baseline. SEC-012 reproduced as `href="javascript:alert(1)"` in an isolated personal-link HTML response before its fix; the admin templates shared the same pattern. All 12 findings have a remediation or explicit residual-risk decision. |
| Remediation | Complete | Ten actionable findings are deployed and verified. Source fixes were committed at `6e2fc33`, published as `.66`, and adopted by the hardened live wrapper. No database row, credential, WAF or SSO policy was replaced. |
| Candidate verification | Complete | Production/full npm audits report zero advisories; full exact-image and wrapper regressions, cross-database bootstrap, scheme/template tests and docs build passed. Main CI [`36992005037`](https://github.com/RobinMJD/kutt/actions/runs/36992005037) and tag CI [`36996467483`](https://github.com/RobinMJD/kutt/actions/runs/36996467483) passed. Final wrapper Grype reports zero Critical/High and three Medium BusyBox matches. |
| Backup and deployment | Complete | Immediate pre-cutover local/NAS snapshots `ac1e17a5`/`7166bf3e`, then post-cutover `71f7e075`/`11e3eb80`, each passed NAS restore, byte match and writable database check. Guarded cutover checked original records and image. Public routes, two 35-second monitoring samples and full lab validator passed. Guarded image-only rollback remains available. |
| Final report and source alignment | Complete | Immutable GHCR source digest `sha256:7949e1d32c178c4d8fbd43f809885f08d263a1387994ac7218314b0f63b20a9e` is pinned in the hardened wrapper. Live runs `.66` with zero restarts; source, release, deployment and recovery docs are reconciled. Unrelated homelab checkout changes remain untouched. |

## Findings

| ID | Severity | Status | Evidence and remediation |
| --- | --- | --- | --- |
| KUTT-SEC-001 | High package advisory; lower current live reachability | Deployed and verified | Baseline `nodemailer@9.1.1` is vulnerable. `.66` uses `10.0.13`; production/full npm audits are clean, mail composition and exact-image regressions passed. Live `MAIL_ENABLED=false`; image digest reconciled. |
| KUTT-SEC-002 | Moderate package advisories | Deployed and verified | Baseline `ip-address@10.3.1` through `geoip-lite` is vulnerable. `.66` overrides to `10.7.1`; geography and exact-image regressions passed and npm audits are clean. |
| KUTT-SEC-003 | Moderate deployment footgun | Deployed and verified | `TRUST_PROXY` now defaults to `false`; live Compose explicitly enables it only behind a verified BunkerWeb guard that strips external forwarding headers. Proxy spoofing/config tests and deployed boundary checks passed. |
| KUTT-SEC-004 | Low deployment footgun | Deployed and verified | `ENABLE_RATE_LIMIT` now defaults to `true`; live Compose also explicitly enables it. Configuration, proxy and isolated runtime tests passed; no edge rate limit was removed. |
| KUTT-SEC-005 | Development dependency advisories | Deployed and verified | Seven development transitive entries were refreshed within declared ranges. Full npm audit, documentation build and exact-commit release CI passed with zero known advisories. |
| KUTT-SEC-006 | High on uninitialized deployments | Deployed and verified | Two concurrent first-admin requests returned `[201, 201]` before the fix. `.66` serializes the empty-user check and insert transactionally using the existing `domain_access_state` write guard; SQLite, MySQL and PostgreSQL regressions now produce one winner. Live has existing users and public bootstrap returns 404 at BunkerWeb. |
| KUTT-SEC-007 | Medium upstream OS advisory; lower application reachability | Residual/blocked | Candidate Grype reports `CVE-2025-60876` against BusyBox, `busybox-binsh` and `ssl_client` (one advisory represented by three package matches). The [upstream report](https://lists.busybox.net/pipermail/busybox/2025-November/091817.html) concerns BusyBox `wget`, which Kutt does not use for outbound HTTP. No fix version is reported for the installed Alpine package. Recheck when Alpine publishes a fixed package; do not replace the tested Node runtime solely to silence an unfixed scanner record. |
| KUTT-SEC-008 | Low monitoring gap | Remediated and verified | GitHub Dependabot vulnerability alerts were disabled for `RobinMJD/kutt`. Enabled only the read-only alerts, then verified GitHub's check endpoint returned HTTP 204. Secret scanning and push protection were already enabled. Automatic security-update PRs remain disabled so upgrades still require this project's functional and deployment gates. |
| KUTT-SEC-009 | Moderate container hardening gap outside the homelab wrapper | Deployed and verified | The published source image now defaults to UID 1000, matching the live hardened wrapper. CI asserts UID and writable database volume; fresh and legacy disposable volume checks passed, with the [backup-first legacy ownership procedure](DEPLOYMENT.md#october-security-maintenance-326-sr9466) documented. Live `.66` runs UID/GID 1000, read-only root, all capabilities dropped and no host port. |
| KUTT-SEC-010 | Moderate east-west architecture risk; no direct public exposure | Residual/blocked | The shared Docker `proxy` network has 36 members, so a compromised sibling can reach `kutt:3000` without BunkerWeb. A direct peer-network request to the unauthenticated management API returned 401, and no host port is published; public WAF still protects external traffic. A dedicated Kutt/BunkerWeb network would reduce lateral reach but needs coordinated changes and validation in the shared edge stack, not a narrow Kutt-only rolling change. Do not describe BunkerWeb as protecting requests originating inside the Docker network. |
| KUTT-SEC-011 | Moderate unsafe redirect URI acceptance; browser impact varies by client | Deployed and verified | With `DESTINATION_ALLOWED_HOSTS` unset, baseline writes accepted `javascript:`/`data:` and emitted an unsafe `Location`. `.66` enforces a mandatory safe-scheme baseline at writes and redirects, denying script/data/file/blob/unknown schemes and web URLs with credentials. Focused and full exact-image tests passed; the public known-safe link still redirects without auth. No browser script execution was claimed. |
| KUTT-SEC-012 | Moderate legacy unsafe-target management link | Deployed and verified | Baseline personal table rendered an unsafe `javascript:` href; admin/domain templates shared it. `.66` preserves stored rows for repair but renders only policy-allowed targets as links. Focused personal/admin/domain and full exact-image regressions passed. No unsafe fixture was written to production to test this. |

Statuses are **Open**, **Fix in progress**, **Fixed and tested**,
**Deployed and verified**, **Remediated and verified** (external configuration),
or **Residual/blocked**. Findings are not closed by
a source patch alone.

## Verification Evidence

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
  matches as the wrapper. Exact-commit main and tag release CI passed.
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
- The immutable `.66` source image is pinned in the final hardened wrapper;
  final wrapper ID is
  `sha256:682dbd1a736398cb95f1b8469ac76c3c908fd258dddba18be4279db8bdce15fa`.
  A focused redirect-policy run against this final image passed. Final Grype
  JSON reports zero Critical/High and three Medium matches for one unfixed
  BusyBox advisory (`CVE-2025-60876`), with no fix version reported.
- The immediate pre-cutover backup completed as local `ac1e17a5` and NAS
  `7166bf3e`. A first validation attempt exposed a disposable `docker run`
  stdin-plumbing error; the private pre/post scripts were corrected and the
  entire gate reran successfully. The NAS copy restored with byte-matched
  database and secrets, original records, integrity and a writable check.
- The guarded one-container cutover installed only the four recorded wrapper
  files. Original user/link records and SQLite integrity/foreign keys were
  unchanged. The `.66` container is healthy with zero restarts, UID/GID 1000,
  read-only root, all capabilities dropped and no published host port.
- Post-cutover, `/ggl` returned a public 302 to the original target;
  `/settings/security` and `/api/v2/links` returned 401 without credentials;
  `/api/v2/auth/create-admin` returned 404 at the edge; `/login/oidc` started
  Authentik authorization-code flow with PKCE S256. Login HTML retained strict
  CSP/HSTS/no-store. These are route/security smoke checks, not a new
  authenticated-user browser acceptance ceremony.
- Two post-cutover monitoring samples 35 seconds apart each had three required
  probes up, zero failed systemd units, zero unhealthy containers, zero Kutt
  alerts and zero Kutt restarts. `scripts/validate-change.sh --all` passed;
  it reported only non-failing template warnings in unrelated Mail Bridge and
  Passkey Readiness Portal stacks.
- The post-cutover online backup completed as local `71f7e075` and NAS
  `11e3eb80`; its NAS restore byte-matched the recovery database and private
  secrets, preserved original records and passed image-based writable recovery.
  The guarded `rollback66.sh --apply` would restore only the previous wrapper
  and image, retaining newer live data and secrets if a later regression appears.

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
