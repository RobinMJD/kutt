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

- [ ] Named, hashed, scoped, expiring, individually revocable API tokens (in progress).
- [ ] Token domain restrictions and idempotent link creation.
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
