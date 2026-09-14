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

## Useful, but larger follow-ups

- [#997 UTM campaign fields](https://github.com/thedevs-network/kutt/pull/997):
  worthwhile after defining precedence with stored query values, routing rules,
  forwarding, import/export, history and workspace APIs. Five new columns alone
  would leave inconsistent redirect behavior.
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
