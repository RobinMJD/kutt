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

Current checkpoint: `.57` is deployed healthy; its public community18, C16 smoke3,
full public API/real OIDC, post-health/lab and writable-recovery gates passed.
Visual review nevertheless confirmed low-contrast analytics exports. The narrow
`.58` correction passed focused local checks but still needs release validation.
The seven pending entries below remain pending until the
[.58 gates](#candidate-58-analytics-export-contrast) are explicitly completed.
`.56` and `.57` remain preceding functional evidence, not separate accepted
GitHub releases. Green CI or partial gates do not establish final acceptance.

## Work List

| ID | Scope | State | Publication / deployment evidence |
| --- | --- | --- | --- |
| C01 | Safari analytics classification | Complete | `.41`; evidence below |
| C02 | Prefix-only hostname normalization | Complete | `.41`; evidence below |
| C03 | Transactional, reversible administrative moderation and session safety | Complete | `.45`; evidence below |
| C04 | Strict peer/CIDR/hop reverse-proxy trust | Complete | `.42`; evidence below |
| C05 | Compatible staged and enforced Content Security Policy | Implemented; release gates pending | `.56` full public matrices and `.57` enforced community18/C16 smoke3 passed; `.58` closure pending; see `CSP.md` |
| C06 | MySQL utf8mb4 search compatibility and real database tests | Complete | `.42`; evidence below |
| C07 | Verified remote database TLS and credential-file configuration | Complete | `.43`; evidence below |
| C08 | Consistent verified Redis TLS for cache, queues and limiting | Complete | `.43`; evidence below |
| C09 | Configurable asymmetric OIDC signing algorithm | Complete | `.42`; evidence below |
| C10 | Custom-domain API routing without homepage interception | Complete | `.42`; evidence below |
| C11 | Complete English (default), French and Spanish localization | Complete | `.49`; 198 source layouts, 18 public layouts, authenticated locale/API, CI/wrapper, restore and stable health gates passed; see `LOCALIZATION.md` |
| C12 | Stable allowlisted sorting in personal, admin and workspace tables/API | Complete | `.44`; evidence below |
| C13 | Branded QR logos embedded in validated PNG/SVG exports | Implemented; release gates pending | Bounded PNG validation/decoding and `.57` public enforced community18 passed; `.58` closure pending; see `QR-BRANDING.md` |
| C14 | Accessible dark/system/light theme | Complete | `.47`; full source/wrapper regression, 90 layouts, public theme selection, WAF/SSO and backup/restore gates passed; evidence below |
| C15 | Optional explicit OIDC role mapping and safe demotion/recovery | Implemented; release gates pending | Isolated role/session/write-race gates passed; live mapping remains disabled; `.58` closure pending; see `OIDC-SECURITY.md` |
| C16 | Optional separate management hostname and explicit shared-domain grants | Implemented; release gates pending | Real SQL/isolated split-host checks, both `.56` public 18-layout matrices and `.57` public smoke3 passed; `.58` closure pending; see `DOMAIN-SHARING.md` |
| C17 | Optional consistent destination-domain policy | Implemented; release gates pending | Source edit/race checks and `.57` public policy views passed; live restrictions remain disabled; `.58` closure pending |
| C18 | Private authenticated performance metrics with bounded labels | Complete | `.48`; source/wrapper/CI, private Prometheus scrapes, WAF/SSO, backup/restore and stable health gates passed |
| C19 | Safe dotted aliases with reserved-path protections | Complete | `.46`; [rules and tests](LINK-ALIASES.md), evidence below |
| C20 | Accessible interactive geography chart and text alternative | Implemented; release gates pending | `.57` copy/rendered checks and public community18, including denominator assertions and screenshot review, passed; final release gates pending; see `ANALYTICS.md` |
| C21 | Profile visit aggregation; safely batch only where warranted | Implemented; release gates pending | Indexed synchronous SQLite lookup, real SQL and rollback checks passed; `.58` closure pending; see `VISIT-PERFORMANCE.md` |

## Evidence: C14

- Published/deployed `.47`, source `741cece`; main/tag CI `35680493811` /
  `35680493815` and full exact-wrapper regression passed. Fresh valid Grype
  scan: zero Critical/High. No new secret, schema, WAF or SSO change.
- Rendered tests cover 15 routes at 1440/390/320px in both themes, keyboard,
  media preference, cross-tab persistence, storage denial, text contrast, chart
  pixels and printing. Public HTTPS login passed all three theme modes and
  reload persistence at all widths; this is Chromium evidence, not physical
  Safari/mobile-device acceptance.
- Preference initializes before styles, follows the OS only in System mode,
  synchronizes tabs and retains an in-memory choice if storage is unavailable.
  Screenshot review corrected tiled select arrows and low-contrast legacy
  icons. Static assets resolve relative to the application, preserving custom
  precedence and isolated-start compatibility. See [appearance](THEMES.md).
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

This review and final accepted-release publication are **pending**. Completed
`.56` public evidence is retained below; it is not relabeled as `.57` coverage.
The actual upstream PR remains at its earlier head until a separately authorized
update after acceptance.

## Superseded Candidates: .50 / .51 / .52 / .53 / .54 / .55

Release `.50` (`8b9afa3`) passed source/tag CI, exact-wrapper regression and a
valid image scan with zero Critical/High findings. Its pre-release local/NAS
backup (`b5a7b669` / `b2b20178`, 05:05:28 UTC) passed byte verification and
writable recovery with both the previous and candidate images. The first live
report-only CSP browser gate then found BunkerWeb rejecting branded QR requests:
the JSON logo's `data:image/png;base64,...` URI triggered several CRS injection
rules. Local tests had not exercised that external WAF response.

The deployment was rolled back to the exact `.49` image and configuration,
preserving the database and secrets; original records, integrity and foreign
keys were verified unchanged. WAF/SSO/TLS were not weakened. `.50` is not an
accepted deployment. `.51` (`d6ae152`) added domain sharing but was superseded
before deployment; its release CI was deliberately cancelled rather than
publishing another candidate with the known upload issue. Immutable tags remain
available for evidence. The corrected candidate must repeat all live gates.

Private evidence is retained under `2026-09-22-kutt-community-50`, including
the failed public browser check and rollback. No completed feature is inferred
from these candidate publications.

Candidate `.52` (`247f142`) corrected the browser logo transport and passed the
full isolated suite and real-database CI gates. It was not deployed: final
rendered review caught clipping in the token-domain selector and the expanded
browser run stopped at the DNS ownership fixture. Its CI was deliberately
cancelled before publication. The next candidate shortens the three translated
labels and measures the rendered selected text, including compact controls;
the new assertion fails against `.52`. A fresh `.53` pre-change local/NAS
backup (`76081583` / `f51935b8`, 06:12:21 UTC) passed 71-file byte verification
and writable `.49` recovery. These checks are not final deployment acceptance.

The DNS fixture exposed a genuine fast-submit HTMX initialization race, fixed
by scoped zero-settle swaps; it was not an administrator DNS-proof bypass.
An independent deterministic interleaving also reproduced a grant-list read
that could combine old-owner authorization with new-owner recipients during
reassignment. The rare management read now uses the existing guarded
transaction, with the same lock order as writes; public redirects do not acquire
that guard. Red/green regressions, SQLite/MySQL/PostgreSQL domain-grant suites,
security-boundary tests and repeated desktop/mobile DNS workflows passed.

Candidate `.53` (`5c88b9c`) passed main/tag CI (`35694447199` /
`35694447602`), the independent contribution CI (`35695069305`), the complete
exact-wrapper regression, a fresh valid image scan (zero Critical/High) and a
writable candidate restore. Its public report-only gate and all 18 enforced-CSP
language/theme/viewport QR, policy and geography layouts passed. The first
domain-sharing browser layout then found Cloudflare rewriting a recipient email
and injecting its non-nonced decoder script. Strict CSP correctly rejected that
script; this was not an application permission failure or a WAF bypass request.

The disposable users, domain and link were removed. Guarded rollback verified
the new authorization tables were empty, restored the exact `.49` image/config,
and verified the original records, integrity and foreign keys. `.53` is not an
accepted release. The fix must prevent proxy rewriting of CSP-rendered HTML,
including fragments, without allowing additional scripts or relaxing WAF/SSO.
Repeat live browser, health and recovery gates on the next immutable candidate.
Private evidence: `2026-09-22-kutt-community-53` and
`Work/kutt-community-20260922/public-domain-grants-140fb8bdcc68`.

Candidate `.54` adds `Cache-Control: private, no-store, no-transform` to
rendered HTML in active CSP modes, including HTMX/API fragments and errors.
Nine real rendered HTTP cases reproduced the missing protection before the
patch; focused red/green tests now pass while off-mode, JSON, static assets,
redirects and QR attachment headers remain unchanged. Full-document nonces and
script permissions are unchanged. Publication and live gates remain pending;
this focused result is not deployment acceptance.

The final bounded review of `.54` reproduced a separate authorization race:
an OIDC-mapped administrator's grant could expire after request authentication,
yet an in-flight cross-owner link edit still committed. Release and contribution
CI were cancelled before image publication or deployment. Live `.49` remains
unchanged with role mapping disabled. Candidate `.55` must check current owner or
administrator authority inside the guarded write transaction and reproduce the
expiry boundary in both edit routes before repeating all release gates.

The fix also covers the affected delete path. Real HTTP fixtures under both API
prefixes deterministically change expiry, role or session version between route
authentication and the guarded mutation; rejected writes leave link/history
unchanged. Red/green SQLite, MySQL and PostgreSQL checks and mapping-off controls
passed. Ordinary owners, granted-domain creators and workspace collaborators
retain their existing rights. These regressions are included in automated CI;
candidate `.55` still requires full publication and deployment acceptance.

Candidate `.55` (`6c16e8b`) passed main/tag/contribution CI, the complete hardened
container regression, zero-Critical/High image scanning, verified pre-change
local/NAS recovery and a writable candidate restore. Its public QR/policy/map
report-only check passed; domain granting and recipient creation also passed
without the former Cloudflare CSP violation. The new recipient-analytics visual
gate then found the selected domain clipped by a narrow filter column.

The disposable fixtures were removed and guarded rollback restored exact `.49`
configuration/image without changing original records or secrets. `.55` is not
an accepted deployment. The next candidate must make analytics filter selection
readable at desktop and compact widths, cover that flow before/after grant
revocation offline, then repeat the public and recovery gates. Private evidence:
`2026-09-22-kutt-community-55` and
`Work/kutt-community-20260922/public-domain-grants-de5b6161e6c5`.

## Verified Candidate .56

Candidate `.56` (`2377f506569d25797834d433fdb8b86e19a9a0e5`) gives analytics
domain/tag selectors a dedicated, wider desktop row and full-width mobile
controls. Values too long for a native selector are
also displayed as associated, wrapping text below it, never just a tooltip.
Red/green rendered checks reproduce `.55` clipping and cover common and maximum
length names, hostile text escaping, keyboard selection, Apply/reload/Clear and
creator-only analytics before and after domain-grant revocation. All 18 translated
theme/viewport combinations and the existing analytics/browser suite passed.
Its full source/main/tag/contribution CI, hardened-wrapper regression, scan and
pre-change/candidate recovery checks passed. It is verified functional candidate
evidence for the final `.57` follow-up, not a separate accepted GitHub release.

- Public report-only C16 passed all 18 EN/FR/ES, light/dark, 1440/390/320 layouts,
  with 6,877 requests and complete disposable-fixture cleanup.
- The enforced public community rerun passed all 18 QR/policy/geography layouts:
  1,494 browser requests/responses/completions, 132 completed drains, and no
  recorded network failures, CSP violations or JavaScript errors. Its fixture
  was removed.
- Enforced public C16 completed all 18 layouts at 13:06:43 UTC on September 22,
  with 6,877 requests, no JavaScript/CSP errors and cleanup of two users, one
  domain and 19 links. Native grant/cancel/confirm, creator-only analytics,
  revoked mutations/tokens and regrant behavior passed. These are synthetic
  shared-domain workflows, not real split-host DNS/IdP cutover acceptance.
- Public HTTP/API and real Authentik-signed logout/replay checks passed. After
  browser cleanup, original records were unchanged, integrity/FKs passed, and
  two health samples 65 seconds apart showed three probes and zero restarts,
  alerts, failed units or unhealthy containers. Whole-lab validation passed.
  Deployed wrapper ID:
  `sha256:9c593cdfcaa879eb6490512d67d8ec0e22caf838bc198ec5c5ea74b0711bbe9b`.

Private evidence: `Work/kutt-community-20260922/live56-enforce-rerun.log`,
`public-community56-enforce-rerun/network.jsonl`,
`live56-domain-grants-report-only.log`, `live56-domain-grants-enforce.log`,
`public-domain-grants-d64dc1383d90/receipt.json` and `postbrowser56.log`.

### First Enforced Run And Retest

The first `.56` enforced community run timed out waiting for HTMX/localization
on Spanish/dark/390 analytics; its screenshot showed incomplete assets. Its
fixture was cleaned. Request-level diagnostics were absent, so the triggering
cause remains **unproven**. A transient route/connection or harness failure is
a hypothesis, not a confirmed production regression or WAF block.

A pure fake-task test reproduced an external Work-runner defect: one rejected
route task poisoned its promise chain and prevented later tasks from running.
The runner now recovers scheduling but keeps failures fatal, drains fonts/network/
queue activity between transitions and records sanitized path/status diagnostics.
All assertions were retained; there are no automatic WAF/network retries.
The successful fresh 18-layout rerun is not retrospective proof that this defect
caused the original timeout. Application code, CSP and edge controls were not
changed for this repair. The original log/screenshot and offline red/green proof
remain under `Work/kutt-community-20260922`, alongside the successful rerun.

## Candidate .57: Copy-Only Follow-Up

The `.57` source is `5a82edcbcfa842101ca08abfa657d4e989c35ac6`, tag
`v3.2.6-sr94.57`. Application logic, schema, dependencies and hardened policy
configuration are unchanged from `.56`; the follow-up changes 16 catalog values,
version metadata and focused regression assertions. All three catalogs retain
1,519 keys and the same placeholder contracts. English is unchanged; 15 Spanish
values and one French value improve formal management prompts, moderation entity
wording and geography percentage explanations.

- Main CI [35729518615](https://github.com/RobinMJD/kutt/actions/runs/35729518615),
  tag CI [35729518448](https://github.com/RobinMJD/kutt/actions/runs/35729518448),
  contribution CI [35729573223](https://github.com/RobinMJD/kutt/actions/runs/35729573223)
  and signed Shortcut checks passed. Source image digest:
  `sha256:a03e783d174675df31a3b06c7c085e4788a6de801f28511ccc65ff65222c268b`.
  Its valid Grype scan reports zero Critical/High and three Medium BusyBox
  package matches for `CVE-2025-60876`; that scan lists no fixed versions.
  Source-image scanning is distinct from hardened-wrapper and final release
  acceptance; the exact-wrapper progress is recorded below.
- Focused copy red/green, catalog/placeholder/escaped-interpolation and localized
  JSON/HTML HTTP checks passed. Local geography passed 18 language/theme/width
  layouts; moderation and sorting passed EN/FR/ES at 1440/390/320, with screenshots
  reviewed for wrapping and clipping. These are local source checks, not `.57`
  public results. Private evidence: `Work/kutt-community-20260922/copy57-proof`.
- Fresh pre-change backup at 13:28:13 UTC: local `0f2fbfdc`, NAS `94f25caa`.
  All 75 files were byte-verified and writable recovery with prior `.56` passed.
  Private evidence: `Work/kutt-community-20260922/backup57-pre.log`.
- Contribution parity against `.57` passed for 585 files with zero byte/mode
  mismatches under the documented curated/redacted-doc exclusions. Its
  temporary validation branch is not the actual upstream PR, which remains at
  `e0ad948`.

### Deployed .57 Checkpoint

The exact hardened wrapper passed full container regression and candidate
writable restore, and is deployed healthy with zero restarts:
`sha256:5da46d1488092a6022e5fe857213edaf7ef96f0da3e5233e1aec9dc8099b1fe7`.
These passes alone do not establish final release acceptance.

The first `.57` public community run passed 3/18 layouts before explicit local
Mac `ERR_NETWORK_CHANGED` and `ERR_INTERNET_DISCONNECTED` asset failures stopped
it. Its fixture was cleaned; the service remained healthy and a public curl
check returned HTTP 302. This is recorded as a client connectivity interruption,
not an application regression or WAF failure. A fresh full public run subsequently
passed, as recorded below; the interrupted run is retained as evidence in
`Work/kutt-community-20260922/live57-enforce.log` and
`Work/kutt-community-20260922/public-community57-enforce/failure-network.json`.
The `.56` first-run cause remains separately unproven.

### Public .57 Browser Follow-Up

- The fresh enforced public community run passed all 18 EN/FR/ES, light/dark,
  1440/390/320 layouts, with no JavaScript, CSP or network errors. QR exports
  decoded correctly; geography denominator assertions and screenshot review
  passed. Evidence: `Work/kutt-community-20260922/live57-enforce-rerun.log` and
  `Work/kutt-community-20260922/public-community57-enforce-rerun`.
- The explicit C16 smoke matrix passed all three EN/FR/ES dark/390 layouts with
  every per-layout workflow/auth assertion retained: 1,147 requests and cleanup
  of two users, one domain and four links. The parent reviewed Spanish analytics
  and the earlier French confirmation screenshot. Evidence:
  `Work/kutt-community-20260922/live57-domain-grants-smoke.log` and
  `Work/kutt-community-20260922/public-domain-grants-6a162642447e/receipt.json`.
  This is `.57` smoke3, not another full C16 matrix; `.56` supplies full18 evidence.

Full public API regression for existing/new features and fixture cleanup passed,
as did real Authentik-signed logout/replay. Original records were unchanged;
integrity/FKs passed. Two health samples 65 seconds apart showed healthy state,
zero restarts/alerts/failed units/unhealthy containers and three fresh probes.
Whole-lab validation passed with its existing environment warnings. Evidence:
`Work/kutt-community-20260922/postvalidate57.log` and
`Work/kutt-community-20260922/final57-browser-health-passed.json`.

Post-change backup at 14:16:38 UTC on September 22: local `6d2d3904`, NAS
`38e3ef87`. All 75 files and writable restore passed; the pre-change backup was
13:28:13 UTC. Evidence: `Work/kutt-community-20260922/backup57-post.log`.
These records establish preceding functional/recovery proof, not release closure:
the confirmed export-contrast defect requires the `.58` follow-up below.

### Recorded .57 Gates

| Gate | Current status |
| --- | --- |
| Final hardened-wrapper full regression and exact candidate writable restore | **Passed** |
| Exact `.57` deployment with the hardened configuration and CSP enforced | **Deployed; healthy, zero restarts**; final acceptance remains pending |
| Public community QR/policy/geography matrix | **Passed: fresh 18-layout run**, EN/FR/ES, light/dark, 1440/390/320; QR decoding, denominator assertions and screenshot review passed; no JavaScript/CSP/network errors |
| Public C16 post-copy smoke | **Passed: 3 layouts**, EN/FR/ES, dark, 390px only; 1,147 requests, cleanup two users/one domain/four links; every per-layout workflow/auth assertion retained; not a `.57` full-18 claim |
| Full public HTTP/API/SSO regression and its fixture cleanup | **Passed**, including real Authentik-signed logout/replay |
| Post-change original-data/integrity/FK checks, stable health and lab validation | **Passed**; two samples 65 seconds apart, three probes and zero restarts/alerts; existing lab environment warnings retained |
| Fresh post-change local/NAS backup, byte verification and writable restore | **Passed**; 75 files, local `6d2d3904`, NAS `38e3ef87`, 14:16:38 UTC |
| Final feature closure, accepted GitHub release and actual PR update | **Not closed: .58 UI correction and acceptance required** |

Keep `.56` full public C16 coverage distinct from the passed `.57` three-layout
smoke complement and `.57` full automated CI. Smoke receipts record the selected
matrix, explicit expected layouts/count and actual completed list/count; they
must not be summarized as a full matrix.

Application defaults remain unchanged: CSP defaults to `off`; this installation
explicitly selected `enforce`. Management origin remains unset, live OIDC role
mapping and destination restrictions remain disabled, and domain sharing requires
explicit grants. No new DNS, certificate, IdP callback or global domain sharing
is implied. Preserve database and original secrets together, prefer fix-forward,
contain outbound workers during isolated recovery, and never downgrade used
authorization state or revive revoked credentials. Historical `.49` rollbacks
were individually guarded recoveries, not general downgrade authorization.

## Candidate .58: Analytics Export Contrast

Visual review of `.57` Spanish/dark/390 recipient analytics found a real UI
defect despite passing functional assertions: CSV/JSON export anchors inherited
near-white text over a hardcoded pale background. The unchanged source fails a
new rendered assertion at **1.092:1** text contrast, below the 4.5:1 requirement.
This is distinct from the earlier local network interruption, not a WAF incident.

The runtime change adds the existing `button` class to the two export anchors.
One scoped CSS rule preserves their 18px current-color icons without inheriting
the general button rule's white stroke/margin. URLs, localized titles, filenames,
download behavior, CSV/JSON formats, authorization and all application logic are
unchanged. There are no catalog, dependency, schema or policy changes.

- Contribution runtime/test commit: `54cc6b14d681305ed55f4d103d01f472ccfd6248`.
  Separate version-only commit: `d8a92cd5126be8339d04d167d75a425c2fce5cc2`.
- Focused regular Playwright checks passed all 18 EN/FR/ES, light/dark,
  1440/390/320 layouts under enforced CSP: 108 normal/hover/focus contrast
  measurements and 36 actual keyboard-triggered CSV/JSON downloads. Ratios are
  **7.891:1 light** and **9.883:1 dark**. Filters, report content, localized titles,
  download filenames, icons and existing geography/error/stale-response checks
  passed. Compact screenshots were inspected. Browser plugin was unavailable.
- Private red/green proof: `Work/kutt-community-20260922/export58-red.log` and
  `Work/kutt-community-20260922/export58-proof`. Tests use disposable loopback
  containers; no public acceptance is inferred from them.

### Pending .58 Gates

| Gate | Current status |
| --- | --- |
| Immutable source/tag CI and contribution validation | **Pending** |
| Exact hardened wrapper, valid image scan, full regression and candidate writable restore | **Pending** |
| Fresh pre-change local/NAS backup and verified recovery | **Pending** |
| Exact `.58` deployment with unchanged hardened configuration | **Pending**; live remains healthy `.57` |
| Enhanced public community matrix | **Pending: 18 layouts**, including export contrast and actual CSV/JSON downloads |
| Post-change original-data/integrity/FK, stable health and lab validation | **Pending** |
| Fresh post-change local/NAS backup and verified writable restore | **Pending** |
| Seven feature closures, accepted release, final docs reconciliation and actual upstream PR update | **Pending; not authorized by focused local tests** |

Coverage stays explicit: `.56` supplies full public C16 matrices, `.57` supplies
C16 smoke3 plus full public API/real OIDC and functional/recovery checks, and
`.58` requires its own enhanced public community18 and release gates. The narrow
HTML/CSS change does not imply a `.58` rerun of all preceding API/C16 coverage;
reuse of that functional evidence is recorded as preceding-version proof, not
relabeled as a new run. No feature is marked complete until final acceptance.

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
  private collector integration, recoverable deployment and live acceptance
  passed as recorded above. See [metrics](METRICS.md).

## Evidence: C11

- Deployed `.49` (`4e787b0`); main/tag CI `35684020728` / `35684020727`,
  exact-wrapper regression and valid Grype scan (zero Critical/High) passed.
  Public HTTPS native language selection passed 18 EN/FR/ES light/dark layouts
  at 1440/390/320px. Authenticated localization, stable API identifiers, secure
  preference cookies, English fallback, existing feature regression and real
  Authentik-signed logout/replay passed. Original records/integrity/FKs are intact.
- Pre local/NAS `6f9c9b9d` / `f9e10035` (04:35:02 UTC, 69 files) and post
  `1e2766ef` / `d7b2169f` (04:50:11 UTC, 71 files, September 22) passed byte
  verification and exact-image writable SQLite recovery. No USB SSD claim.
  Wrapper `sha256:df68249b8512e3adcf5f13fdfa15a1376af0dc3f8fff6e41de0e8c22a49afce1`.
  Private report `2026-09-22-kutt-community-49` retains a first failed health
  sample caused by shared probe DNS latency (8.004s versus 0.007s from Synology;
  application processing 0.092s). Three subsequent samples 65s apart passed with
  three fresh probes, zero restarts/scoped alerts/failed units/unhealthy
  containers. Lab configuration validation passed without changing thresholds.
  The shared-resolver incident and unrelated lab alerts are not claimed fixed.
- Release `.49` integrates 1,442 stable keys in each English/French/Spanish
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
  acceptance passed as recorded above. See [localization](LOCALIZATION.md).

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
- These changes are integrated in the combined source. Live deployment keeps
  role mapping disabled; enabling it requires operator-tested recovery access
  and a matching identity-provider claim policy. Release/deployment gates are
  tracked separately above. Native Safari/Firefox, physical assistive technology
  and custom templates remain unverified. See
  [mapping and recovery](OIDC-SECURITY.md#optional-administrator-mapping-c15).

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
  spacing and an implicit extra SVG tab stop. Geometry and API routes remain
  unchanged. The changes are integrated in the combined source.
- Physical devices, Safari/Firefox, assistive technology, custom layouts and
  live release/deployment acceptance remain separate gates. See
  [analytics geography](ANALYTICS.md#geography-c20).
