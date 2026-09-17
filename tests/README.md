# Container smoke test

Build from a clean checkout without a `.env` file:

```sh
docker build -t kutt-smoke .
docker run --rm --network none --entrypoint node kutt-smoke tests/container-smoke.cjs
```

The build needs network access to package registries. The test itself needs no
external services or network access. It creates a temporary SQLite database,
uses randomly generated disposable credentials, starts the application on a
local ephemeral port, then removes its database and stops the child process.
It refuses a checkout containing `.env` and does not inherit database or secret
file settings from its caller. Run only in a disposable build/container.

Coverage:

- Campaign URL parameters: encoded bounds, explicit clears, API aliases,
  idempotency, public/protected/Basic and routing/forwarding precedence,
  import/export, history, restart, owner/admin/scoped/CSRF and workspace roles.
  `tests/browser-campaign.cjs` exercises creation and all editing surfaces on
  desktop/mobile, including delayed disclosure events and unsaved-draft recovery.
- Production migrations on a fresh SQLite database.
- Native SQLite query, close and Node process teardown.
- Initial administrator creation and rejection of a second bootstrap.
- Password authentication.
- Rejection of anonymous link creation and listing.
- Authenticated creation, listing and deletion of a short link.
- Public redirection without credentials, and immediate 410 after moving to trash.
- Token scopes, expiry, revocation, owner bans, legacy key compatibility,
  cross-user access denial, CSRF and explicit credential precedence over cookies.
- Domain-restricted list totals, CRUD and statistics; domain deletion, recreation,
  bans and ownership transfer; fail-closed older-image token format.
- Eight concurrent idempotent creates produce one link, replay survives server
  restart, conflicts return 409, expired records are reusable, and failed
  creations roll back their reservations. Stored records contain no raw secrets.
- Populated schema downgrade refusal and separate empty-database down/up.
- Lifecycle validation, owner/domain/CSRF checks, concurrent visit caps, password
  flows, HEAD and info semantics, restart persistence, retained expired records
  and guarded policy schema rollback.
- History/trash/restore, retained policies, secret-free audit payloads, pagination,
  ownership/domain/scoped-token boundaries, CSRF, concurrent alias claims,
  retired alias protection and domain/account deletion recovery behavior.
- Disposable signed OIDC authorization code/PKCE, stable identities and email
  collision denial, absolute session expiry, logout/replay, private diagnostics,
  session revocation, bans, provider outage recovery and guarded identity migration.

`KUTT_TEST_ONLY=accessibility` validates named controls, selected native tabs,
unique IDs and isolated focus-helper recovery/cleanup without network access.
`tests/browser-accessibility.cjs` uses the same fresh loopback settings and
`KUTT_EVIDENCE_DIR` described below, at 1440/390/320px. It exercises native
keyboard controls, focus after HTMX/native/async updates, concurrent draft focus,
visible outlines/reduced motion, restore confirmation and admin tab pagination.
It does not replace a full assistive-technology or physical-device audit.

`KUTT_TEST_ONLY=dialogs` checks authenticated/admin-only confirmation endpoints,
the shared modal frame and isolated request/focus state transitions. It is part
of the full container suite. `tests/browser-dialogs.cjs` uses a fresh loopback
instance and required evidence directory at 1440/390/320px: native background
isolation, names, initial/restored focus, Tab/Shift+Tab, Escape/cancel, all
personal/admin/domain dialogs, QR, repeated opening, cancelled slow requests,
load/write errors, validation drafts, duplicate-submit prevention, real synthetic
write/retry/trash success and removed-opener recovery. No production data is used.

For rendered lifecycle UI, install Playwright in your test runtime and run
`tests/browser-lifecycle.cjs` with `KUTT_BROWSER_DISPOSABLE=1` and a loopback
`KUTT_TEST_URL` for a fresh disposable instance. `PLAYWRIGHT_MODULE` can point to
an external installation. The test refuses an initialized app, checks desktop
and mobile controls, persists/reloads policies, verifies public redirects and
captures screenshots to `KUTT_EVIDENCE_DIR` (or a fresh temporary directory).

`tests/browser-expiry-edit.cjs` uses the same isolation settings on a fresh instance
and requires `KUTT_EVIDENCE_DIR`. It tests personal/admin expiry intent, conflict
review/retry, sibling draft preservation and paused public redirects at
1440/390/320px. `tests/expiry-edit.cjs` is included in the full container suite;
`KUTT_TEST_ONLY=expiry-edit` runs its focused API/rendered-fragment regression.

