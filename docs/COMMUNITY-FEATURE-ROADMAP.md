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
| C03 | Transactional, reversible administrative moderation and session safety | Complete | `.45`; evidence below |
| C04 | Strict peer/CIDR/hop reverse-proxy trust | Complete | `.42`; evidence below |
| C05 | Compatible staged and enforced Content Security Policy | Implemented; release gates pending | Integrated; strict nonce policy and translated browser checks passed; see `CSP.md` |
| C06 | MySQL utf8mb4 search compatibility and real database tests | Complete | `.42`; evidence below |
| C07 | Verified remote database TLS and credential-file configuration | Complete | `.43`; evidence below |
| C08 | Consistent verified Redis TLS for cache, queues and limiting | Complete | `.43`; evidence below |
| C09 | Configurable asymmetric OIDC signing algorithm | Complete | `.42`; evidence below |
| C10 | Custom-domain API routing without homepage interception | Complete | `.42`; evidence below |
| C11 | Complete English (default), French and Spanish localization | Implemented; release gates pending | Candidate `.49`, integrated with `.48` metrics; 198 combined desktop/mobile layouts passed; see `LOCALIZATION.md` |
| C12 | Stable allowlisted sorting in personal, admin and workspace tables/API | Complete | `.44`; evidence below |
| C13 | Branded QR logos embedded in validated PNG/SVG exports | Implemented; release gates pending | Integrated; bounded PNG validation, independent decoding and 18 enforced-CSP layouts passed; see `QR-BRANDING.md` |
| C14 | Accessible dark/system/light theme | Complete | `.47`; full source/wrapper regression, 90 layouts, public theme selection, WAF/SSO and backup/restore gates passed; evidence below |
| C15 | Optional explicit OIDC role mapping and safe demotion/recovery | Implemented; release gates pending | Integrated; see `OIDC-SECURITY.md` |
| C16 | Optional separate management hostname and explicit shared-domain grants | In progress | Isolated implementation and authorization/transaction review; not deployed |
| C17 | Optional consistent destination-domain policy | In progress | Isolated implementation; 18 translated desktop/mobile workflows passed; combined regression/publication/deployment pending |
| C18 | Private authenticated performance metrics with bounded labels | Complete | `.48`; source/wrapper/CI, private Prometheus scrapes, WAF/SSO, backup/restore and stable health gates passed |
| C19 | Safe dotted aliases with reserved-path protections | Complete | `.46`; [rules and tests](LINK-ALIASES.md), evidence below |
| C20 | Accessible interactive geography chart and text alternative | Implemented; release gates pending | Integrated; see `ANALYTICS.md` |
| C21 | Profile visit aggregation; safely batch only where warranted | Implemented; release gates pending | Indexed SQLite hourly lookup preserves synchronous transactions; SQLite/MySQL/PostgreSQL and rollback checks passed; see `VISIT-PERFORMANCE.md` |

## Evidence: C14

- Published/deployed `.47`, source `741cece`; main/tag CI `35680493811` /
  `35680493815` and full exact-wrapper regression passed. Fresh valid Grype
  scan: zero Critical/High. No new secret, schema, WAF or SSO change.
- Rendered tests cover 15 routes at 1440/390/320px in both themes, keyboard,
  media preference, cross-tab persistence, storage denial, text contrast, chart
  pixels and printing. Public HTTPS login passed all three theme modes and
  reload persistence at all widths; this is Chromium evidence, not physical
  Safari/mobile-device acceptance.
- Full public feature regression, real Authentik-signed logout/replay, original
  record/integrity/FK checks and whole-lab validation passed. Two samples 65s
  apart: healthy, zero restarts/alerts/failed units/unhealthy containers, three
  fresh probes. Wrapper `sha256:e493ab6cd653539feebec7e862197dfa61adfb002db85bb0349e6d9297218427`.
