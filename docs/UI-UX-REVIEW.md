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
| Contrast | Readable text, error, placeholder and control colors | `contrast.cjs`, `browser-contrast.cjs` |
| Clipboard | Success follows the resolved write; denial/unsupported cases offer selectable text | `copy.cjs`, `browser-copy.cjs` |
| API feedback | Validate status, content type and consumed schema before claiming success or replacing saved state | `responses.cjs`, `browser-responses.cjs` |
| Recipients | Accessible branded 410 pages with a neutral next step, without private destination or lifecycle details | `unavailable.cjs`, `browser-unavailable.cjs` |
| Header | Deliberate wrapping of brand/account actions and separate account-security content heading | `header.cjs`, `browser-header.cjs` |

## Compatibility And Security

- Existing links, users, signing/encryption keys and database schemas are retained.
- Public redirects remain unauthenticated and continue to enforce password,
  availability, domain and routing policies. Management remains authenticated.
- Edit receipts detect conflicts; they do not replace fresh ownership, workspace
  membership, token scope/domain or CSRF checks.
- Password drafts are never echoed. A failed password edit requires re-entry.
- Browser sign-in returns HTMX `204` with a fixed-root `HX-Redirect`, or native
  HTML `303` to `/`. JSON login keeps its existing contract. OIDC code/state/PKCE,
  identity binding, cookie and revocation checks remain in place.
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
`v3.2.6-sr94.36.1`. Deployment/recovery evidence belongs to the fork operator
ledger and is not a substitute for validating a different installation.

Fresh native Chromium print preview also rendered the actual QR page as one
complete page with the QR/caption, enabled Save and working Cancel. Independent
decoding of the captured preview recovered the expected synthetic short URL.
The earlier plain-page preview failure did not reproduce in fresh profiles;
no application change or root-cause claim was needed for this acceptance.

## Remaining Acceptance Limits

- Native preview rendering passed separately from programmatic PDF checks.
  Physical printing and native file-save dialog completion are not claimed.
- Credential-creation/rotation and irreversible deletion UI ceremonies retain
  separate user-assisted acceptance. Synthetic API/security tests do not waive it.
- Real Authentik MFA/session recovery and physical QR scanning are user-present
  checks. Synthetic signed-provider tests and decoded pixels are not substitutes.
- SQLite has executed feature regression; PostgreSQL/MariaDB examples are
  configuration-validated, not a full parity claim.
- A bounded source-diff review found no actionable candidates across 124 changed
  source/config/test files. Its security-tool report could not be finalized
  because desktop scan creation issued no identity. No completed scan verdict or
  exhaustive vulnerability-free claim is made. Image scanning is a separate gate.
