# Kutt fork roadmap

Public redirects stay separate from authenticated management. WAF, native OIDC,
data and existing integrations must survive each deployment. The feature-series
upstream PR waits until this series is ready; the dependency-security PR is
separate.

## Release gates

Implement one feature, run regression and applicable rendered-UI tests, publish
an immutable fork version, take a consistent production database backup, deploy
that exact version, verify protected management and public redirects, and record
rollback instructions. Checked items have passed deployment gates. Never publish
secrets, local configuration or application data.

## Foundation

- [x] Named, hashed, scoped, expiring, individually revocable API tokens (`v3.2.6-sr94.1`, deployed and verified 2026-09-13).
- [x] Token domain restrictions and idempotent link creation (`v3.2.6-sr94.2`, deployed and verified 2026-09-13).
- [x] Link pause, scheduled start/end, maximum visits and request-time expiry (`v3.2.6-sr94.3`, deployed and verified 2026-09-13).
- [x] History, trash and restore without silently reusing retired aliases (`v3.2.6-sr94.4`, deployed and verified 2026-09-14).
- [x] Stable OIDC identities, access revocation and authentication diagnostics (`v3.2.6-sr94.5`, deployed and verified 2026-09-14).

## Everyday management

- [x] Tags, collections, saved filters and ownership-safe bulk actions (`v3.2.6-sr94.6.1`, deployed and verified 2026-09-14).
- [x] CSV/JSON import/export with dry run and explicit alias-conflict handling (`v3.2.6-sr94.7`, deployed and verified 2026-09-14).
- [ ] QR code PNG/SVG export and print.
- [ ] Shared workspaces with owner/editor/viewer permissions.

## Advanced routing and operations

- [ ] Ordered device/language/country/query rules with redirect test preview.
- [ ] Analytics date ranges, exports, tag summaries and consistent bot filtering.
- [ ] Per-link tracking opt-outs and configurable analytics retention.
- [ ] Signed asynchronous webhooks and authenticated live updates.
- [ ] Multi-segment aliases and allowlisted query/path forwarding.
- [ ] SSRF-safe destination health checks and actionable monitoring.
- [ ] Scoped-token iOS Shortcut example.

Unicode aliases and extra database engines are optional follow-ups. Each item
needs tests and migration/rollback notes before completion. No feature-bundle
upstream PR has been submitted yet.