- Pre-release local/NAS `94bbab75` / `30665118` at September 22 03:41:08 UTC;
  post-release `c7463d86` / `3d68a579` at 03:57:42 UTC. Both 68-file byte
  verification and exact-image writable SQLite restore passed. No USB SSD claim.
  Private evidence: homelab `security-reports/2026-09-22-kutt-community-47` and
  local `Work/kutt-community-20260922/public-theme47`.

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
- Full source/exact-wrapper regression, tag/main CI `35670358147` /
  `35670357525`, Library at 1440/390/320px and 12 HTTPS admin/user keyboard
  login/navigation workflows passed. Release `.42` is deployed as wrapper
  `sha256:deafa204c50ace932b88cb6b2e41830f138fd10b3684ce25dbf69bffc31b6ef0`.
- Fresh pre-change local/NAS backup `89fbbd22` / `bbdb4418` at September 22
  00:13 UTC and post-change `b2b0a2aa` / `17c9bf0f` at 00:46 UTC passed
  63-file byte verification and exact-image writable SQLite recovery.
- Public WAF feature regression, actual Authentik-signed logout/replay and
  HTTPS webhook delivery passed. Two health samples 65 seconds apart showed
  three fresh probes and zero restarts/alerts/failed units/unhealthy containers.
  Whole-lab validation passed; original records/integrity/FK are unchanged.
  Valid fresh scan: zero Critical/High. Private evidence: homelab report
  `2026-09-22-kutt-community-42` and local `Work/kutt-community-20260922`.

## Evidence: C07 / C08

- Shared verified transport configuration serves runtime and migrations, and
  Redis cache, Bull and rate limiting. Credential-file precedence and malformed,
  empty, missing, mismatched or inactive TLS material fail closed without values
  in errors. Installed SQL drivers require DNS identity; no verification bypass.
- Disposable PostgreSQL 17, MySQL 8.4 and Redis 8 handshake tests pass with
  fresh certificates: encryption/mutual TLS, untrusted CA, wrong SAN, expiry and
  plaintext-only denial. Real Redis cache, forked Bull worker and limiter tests
  pass over TLS and on the unchanged plaintext baseline.
- Full default SQLite regression and real MySQL/PostgreSQL Unicode search tests
  pass. Independent read-only review found no remaining scoped issue. No live
  database/Redis policy changes are needed for the current SQLite deployment.
- Main/tag CI `35671924619` / `35671925066`, exact-wrapper regression, fresh
  scan (zero Critical/High), public WAF feature tests and Authentik-signed
  logout/replay passed. The first health sample failed on a transient probe;
  retained evidence records that failure. Recheck passed all three fresh probes,
  with no alerts/restarts/failed units/unhealthy containers in two samples 65
  seconds apart. Whole-lab validation passed without relaxed thresholds.
- Pre-change backup 2026-09-22 00:51:57 UTC: local `5058a926`, NAS `98926bcb`.
  Post-change 01:18:43 UTC: local `0d087799`, NAS `631c878f`. Both restored and
  byte-verified 63 files; original and candidate writable SQLite recovery passed.
  Original records and integrity/foreign keys unchanged. Homelab publication
  `62b1cc1`; private report `2026-09-22-kutt-community-43`.
  See [transport configuration and recovery](TRANSPORT-TLS.md).

## Evidence: C12

- Fixed identifier profiles and scalar directions retain `id DESC` defaults,
  stable ties, numeric count ordering and null-homepage-last semantics across
  SQLite, MySQL 8.4 and PostgreSQL 17. Every field/direction, pagination, count
  parity and owner scoping passed real-database tests.
- Both API prefixes preserve scoped authorization; malformed/structured sort
  input is rejected. Saved-filter state survives restart. Workspace native
  candidate search/mutations and Library error pages retain valid list state.
- Rendered 1440/390/320px personal/admin/Library/workspace workflows pass,
  including pagination/reset, independent inline drafts and delayed list/editor
  response races. Review-found refresh loss and disabled-select serialization
  problems were fixed and reproduced in the browser regression test.
- No migration is required. Main/tag CI `35674513731` / `35674513629`, full
  exact-wrapper regression, fresh valid scan (zero Critical/High), public WAF
  sorting/authorization tests and existing feature regression passed. Actual
  Authentik-signed logout/replay, three fresh probes in two samples 65 seconds
  apart and whole-lab validation passed without new restarts/alerts/failed units
  or unhealthy containers. Original records/integrity/foreign keys unchanged.
