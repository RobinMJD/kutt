# UI/UX Improvements And Validation

This contribution contains the reusable fixes from a desktop/mobile review of
the managed-link workflows. The fork's `main` branch retains the chronological
operator ledger and captured evidence; deployment-specific screenshots are not
part of this upstream changeset. This document is not a claim of exhaustive
accessibility conformance.

## Behavior Changes

| Area | Improvement | Main regression |
| --- | --- | --- |
| Editing | Unchanged relative expiry no longer extends a link; explicit stale changes require conflict review | `expiry-edit.cjs`, `browser-expiry-edit.cjs` |
| Collaboration | Signed edit revisions prevent concurrent availability loss; non-secret drafts survive validation/conflicts | `workspace-edit.cjs`, `browser-workspace-edit.cjs` |
| Admin editing | Preserve actual owner/domain context on success and errors; use the correct authorized editor | `admin-edit.cjs`, `browser-admin-edit.cjs` |
| Keyboard | Named icon actions, native tabs, visible focus and focus restoration after updates | `accessibility.cjs`, `browser-accessibility.cjs` |
| Responsive layout | Usable table action regions and content-sized headings at compact sizes and real browser zoom | `browser-tables.cjs`, `browser-table-zoom.cjs`, `browser-headings.cjs` |
| Dialogs | Names, focus containment/return, background isolation, cancellation and stale-response suppression | `dialogs.cjs`, `browser-dialogs.cjs` |
| Library | Accurate availability labels and signed, user-bound bulk-action result notices | `library-ux.cjs`, `browser-library.cjs` |
| Forms | Local named errors, correction focus, independent drafts and pending-action guards | `validation.cjs`, `browser-validation.cjs` |
| Import | Downloadable CSV/JSON examples, actionable row errors and preserved authorization | `transfer.cjs`, `browser-transfer.cjs` |
| Authentication | Labels reflect enabled registration/login; successful browser login navigates once, without duplicate HTMX/table setup | `login-copy.cjs`, `login-navigation.cjs`, corresponding browser suites |
| Webhooks | Save errors remain visible by the relevant form | `webhooks.cjs`, `browser-webhook-errors.cjs` |
| Webhook clipboard | Local confirmation and fixed-width Copy/Copying/Copied states; bounded failure handling and stale-copy suppression after dismissal/rotation | `webhooks.cjs`, `browser-webhook-copy.cjs` |
| Contrast | Readable text, error, placeholder and control colors | `contrast.cjs`, `browser-contrast.cjs` |
| Clipboard | Success follows the resolved write; denial/unsupported cases offer selectable text | `copy.cjs`, `browser-copy.cjs` |
| One-time tokens | Masked responsive field; explicit reveal/copy/hide; failure does not auto-reveal; lifecycle cleanup and stale callback protection | `token-secret.cjs`, `browser-copy.cjs` |
| Session recovery | Logout uses full document navigation instead of delayed body replacement; no duplicate scripts on revoked-page/background requests | `login-navigation.cjs`, `browser-logout-navigation.cjs` |
| API feedback | Validate status, content type and consumed schema before claiming success or replacing saved state | `responses.cjs`, `browser-responses.cjs` |
| Recipients | Accessible branded 410 pages with a neutral next step, without private destination or lifecycle details | `unavailable.cjs`, `browser-unavailable.cjs` |
| Header | Deliberate wrapping of brand/account actions and separate account-security content heading | `header.cjs`, `browser-header.cjs` |
| Domain ownership | Signed, user-bound DNS TXT challenge, preserved draft and visible Copy feedback at desktop/mobile widths | `security-boundaries.cjs`, `security-database.cjs`, `browser-domain-proof.cjs` |
| Moderation | A full webhook queue cannot veto administrator ban/trash; notification omission is explicit in history | `security-boundaries.cjs`, `browser-domain-proof.cjs` |

## Compatibility And Security

- Existing links, users and signing/encryption keys are retained. The additive
  security migration retires pre-upgrade pending recovery links and adds durable
  webhook admission state; see [DEPLOYMENT.md](DEPLOYMENT.md).
- Public redirects remain unauthenticated and continue to enforce password,
  availability, domain and routing policies. Management remains authenticated.
- Edit receipts detect conflicts; they do not replace fresh ownership, workspace
  membership, token scope/domain or CSRF checks.
- Password drafts are never echoed. A failed password edit requires re-entry.
- One-time API tokens are masked initially and when the tab becomes hidden.
  Dismissal, page exit and HTMX removal clear the displayed value and attribute;
  these controls do not revoke the credential or clear the system clipboard.
- Browser sign-in returns HTMX `204` with a fixed-root `HX-Redirect`, or native
  HTML `303` to `/`. JSON login keeps its existing contract. OIDC code/state/PKCE,
  identity binding, cookie and revocation checks remain in place.
- Logout clears the cookie and uses the same fixed-root HTMX/native navigation
  contract with no-store caching. Browser tests wait for the final login form,
  not network idle on an intermediate page before its delayed request occurs.
- Unavailable HTML GET/HEAD uses the new 410 page. HEAD remains bodyless; existing
  API/default/protected POST response contracts and counters are unchanged.
- CSS is scoped to application surfaces; real mobile wrapping and action hit
  regions are tested rather than relying only on document scroll width.

## Reproduction

See [tests/README.md](../tests/README.md) for full isolated container and Redis
regressions and each rendered fixture. Rendered tests refuse initialized or
non-loopback instances, use synthetic records and fresh browser profiles, and
retain screenshots in an explicit external evidence directory. Never use a
production database or personal browser profile for these suites.

