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
- [ ] Link pause, scheduled start/end, maximum visits and request-time expiry.
- [ ] History, trash and restore without silently reusing retired aliases.
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

Next: link lifecycle controls. PostgreSQL/MySQL and human MFA acceptance remain
separate validation work; deployment evidence here is for SQLite.