- Pre-change backup at September 22 01:27:13 UTC: local `76a4ebe3`, NAS
  `4c004a82`, 63 verified files. Post-change 01:58:08 UTC: local `16bf1dff`, NAS
  `974b293b`, 64 verified files including the added public sorting test. Both
  off-host byte verification and exact-image writable SQLite recovery passed.
  The first sorting fixture used an unsupported one-day token lifetime; retest
  used the documented seven-day choice without weakening validation.
- Deployed wrapper: `sha256:d145f7159eae58227e6e5dd35e45b52dfc58080c79a1df6dd8592f4ee3a5a483`.
  Private report: `2026-09-22-kutt-community-44`. See [sorting](LIST-SORTING.md).

## Evidence: C03

- Atomic related-target bans, explicit independent unban and private audit
  preserve domain ownership/homepage and deny self-administrative or final-admin
  removal. Fresh locked actor/token checks prevent ban/unban credential revival.
- SQLite, MySQL 8.4 and PostgreSQL 17 passed competing-administrator, token/ban,
  cache-invalidation retry, transaction rollback and downgrade-guard fixtures.
  HTTP checks cover strict boolean flags, both credential classes, CSRF, DNS
  failure rollback, metadata retention, native confirmation and restart.
- Playwright at 1440/390/320px passed actual HTMX ban checkboxes, keyboard/native
  unban, independent child bans, audit and public redirects. Screenshots were
  reviewed. A native `Origin: null` failure was reproduced and fixed with a
  same-origin-only referrer policy on moderation pages; null/foreign origins
  remain rejected and HTML errors retain their actual status.
- Read-only follow-up found no remaining scoped finding after fixing stale ban
  reads, awaited/retryable cache invalidation, legacy body-key compatibility and
  the stylesheet path. This is bounded review, not a whole-application guarantee.
- Browser plugin unavailable: regular Playwright supplied this evidence. Main/tag
  CI `35677669218` / `35677699701`, full exact-wrapper regression and fresh valid
  scan (zero Critical/High) passed. Deployed wrapper is
  `sha256:bef29ed449f380d71f4dde5520304930d59d0a2559ba382ca7d464e21b6ba802`.
- Public WAF moderation/existing-feature tests, real Authentik-signed logout and
  whole-lab validation passed. Original records/integrity/foreign keys unchanged;
  two samples 65 seconds apart found all three fresh probes and no alerts,
  restarts, failed units or unhealthy containers.
- Pre-change 02:02:14 UTC backup: local `55b76b82`, NAS `d6e51a90`, 64 verified
  files. Post-change 02:49:01 UTC: local `2cf9f8ad`, NAS `cef86eca`, 66 verified
  files. Byte restoration and exact-image writable SQLite checks passed.
- BunkerWeb supplies `strict-origin-when-cross-origin` rather than the source's
  `same-origin` policy. Real public keyboard submission confirmed the expected
  Origin, 303 and recovered redirect. The initial over-specific header assertion
  was corrected; no WAF/SSO/header setting was weakened. Failed evidence is kept
  in private report `2026-09-22-kutt-community-45`. See [moderation](MODERATION.md).

## Evidence: C19

- Literal dotted names work across personal/admin/workspace create and edit,
  import, alias claims and public redirects. Reserved roots, traversal,
  encoding ambiguity, empty dot components and size/depth limits fail closed.
  Existing forwarding suffixes and single-component custom alphabets remain
  compatible; no existing alias is rewritten and no migration is required.
- Real MySQL 8.4 and PostgreSQL 17 checks passed native collation parity,
  scoped-domain isolation, competing claims, lifecycle and rollback. A forced
  MySQL stale-snapshot failure previously returned an unclassified error; it
  now returns a conflict for both ordinary and dotted names, preserving the
  winner and rolling back the loser.
- Combined-source Playwright workflows at 1440/390/320px passed create, edit,
  rejected-input draft retention, rename/reload and actual public redirect
  responses. Screenshots were reviewed; the browser plugin is unavailable.