Responsive coverage includes 320/390/768/1440px, long titles/URLs, admin/ordinary/
signed-out roles, keyboard workflows and actual 200/400% Chromium tab zoom.
The heading test waits for font loading and breakpoint transitions before strict
geometry comparisons; it does not change layout tolerances or disable animation
to hide a failure. Fault-injection suites exercise malformed successes, denial,
network errors, delayed requests and retry without accepting false saved state.

The full runtime and exact deployed-image regressions passed for release
`v3.2.6-sr94.39.2`, including local webhook clipboard feedback and stale-asset
regressions at 1440/390/320px. Existing-browser resource inspection confirmed the
corrected script and styling after ordinary reload and SSO recovery. Earlier
nine logout/revoked-page/revoked-background-request browser cases remain covered.
Public route/security checks, monitored health
and pre/post off-host writable recovery also passed. Deployment/recovery evidence belongs to the fork operator
ledger and is not a substitute for validating a different installation.

Fresh native Chromium print preview also rendered the actual QR page as one
complete page with the QR/caption, enabled Save and working Cancel. Independent
decoding of the captured preview recovered the expected synthetic short URL.
The earlier plain-page preview failure did not reproduce in fresh profiles;
no application change or root-cause claim was needed for this acceptance.

## Remaining Acceptance Limits

The one-time token fix is included in `.37.1`. The earlier `.37` publication was
not deployed after a fresh image scan identified vulnerable system zlib. The
runtime Dockerfile removes its unused package-manager dependency chain after
building dependencies, explicitly retains CA/TLS support and runs
`tests/image-hardening.cjs`. Keep package inventory intact and rebuild images
instead of installing packages at runtime. Both `.37.1` and `.38` passed their
publication, exact-image, deployment and recovery gates. All 25 confirmed UI
defects through `.39.2` are closed; this does not waive the human acceptance limits below.
The subsequent live credential ceremony exposed a 25th finding: webhook Copy
confirmed success only at the distant page header. The `.39` patch moves feedback
beside the secret and into the button, reports success only after clipboard
completion, handles denial/missing/timeout without raw error details, and ignores
callbacks for a dismissed or replaced secret. Source-rendered 1440/390/320px
regressions pass. No credential, authorization, WAF, schema or delivery policy changes.

`.39` passed clean-browser, runtime and live API/health checks, but the existing
live browser retained old unversioned JavaScript/CSS beside the new HTML. The
`.39.2` release versions this page's two assets using the installed package
version. Regression intercepts stale unversioned paths and requires both release
keys before exercising the normal copy flow. No cache purge or policy weakening.
Existing-browser loaded-resource validation, release/exact-image tests, deployed
public routes, monitored health and pre/post off-host writable recovery passed.
The `.39.1` image was not published or deployed: CI caught a raw-HTML assertion
expecting an unescaped equals sign. `.39.2` uses Handlebars escaping in that
assertion, retaining the same exact-version contract and unchanged markup.

- Native preview rendering passed separately from programmatic PDF checks.
  Physical printing and native file-save dialog completion are not claimed.
- Account-holder token creation/copy/revocation, webhook rotation/copy and
  explicitly approved disposable-only irreversible deletions passed separately
  from synthetic API checks on September 19.
- Physical QR scanning passed with account-holder confirmation that the public
  destination opened without SSO. Naturally expired live Authentik session
  recovery also passed on `.38` through ordinary SSO, without browser errors or
  policy changes. User-assisted real session revocation and return through SSO
  subsequently passed as separate acceptance on September 19.
- SQLite has executed full feature regression. PostgreSQL 16 and MySQL 8.4 have
  targeted security/concurrency tests, not full feature parity. MariaDB remains
  configuration-only coverage.
- The missing scan identity was resolved. A finalized source scan identified seven
  medium findings addressed in `.40`: webhook admission, atomic claims, DNS proof,
  recovery capability invalidation, verification-login CSRF, legacy-write CSRF
  and URL-regex work. Independent patch review also caught quota-blocked moderation
  and stale Redis principals; both received fixes and regression tests before
  publication. See [SECURITY-MAINTENANCE.md](SECURITY-MAINTENANCE.md). This is a
  bounded review, not an exhaustive vulnerability-free guarantee. Image scanning
and the deployment/restore checks are separate evidence, not substitutes for
source tests. Release `.40` passed full exact-image regression, rendered DNS
proof/copy/persistence and moderation feedback at 1440/390/320px, real public
DNS/WAF ownership proof, HTTPS webhook delivery and Authentik-signed logout/replay.
Pre/post off-host backups were byte-verified and restored with a successful write
test; the original account/link remained unchanged. Monitored health and lab
validation passed. All temporary DNS, app and browser fixtures were removed.

The `.40` runtime source is `1107011e7a8a0ad11b69a8af0f871f7794ad93ef`;
subsequent closure commits change documentation only. Fork release CI
`35416114256` and main CI `35416090059` passed. Published image digest:
`sha256:05b332018c4891a7f2457225dcdadeededcac1a8efbf62ff1c1c06ea201b179f`.
The privately hardened deployed wrapper is distinct and tested separately.
Fresh published/wrapper Grype scans retain zero Critical/High and three Medium
BusyBox matches for CVE-2025-60876, without a vendor fix in the valid September 18
database. None were suppressed. Deployment-specific raw evidence remains private.
