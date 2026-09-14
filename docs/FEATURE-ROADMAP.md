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
- [ ] Stable OIDC identities, access revocation and authentication diagnostics.

## Everyday management

- [ ] Tags, collections, saved filters and ownership-safe bulk actions.
- [ ] CSV/JSON import/export with dry run and explicit alias-conflict handling.
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

PostgreSQL/MySQL and human MFA acceptance remain separate validation work;
deployment evidence is for SQLite. Stable OIDC identity/revocation is next.