- Main/tag CI `35679048427` / `35679070941`, publication, exact-wrapper
  regression and a fresh valid scan (zero Critical/High) passed. The wrapper
  regression required the corrected HTTP test client that drains non-SSE bodies;
  it did not change the runtime image or discard an application assertion.
- Public WAF feature regression, real Authentik-signed logout and whole-lab
  validation passed. Two samples 65 seconds apart had three fresh probes and
  zero restarts, alerts, failed units or unhealthy containers. Original records,
  integrity and foreign keys remain unchanged.
- Pre-change 02:52:44 UTC backup: local `dbcc3ed4`, NAS `472914ac`, 66 files.
  Post-change 03:38:01 UTC: local `c74d0da4`, NAS `37511925`, 68 files.
  Byte restoration and exact-image writable recovery passed. Validated wrapper:
  `sha256:81527b086a7328b1a2b53b13b641a38321416f64f6733e268d35cb66751775cd`.
- The first public test confused legacy flat missing-alias redirects with
  nested tombstones and tried to reclaim a retired name. Its dedicated nested
  fixture now requires 410 for retired paths and 409 for reclamation, and the
  complete suite passed. No reservation or WAF rule was relaxed. Private report:
  `2026-09-22-kutt-community-46`, including the test-correction record.

## Evidence: C14

- Validated browser-local System/Light/Dark preference initializes before styles,
  follows OS changes only in System, synchronizes tabs and retains an in-memory
  choice when storage is unavailable. No credential, account or API change.
- Full container regression passed. Chromium checks cover 15 routes at
  1440/390/320px in both themes, keyboard selection, computed text contrast,
  rendered chart pixels and live recoloring, QR quiet zones and print output.
- Screenshot review found tiled select arrows and low-contrast legacy button
  icons; scoped styles and rendered assertions now cover those cases. Static
  assets resolve relative to the application rather than its launch directory,
  preserving custom asset precedence and isolated-start compatibility.
- Custom templates, native Safari/Firefox and physical assistive technology
  remain separate acceptance surfaces. Publication, exact-wrapper deployment,
  backup/recovery and public acceptance are pending. See [appearance](THEMES.md).

## Evidence: C18

- Deployed `.48` (`cbb8473`); main/tag CI `35682493053` / `35682492877`,
  exact-wrapper regression, valid Grype scan (zero Critical/High), public feature
  regression, real Authentik-signed logout/replay and lab validation passed.
  Private Prometheus scrapes passed twice with the warning inactive. Initial
  transient public-probe failures are retained; final two samples 65s apart
  passed without threshold changes, with three fresh probes, zero restarts,
  scoped alerts, failed units or unhealthy containers. Unrelated lab alerts
  remain outside this acceptance claim.
- Pre local/NAS `6ba7284b` / `a68a6284` (04:02:15 UTC); post `6e4d51a3` /
  `175a373f` (04:29:57 UTC, September 22): 69 files byte-restored, credentials
  compared without output, exact-image writable SQLite recovery passed.
  Wrapper `sha256:ce3a552eec48c681dd6fd6649c9f0b855d4ab8e0c82b383c668a4fa456f9cc2a`.
  No USB SSD claim. Private report `2026-09-22-kutt-community-48`.
- Separate opt-in bearer-authenticated listener, no public application route,
  bounded route/method/status labels, cumulative duration histograms and process
  gauges. Missing credentials, bad bind/port/worker configuration and listener
  conflicts fail startup. Metrics do not access persisted data or make requests.
- Focused and full container regression passed, including file precedence,
  token rotation/restart, public `/metrics` alias compatibility, disabled mode,
  credential/method/path denial, no CORS, no identity leakage, 1,000 distinct
  aliases with fixed cardinality, cumulative buckets and no double-counting.
- Full tests exposed an unread-response Node client assertion, not an application
  crash. The test helper now drains ordinary bodies while retaining SSE streams;
  no failed application assertion was removed. An unrelated offline schema
  fixture now uses a reserved literal address instead of depending on DNS.
- There is no migration or account change. Publication, exact-wrapper scan,
  private collector integration, recoverable deployment and live acceptance are
  still pending. See [metrics](METRICS.md).

## Evidence: C11