`KUTT_TEST_ONLY=admin-edit` tests fresh owner/domain metadata on admin editor
success and errors, non-secret draft retention, anonymous/custom-domain cases,
API privacy, authorization and restart. `tests/browser-admin-edit.cjs` uses the
same disposable loopback settings and evidence path for native admin
save/error/retry/filter/open/close at 1440/390/320px. Table geometry and error
accessibility have separate browser regressions below; programmatic access to
an off-screen row action is not acceptance of the mobile table layout.
No production credentials or records are used.

## UI/UX regression

All focused selectors below also run in the full container suite. They do not
replace that suite or the separate Redis worker test when releasing.

| Focused selector | Contract | Rendered companion |
| --- | --- | --- |
| `library-ux` | Accurate availability and signed bulk-result notices | `browser-library.cjs` |
| `validation` | Named errors, independent drafts and error focus | `browser-validation.cjs`, `browser-oidc-validation.cjs` |
| `login-copy` | Registration/login labels match enabled policies | `browser-login-copy.cjs` |
| `contrast` | Text and control palette assertions | `browser-contrast.cjs` |
| `copy` | Feedback only after clipboard success; usable fallback | `browser-copy.cjs` |
| `responses` | Typed response validation; malformed success must not replace saved state | `browser-responses.cjs` |
| `login-navigation` | One full-document sign-in transition; unchanged JSON/auth boundaries | `browser-login-navigation.cjs` |
| `unavailable` | Branded private-by-default 410 page; unchanged HEAD/API/lifecycle | `browser-unavailable.cjs` |
| `header` | Scoped site header and content-sized account-security heading | `browser-header.cjs` |

Use fresh loopback-only disposable instances and a separate evidence directory
for each rendered suite. `browser-login-navigation.cjs` requires HTTPS loopback
with a test-only certificate. `browser-header.cjs` takes `KUTT_HEADER_FIXTURES`
as a JSON array of exactly three `{ "origin": "http://127.0.0.1:PORT", "name": "Site name" }`
entries matching each fresh instance's configured brand. Never point these
tests at production or reuse a real user's browser profile.

`browser-tables.cjs` covers responsive personal/admin table controls;
`browser-table-zoom.cjs` adds actual 200/400% Chromium zoom and action hit regions.
`browser-headings.cjs` checks 15 content-heading routes, long names, actual zoom,
navigation and unchanged site-header geometry. These zoom tests install a
temporary loopback-scoped extension into a disposable Chromium profile to call
the native tab zoom API. They do not simulate zoom with CSS or pinch scaling.
The heading test waits for fonts and responsive size transitions before strict
layout comparisons, and logs any in-flight height change. Native print preview,
screen-reader behavior and physical QR scanning remain separate acceptance.

`tests/browser-history.cjs` uses the same isolation settings and a separately
fresh instance. It exercises delete confirmation, trash, history, restore and
reload at desktop/mobile sizes, checks public redirects and captures screenshots.

`tests/browser-security.cjs` uses the same isolation settings on a fresh instance
to check desktop/mobile security diagnostics, revoke all sessions, copied-cookie
denial and re-login. The protocol fixture does not require a human IdP login.

This is not a production OIDC provider, SMTP, PostgreSQL or MySQL acceptance test. It does
not demonstrate compatibility with every persisted database or CPU platform.
Take a database backup before upgrading an existing deployment.
# Library regression

`library.cjs` runs with the container smoke suite against disposable data.
`browser-library.cjs` requires a fresh loopback-only instance and
`KUTT_BROWSER_DISPOSABLE=1`, `KUTT_TEST_URL` and an installed Playwright module.
It exercises desktop/mobile organization, selection and bulk actions. Screenshots
go to a temporary evidence directory, not production data or the repository.

# Transfer regression

`transfer.cjs` is part of the isolated container suite. It covers CSV/JSON
round trips, formula escaping, dry-run no-write checks, protected links,
owner/domain/token/CSRF limits, atomic rollback and concurrent/restart replay.
`browser-transfer.cjs` uses the same disposable loopback settings on a fresh
instance for desktop/mobile file selection, preview, confirmation, downloads,
conflict correction and validation errors. It never runs against live data.

## Routing validation

`routing.cjs` runs in the full isolated container suite. `KUTT_TEST_ONLY=routing`
selects its focused fixture for development, never release CI. It verifies
ordered conditions, preview isolation, password/lifecycle paths, authorization,
optimistic concurrency, atomic rollback and guarded schema downgrade.
`browser-routing.cjs` uses a fresh loopback-only instance with
`KUTT_BROWSER_DISPOSABLE=1`, `KUTT_TEST_URL`, and optional `PLAYWRIGHT_MODULE` /
`KUTT_EVIDENCE_DIR`. It checks desktop/mobile editing, preview, ordering, stale
revision recovery, clear/fallback, layout and browser errors.