## First deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.1).
- [Passing release CI](https://github.com/RobinMJD/kutt/actions/runs/34776637819).
- Production source image digest: `sha256:6e51b77fa2a6cb6ed15778d5bd7af68085560b3f166bf71f4851d9f94d303974`.
- Isolated SQLite regressions, schema rollback/reapply and migration of an
  off-host restored production database passed. No existing user/link loss.
- Browser create/copy/reload/revoke passed at 1440x1000 and 390x844. Mobile layout
  was corrected after screenshot review. No browser runtime errors remained.
- Public HTTPS tests passed through the existing WAF: OIDC initiation accepted,
  anonymous management denied, scoped CRUD/revocation enforced, cookie privilege
  escalation denied, and public short-link redirects preserved.
- Healthy production container, zero restarts and three successful probes after
  deployment. No WAF/SSO policy relaxation or newly published backend ports.

## Second deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.2)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34778278203).
- Source digest: `sha256:79c259f3cd0c1ada72bc8ecf50b829f0cb08ddbeb6f1aab6fc39f8554941314b`.
- Restricted-domain authorization, concurrent retries, restart replay, conflicts,
  schema rollback/reapply, legacy compatibility and desktop/mobile UI passed.
- An off-host backup was restored, byte-verified and migrated on the exact
  hardened release image with integrity, foreign-key and write checks passing.
- Live HTTPS/WAF checks passed for domain denial, identical idempotent replay,
  deletion/revocation, cookie non-escalation and public redirects. Existing data
  was retained. Container healthy, zero restarts, all three probes successful.
- Wrapper scan: zero critical/high, six medium and one low findings.

## Third deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.3)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34780009689).
- Source digest: `sha256:dde17fa796ae69eb40359de65fc80368daf6e1e433dc930d2b406ddd2c51c448`.
- Hardened-image regressions passed: concurrent redirect caps, password paths,
  schedules, expiry retention, ownership/CSRF, old idempotency keys and guarded
  schema rollback/reapply. Desktop/mobile editing passed without browser errors.
- Off-host pre-upgrade backup restore was byte-verified, migrated and write-tested
  on the exact hardened image, retaining existing users and links.
- Live HTTPS/WAF checks passed for pause/resume and quota exhaustion, plus previous
  domain/replay/revocation/public-redirect tests. Production healthy, zero restarts,
  three green probes, no Kutt alerts, no failed units or unhealthy containers.
- Wrapper scan: zero critical/high, six medium and one low findings. Existing
  WAF, SSO and backend isolation were unchanged.

## Fourth deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.4)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34805030917).
- Source digest: `sha256:cfeacf1b9a48f1157f88e740c1fdd0e4819b5e62ad49a3d6a79a32ae326b3f4c`.
- Hardened-image tests passed for populated migration, duplicate-conflict
  transactional rollback, guarded downgrade, audit privacy, owner/domain/token
  boundaries, concurrent alias claims, trash/restore and retained policies.
- Desktop/mobile delete, history and restore passed with no runtime errors or
  overflow. Long targets wrap correctly. Explicit false on domain deletion is
  regression-tested to preserve active links.
- Off-host backup restore was byte-verified, migrated and write-tested on the
  exact published wrapper, retaining existing users and links.
- Live HTTPS tests passed through the unchanged WAF: history/trash/restore,
  reserved aliases, retained quota, plus existing token/retry/public routing and
  OIDC initiation checks. Healthy, zero restarts, three green probes, no new
  failed units/unhealthy containers or Kutt alerts. Post-deployment backup copied
  to the NAS. Wrapper scan: zero critical/high, six medium and one low.

## Fifth deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.5)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34807339095).
- Source digest: `sha256:b77f825babceffcea01035a9a92fd9a54098db8a985f2b5a981fce58e7b9739f`.
- Exact hardened-image regressions passed for real mock-provider signatures,
  code/PKCE, stable identities, verified-email collision refusal, revocation,
  replay, absolute session expiry, ownership/CSRF, outage recovery and guarded
  downgrade. Desktop/mobile security-page and copied-cookie invalidation passed.
- NAS backup restore was byte-verified, migrated, identity-bound and write-tested
  on the exact wrapper. The accompanying provider database dump also restored
  successfully in an isolated container. Original user and link were preserved.
- Authentik's real HTTP client delivered signed logout and replay through the
  public WAF; both returned 200 and the revoked cookie returned 401. Ordinary
  users could not see administrator diagnostics. Existing public HTTPS smoke
  tests also passed. No WAF/SSO controls were relaxed.
- Production healthy, zero restarts, three green probes, no failed units or
  unhealthy containers. Consistent post-release backup copied to the NAS.
  Wrapper scan: zero critical/high, six medium and one low findings.

## Sixth deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.6.1)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34810123564).
- Source digest: `sha256:47b97811699c57097ffa60eb7a1c429067948b4a5393319a407303cd8bfad766`.
  The immutable `.6` artifact was superseded before deployment to fix archived
  custom-domain display; `.6.1` includes regression coverage for that case.
- Exact hardened-image tests passed for labels/collections, saved AND filters,
  literal search, owner/domain/token/CSRF boundaries, transaction rollback after
  a forced second-row failure, restart persistence and guarded downgrade.
- Desktop/mobile creation, assignment, filters, selection, rename, deletion,
  pause/resume and trash passed. Screenshots showed no overflow or runtime errors.
- NAS restore was byte-verified, migrated and write-tested on the exact wrapper,
  retaining the original user and link. A post-release backup was copied to NAS.
- Live WAF tests passed for native forms, saved filters, scoped bulk operations,
  domain denial and existing public redirect/token/history/lifecycle behavior.
  Real Authentik-signed logout and replay passed; revoked cookies were rejected.
- Production healthy, zero restarts, original user/link/identity retained,
  integrity and foreign keys clean, three green probes and no Kutt alerts or
  failed units/unhealthy containers. Wrapper scan: zero critical/high, six medium
  and one low findings. WAF, SSO, secrets and backend isolation are unchanged.

## Seventh deployment evidence

- [Published release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.7)
  and [passing CI](https://github.com/RobinMJD/kutt/actions/runs/34812610404).
- Source digest: `sha256:d78d0363df77e1e019259ee4d7e2173d322c0ab1e04bd89b6a70f119e069e4e5`.
- Exact hardened-image tests passed for CSV/JSON round trips, reversible formula
  escaping, dry-run no-write, signed confirmation, atomic rollback, concurrent
  retry/restart replay, password/lifecycle preservation and owner/domain/token
  boundaries. Limits, receipt expiry and guarded downgrade also passed.
- Desktop/mobile file selection, previews, confirmation, downloads, errors and
  existing library workflows passed. Screenshots verified readable previews,
  no overflow or overlapping navigation; no browser runtime errors remained.
- NAS restore was byte-verified, migrated and write-tested on the exact wrapper,
  retaining the original user and link. A post-release snapshot was copied to NAS.
- Live HTTPS/WAF tests passed for import UI, scoped dry run/import/replay,
  private CSV/JSON exports, imported public redirects and prior feature behavior.
  Real Authentik-signed logout/replay and revoked-cookie rejection passed.
- Production healthy, zero restarts, original user/link/identity retained,
  clean integrity/foreign keys, three green probes and no Kutt alerts or failed
  units/unhealthy containers after the health interval. Whole-lab validation
  passed with pre-existing unrelated environment-template warnings. Wrapper scan:
  zero critical/high, six medium and one low; WAF/SSO/isolation unchanged.

PostgreSQL/MySQL application support and human MFA acceptance remain separate
validation work; application deployment evidence is for SQLite. QR export and
print is next.