- Candidate `.49` integrates 1,442 stable keys in each English/French/Spanish
  catalog, shared Node/browser formatting and request-scoped translations.
  Existing IDs, roles, URLs, signed inputs and API machine fields remain literal.
  Public management/redirect authorization is unchanged; there is no migration.
- The combined full container suite passed, including metrics, moderation,
  aliases, OIDC, privacy, concurrency and guarded rollback/reapply. Catalog
  parity/placeholder validation, hostile-value escaping, mail rendering,
  custom partial precedence and 90 concurrent locale contexts passed.
- Chromium passed 198 localized layouts at 1440/390/320px and 270 themed
  layouts across the three languages. Native language selection, strict Origin,
  theme persistence, HTMX validation, plural bulk feedback, charts, print and
  denied storage passed. Screenshot review found clipped Spanish sorting labels
  and low-contrast dark Library icons; scoped styles and rendered assertions
  now cover both. The final 198-layout run passed after these corrections.
- Browser plugin unavailable; regular Playwright used disposable loopback-only
  instances. SMTP delivery, physical devices, native Safari/Firefox and custom
  operator layouts remain unverified. The signed iOS Shortcut's embedded prompts
  remain English; its downloadable guides are localized without altering signed
  bytes. Publication, exact-wrapper deployment/recovery and live language
  acceptance remain pending. See [localization](LOCALIZATION.md).

## Evidence: C15

- Mapping is default-off, uses only asymmetrically verified ID-token claims and
  exact bounded configuration, and retains issuer/subject identity. Enabling or
  changing policy revokes managed credentials; missing/nonmatching claims demote,
  malformed claims deny login and commit existing-account demotion. Grant expiry
  is bounded by signed issuance/expiry and the configured maximum age.
- An explicitly configured, verified local recovery administrator is required
  and protected against binding, ban and deletion. Mapped administrators cannot
  create unmanaged ADMIN accounts. Sessions, scoped/legacy API keys, current-role
  checks and open event streams observe revocation. Used migration state refuses
  downgrade; disabling mapping does not restore removed privileges.
- Full offline combined regression passed, including legacy-off OIDC behavior.
  Real code/PKCE fixtures passed with RS256, PS256, ES256 and EdDSA. PostgreSQL and
  MySQL checks passed migration, role transitions, revocation races and recovery
  protections. Final canonical recovery-ID template formatting was additionally
  checked in all three locales and the focused RSA suite.
- Chromium passed 18 English/French/Spanish light/dark layouts at 1440/390/320px,
  real local-login clicks and native locale-form Origin/303 checks, with screenshot
  review, no overflow, no external requests and no JavaScript errors. The read-only
  diagnostics reveal neither tokens nor configured group values.
- Parent checkout, QR files and package `.47` are unchanged. Real provider/WAF
  claims and logout, operator-tested recovery credentials, backup/restore, native
  Safari/Firefox, physical assistive technology and custom templates remain
  separate acceptance gates. See [mapping and recovery](OIDC-SECURITY.md#optional-administrator-mapping-c15).

## Evidence: C20

- Authenticated range analytics reuses the 177 bundled country shapes and the
  existing authorized country aggregates. No new API, external map service,
  visitor-location lookup or analytics write was added. Legacy stats is unchanged.
- Country details support hover, click, roving keyboard focus and a native
  selector, with a linked paginated country table. Counts and report-total shares
  are localized in English/French/Spanish; names use `Intl.DisplayNames`.
  Unknown/unmapped values stay in the table. Selection never changes filters.
- Full combined container regression, focused geography/analytics tests and
  catalog/template checks passed. Chromium passed 18 light/dark layouts across
  1440/390/320px and all three locales, including stale/empty/error states,
  keyboard interaction, hostile text, zero external traffic and unchanged visits.
  The existing English analytics browser filter/export workflow passed too.
- Screenshot review and native Tab tests found and corrected inherited masthead
  spacing and an implicit extra SVG tab stop. Geometry, API/routes, QR files and
  package `.47` remain unchanged. No parent checkout files were edited.
- Physical devices, Safari/Firefox, assistive technology, custom layouts and
  live release/deployment acceptance remain separate gates. See
  [analytics geography](ANALYTICS.md#geography-c20).