## QR validation

`qr.cjs` runs in the standard offline hardened-image suite. For independent
browser decoding install the isolated test-only dependency with
`npm ci --prefix tests/browser-deps` (never inside the production image).
Use the same fresh loopback/disposable instance procedure as the other browser
tests, then run `node tests/browser-qr.cjs`. `PLAYWRIGHT_MODULE` and
`QR_DECODER_MODULE` may point to separately installed test runtimes.
The script refuses an already initialized instance, checks desktop/mobile actual
PNG/SVG downloads and ClipboardItem PNGs with jsQR, renders print mode/PDF, and
checks image failure recovery, clipboard denial/retry, conversion errors,
duplicate clicks and unsupported browsers. Clipboard writes are intercepted;
the test does not modify the operator's OS clipboard. It also creates its own
digit-leading email and domain to exercise link/domain admin filters at both
viewport sizes, waiting for HTMX and the real table fade before screenshots.
These dependencies are not application runtime dependencies.

`admin-user-filter.cjs` runs in the full offline container suite. It checks
numeric IDs (including leading zeros), digit-leading email/substring searches,
unsafe IDs and non-string filters, count/list/pagination parity, rendered HTML,
and ordinary/scoped credential denial for links and domains.

## Workspace validation

`workspaces.cjs` is included in the full container suite. It covers accepted
invitations, roles, revocation, owner/account/domain boundaries, separate API
scopes, CSRF, transactional edits, alias conflicts, restart and guarded migration
rollback. `KUTT_TEST_ONLY=workspaces` selects only that focused fixture for local
debugging; it never replaces the full release suite.

`browser-workspaces.cjs` uses a fresh loopback-only disposable instance and the
same Playwright environment as the other browser tests. It creates three local
test accounts and exercises desktop/mobile creation, invitations/acceptance,
sharing, editing, role changes, trash/restore, clipboard, revocation and closure.
Public redirects must survive closure. It refuses an initialized instance.

`workspace-edit.cjs` adds atomic edit-revision tests across personal/shared
clients, native draft retention, safe escaping/password non-disclosure, filtered
row recovery, optional API revisions, role revocation, visits and restart. Use
`KUTT_TEST_ONLY=workspace-edit` for the focused subset.
`browser-workspace-edit.cjs` requires a fresh loopback fixture and evidence path.
It exercises native conflict/review/retry and invalid-alias correction at
1440/390/320px, checks focused visible errors and retained native checkbox state,
and confirms a revoked editor can no longer submit. No real account is used.

## Final roadmap and security validation

The full suite also runs `analytics.cjs`, `privacy.cjs`, `webhooks.cjs`,
`forwarding.cjs`, `link-health.cjs`, `shortcuts.cjs` and
`security-regressions.cjs`. Their corresponding `browser-*.cjs` scripts use the
same fresh loopback fixtures and desktop/mobile evidence directory. Focused
`KUTT_TEST_ONLY` runs are useful during development but never replace the full
release regression.

`configuration.cjs` runs early in the full suite: secret-file precedence,
fail-closed startup, the read-only aggregate monitoring CLI and manifest assets.
Run `python3 tests/compose-config.py` with Docker Compose installed to render all
four examples using dummy configuration without starting database services.
This does not establish PostgreSQL/MariaDB feature parity.

Run `sh tests/redis-smoke.sh kutt-smoke` separately for a new isolated Redis
container, Bull visit processing and rate-limit persistence across app restarts.
The harness requires an empty test Redis database and never flushes an existing
one. It cleans up its own network namespace, processes and containers.

`browser-shortcuts.cjs` validates the exact downloaded artifact, fixed token
permissions, clipboard wiring (mocked), masking/hiding, error/retry, late-response
suppression and revocation. `browser-login-origin.cjs` needs an HTTPS loopback
fixture to test real browser cross-site login rejection and normal secure-cookie
login. Test-only certificate handling must not be copied into production.

On macOS, `python3 scripts/verify-shortcut.py` checks the signed placeholder
container against its deterministic action graph without importing or executing
it. Native Shortcuts execution with dummy fixtures and physical iPhone acceptance
are separate checks; neither is claimed by headless browser emulation. See
`examples/IOS-SHORTCUT.md` for private first-import checks.
