# Community contribution review

Reviewed 2026-09-15: 12 then-open PRs and 40 recent closed PRs. Selected
proposals were reviewed at patch level, not blindly merged. The original
roadmap is separately submitted as upstream PR #1046; this follow-up is not
added to that review branch.

## Selected for release .17

- [#1016, kkpanfilov: QR copy/download](https://github.com/thedevs-network/kutt/pull/1016).
  Downloads already existed. Added PNG copying to the authenticated QR page,
  using the displayed image and selected resolution. No remote QR service,
  destination fetch, clipboard read, new permission scope or background copy.
  Promise-based encoding preserves the immediate-click write requirement.
  Permission/conversion errors, duplicate clicks and unsupported browsers keep
  the existing download fallback. See [QR validation](QR-CODES.md).
- [#1034, utkarshr3144: digit-leading email search](https://github.com/thedevs-network/kutt/pull/1034).
  Replaced `parseInt` classification with a shared strict numeric-ID/email
  filter in both link and domain admin queries, for counts and rows together.
  A value such as `12345@example.com` is an email search, not user ID 12345.
  All-digit positive safe IDs, including leading zeros, retain ID lookup;
  unsafe IDs/non-string filters return no matches. Ordinary substring/wildcard
  email search remains compatible. No record, role or authorization change.

No new migration, secret or runtime dependency. Full feature regression plus
`tests/admin-user-filter.cjs` covers count/list/pagination parity, HTML, both API
aliases through existing routing, and ordinary/scoped credential denial.
`tests/browser-qr.cjs` covers desktop/mobile clipboard flows and rendered numeric
email search. Deployment completion is recorded below only after its gates pass.

## Release .17 acceptance

- Published [v3.2.6-sr94.17](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.17),
  runtime source `acb564d`, with [passing release CI](https://github.com/RobinMJD/kutt/actions/runs/34908882290).
  Subsequent commits improve only test synchronization/coverage and documentation;
  the immutable tag and published runtime were not replaced.
- Source image digest:
  `sha256:8256ef3ff02aaa8ee8901d5743aedf2a5186d6a090fd33ff7b7b32df691cc52b`.
  Exact hardened wrapper:
  `sha256:cf3f31f7110eeea555dc80b9f926aa5fc6f03ed247ee80323d39f54398b31f36`.
  Deployed 2026-09-14 23:42:46 UTC (2026-09-15 Europe/Paris).
- Full source/SQLite and exact-wrapper regressions, Redis worker/restart tests,
  decoded clipboard/download tests, desktop/mobile link and domain admin filters,
  public HTTPS/WAF regression and real provider-signed logout/replay passed.
  No owner, scope, role or CSRF rule was relaxed. The initial deployment smoke
  stopped at an outdated disposable-email guard; the exact new fixture pattern
  was applied consistently and the complete rerun passed. No application fix
  or production-data repair was needed for that harness mismatch.
- Pre-release and clean post-release snapshots were copied off-host and fully
  restored with byte verification. Both restored databases passed migration,
  integrity, foreign-key and write checks on the exact wrapper. Original secrets
  were separately compared without disclosure; the scratch checker uses a dummy
  key and does not claim live encrypted-webhook delivery after restore.
  Original user/link/configuration fingerprints are unchanged; fixtures removed.
- Two post-change samples 65 seconds apart passed: exact image, zero restarts,
  three fresh probes, no Kutt alerts, failed units or unhealthy containers.
  Whole-lab configuration validation passed with pre-existing unrelated template
  warnings. Image scanning retained zero critical/high and three medium BusyBox
  package matches for CVE-2025-60876, with no fix listed; none were suppressed.
- Physical OS clipboard/Safari/iPhone acceptance remains separate from the
  intercepted ClipboardItem tests. PostgreSQL/MariaDB full feature parity is not
  claimed. Rollback to `.16` is image-only: keep current data and secrets, and
  lose only these two improvements. No schema downgrade is needed.

## Selected for release .18

- [#997 UTM campaign fields](https://github.com/thedevs-network/kutt/pull/997):
  proposal by seler. Implemented independently as a shared URL builder rather
  than five parallel database columns. Personal/admin/workspace forms and the
  existing create/edit APIs compose the canonical destination before normal
  validation and idempotency. Explicit clearing, encoded-length checks and
  existing redirect/transfer/authorization boundaries are tested. See
  [campaign design and recovery](CAMPAIGNS.md). No migration or dependency.
  Publication/deployment gates are pending; this is not yet marked accepted.

## Useful, but larger follow-ups

- [#846 localization](https://github.com/thedevs-network/kutt/pull/846): French
  and English would be useful. The older proposal omits validation messages and
  predates current screens; use a complete escaped catalog/fallback design.
- [#1024 QR logos](https://github.com/thedevs-network/kutt/pull/1024): a DOM
  overlay does not change exported PNG/SVG. Require bounded safe image decoding,
  adequate error correction and independent decoding of every exported format.

## Security-sensitive or already covered

- [#1041 proxy hops](https://github.com/thedevs-network/kutt/pull/1041): strict,
  bounded configuration and audited header topology are needed. Do not silently
  alter trust defaults, accept malformed numbers or expose the backend.
- [#918 shared domains](https://github.com/thedevs-network/kutt/pull/918) and
  [#966 IdP admin roles](https://github.com/thedevs-network/kutt/pull/966): require
  explicit grant/revocation, callback-origin, demotion and break-glass design.
  Current domain ownership and Authentik RBAC remain unchanged.
- [#986 metrics](https://github.com/thedevs-network/kutt/pull/986): do not expose
  public-by-default metrics. The deployed private aggregate collector suffices;
  future metrics need bounded labels and no URL/identity leakage.
- [#969 database TLS](https://github.com/thedevs-network/kutt/pull/969): needs
  validated CA/options and engine-specific tests, not disabled verification.
  SQLite remains the full regression/production basis.
- [#985 custom-domain API routing](https://github.com/thedevs-network/kutt/pull/985):
  broad `/api` prefix exclusions can steal valid aliases; exact segments and
  existing nested-alias precedence need regression coverage first.
- [#973 target allowlists](https://github.com/thedevs-network/kutt/pull/973):
  optional anti-abuse policy needs explicit product choice, IDNA/host boundaries
  and consistent edit/import/routing validation.
- #1042 throttling, #1045 dependency updates, #938 bot filtering, #989 duplicate
  conflicts and #959 domain-preserving deletion overlap the validated fork.
  Preserve its stronger existing contracts instead of replacing older handlers.
- Kubernetes/Helm and alternate deployment proposals are not selected for this
  Compose homelab; avoid introducing a second deployment authority.
