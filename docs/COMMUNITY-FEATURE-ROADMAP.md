# Community Feature Delivery

Approved on 2026-09-22 after the upstream PR assessment. This is the current
implementation ledger; older PR reviews are historical evidence, not delivery
claims. Baseline: `3.2.6-sr94.40`, main `dc4991b`.

## Release Gates

Each feature requires focused and regression tests, authorization and backwards
compatibility checks, appropriate desktop/mobile acceptance, documentation,
publication/CI, a verified recoverable backup, deployment and live validation.
`Complete` means all those gates passed, not merely that code exists.

Public short-link redirects remain public. Management retains WAF and Authentik.
Optional integrations do not alter existing deployment policy by default. No
automatic domain renaming, historical analytics rewriting or data deletion.

## Work List

| ID | Scope | State | Publication / deployment evidence |
| --- | --- | --- | --- |
| C01 | Safari analytics classification | Complete | `.41`; evidence below |
| C02 | Prefix-only hostname normalization | Complete | `.41`; evidence below |
| C03 | Transactional, reversible administrative moderation and session safety | Pending | Pending |
| C04 | Strict peer/CIDR/hop reverse-proxy trust | Implemented; release gates pending | Candidate `.42` |
| C05 | Compatible staged and enforced Content Security Policy | Pending | Pending |
| C06 | MySQL utf8mb4 search compatibility and real database tests | Implemented; release gates pending | Candidate `.42` |
| C07 | Verified remote database TLS and credential-file configuration | Pending | Pending |
| C08 | Consistent verified Redis TLS for cache, queues and limiting | Pending | Pending |
| C09 | Configurable asymmetric OIDC signing algorithm | Implemented; release gates pending | Candidate `.42` |
| C10 | Custom-domain API routing without homepage interception | Implemented; release gates pending | Candidate `.42` |
| C11 | Complete English (default), French and Spanish localization | Pending | Pending |
| C12 | Stable allowlisted sorting in personal, admin and workspace tables/API | Pending | Pending |
| C13 | Branded QR logos embedded in validated PNG/SVG exports | Pending | Pending |
| C14 | Accessible dark/system/light theme | Pending | Pending |
| C15 | Optional explicit OIDC role mapping and safe demotion/recovery | Pending | Pending |
| C16 | Optional separate management hostname and explicit shared-domain grants | Pending | Pending |
| C17 | Optional consistent destination-domain policy | Pending | Pending |
| C18 | Private authenticated performance metrics with bounded labels | Pending | Pending |
| C19 | Safe dotted aliases with reserved-path protections | Pending | Pending |
| C20 | Accessible interactive geography chart and text alternative | Pending | Pending |
| C21 | Profile visit aggregation; safely batch only where warranted | Pending | Pending |

## Localization Contract

- English is the default. French and Spanish have complete, separate catalogs.
- Locale is request/user scoped, never a mutable process-global setting.
- Templates and browser code share stable keys, escaped interpolation and safe
  plural/date/number formatting. API identifiers and URL identities do not change.
- Document how to add a language; test catalog parity and concurrent locales.
- Translate new features as they are added, including errors and dynamic feedback.

## Final Review

After all delivery gates pass: run full regression/security and desktop/mobile
reviews, reconcile source/release/deployed versions, confirm clean committed and
pushed changes, and update the documented upstream contribution. Do not mark this
review complete while required work remains.

## Evidence: C01 / C02

- Regression reproduced Safari misclassification before the patch. Installed
  parser tests cover desktop/mobile Safari, Chrome, Edge, Opera, Firefox and
  unknown input. A real public redirect increments the Safari aggregate.
- Shared normalization preserves interior labels, ports and casing and retains
  null handling. HTTP tests cover moderation, create/edit/import/routing, DNS
  proof binding and distinct public Host routing. No historic rows are rewritten.
- Desktop/mobile analytics and DNS claim/reload pass, including interior `www.`
  labels, at 1440/390/320px where applicable. A browser-test readiness race was
  corrected by waiting for real chart pixels, not weakening the assertion.
- Read-only live inventory found no domain/host records with interior `www.`.
  This cannot reconstruct names that may have been changed before storage.
- Fresh pre-change local/NAS backup: `c4448e2b` / `ec179081`, 2026-09-21
  23:17 UTC (September 22 Paris). All 63 files byte-restored; SQLite integrity,
  migration and disposable-write checks passed. Secrets compared without output.
- Full container regression passed. Independent read-only review found no scoped
  bypass/regression; it also checked actual offline claims and public Host routing.
  Tag/main CI, exact-wrapper regression, public WAF feature regression and real
  Authentik-signed logout/replay passed. Deployed image `.41` remains healthy
  with three fresh probes and zero restarts, alerts, failed units or unhealthy
  containers over two samples 65 seconds apart. Whole-lab validation passed.
- Post-release local/NAS backup: `f823a350` / `68ff3911`, 2026-09-21 23:57 UTC.
  All 63 files byte-restored; exact-image writable SQLite recovery passed.
  Original records, integrity and foreign keys are unchanged. Fresh wrapper
  scan: zero Critical/High, three Medium findings; none suppressed.
  Evidence outside the repository:
  `Work/kutt-community-20260922` and the private homelab report folder
  `2026-09-22-kutt-community-41`.

## Evidence: C04 / C06 / C09 / C10

- Strict configuration and real IPv4/IPv6 HTTP tests exercise trusted peers,
  forged forwarding chains, client budgets, protocol and hop-count topology.
  Legacy booleans remain booleans, and parser acceptance matches Express.
- The MySQL utf8mb4 collation error was reproduced before the fix. Disposable
  MySQL 8.4 and PostgreSQL 17 tests cover Unicode/case matching, counts, owner
  isolation, pagination and bound hostile input. No stored collation changes.
- Full OIDC fixtures pass with RS256, PS256, ES256 and EdDSA, including PKCE,
  wrong-algorithm/published alternate-key denial, unknown keys, signature
  tampering, signed logout/replay, restart and provider-outage recovery.
- Custom-host HTTP tests cover exact API routing, anonymous/explicit invalid
  credential denial, scoped token privacy, CSRF, disabled OIDC, homepage and
  ordinary alias compatibility. The new malformed-path 400 guard closes a
  pre-existing empty-alias database lookup rather than normalizing into an API.
- Full container regression passes. Publication/CI and deployment/restore
  validation are separate pending gates; these features are not complete yet.
