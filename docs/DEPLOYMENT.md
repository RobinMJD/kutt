# Deployment and recoverable upgrades

The fork image is published to `ghcr.io/robinmjd/kutt` on versioned releases.
Use an immutable digest, not a moving tag, for production. The homelab maintains
its hardened wrapper, WAF/Authentik routing, monitoring and private backup paths
in its separate deployment repository. This public repository contains no real
secrets, provider bindings or user data.

### Expiry editor upgrade (3.2.6-sr94.19.2)

This release changes no database schema or API-relative-expiry semantics. Browser
forms now carry a signed expiry snapshot to distinguish unchanged display text
from an intentional new expiry. Reload editors opened before the upgrade before
saving a nonempty duration. A stale explicit expiry change (including removal)
is rejected atomically, retains the draft, and displays the current expiry for
review before retry. Keep the existing JWT secret: rotating it invalidates form
snapshots as well as sessions. Rollback to the prior image is schema-compatible
but reintroduces the stale-expiry defect; it is not a data-recovery procedure.

### Shared editor upgrade (3.2.6-sr94.20)

No schema or secret change. Reload old workspace edit forms once to obtain an
opaque edit revision. Browser conflicts reject the entire stale save and retain
non-secret drafts for review against current saved values. Password changes need
re-entry after errors. API clients may opt into the same check with `edit_revision`;
existing partial PATCH clients remain compatible. Preserve the JWT secret and
current database on image rollback; the prior image restores the lost-update
risk. No WAF/SSO or public redirect change is needed. Exact-image, backup/restore,
regression and post-deployment gates passed; evidence is in the UI/UX ledger.

### Admin editor upgrade (3.2.6-sr94.21)

No schema, dependency, secret or access-policy changes. The admin editor now
renders fresh joined owner/domain context after save and validation, retains
non-secret drafts, and keeps the admin endpoint. Missing records do not produce
an actionable editor. Ordinary API projections remain unchanged. Image-only
rollback is schema-compatible but restores the misleading owner/error display;
keep the current database and secrets. Exact-image and post-change gates passed;
deployment and recoverability evidence is recorded in the UI/UX ledger.

### Keyboard and pagination upgrade (3.2.6-sr94.22)

Named controls, native admin tab/filter buttons, immediate visible focus and
post-action focus recovery do not change data, APIs or access policy. Reload
open management pages after deployment. Inline editors and table replacements
initialize without a settle delay so fast keyboard input cannot act on an
uninitialized form. Editor forms use POST rather than GET as their non-JavaScript
fallback, preventing fields from entering the URL; saving still requires the
existing authorized PATCH path. Pagination is bounded and server-rendered empty
and one-page results disable Next immediately. Focus intent across native
management POSTs stores only an expiring local path/time marker, never drafts.
No schema or secret change. Image-only rollback to `.21` preserves current data
but restores the accessibility/navigation defects. Exact-image validation and
deployment, live regression and post-backup recovery passed; evidence is tracked
in the UI/UX ledger. Live smoke checks use semantic heading text, not a literal
attribute-free H1 string, so accessibility attributes do not cause false failures.

### Content-heading layout upgrade (3.2.6-sr94.23)

Shared page headings reserve their full wrapped height and constrain long titles,
without changing the site masthead. No migration, API or access-policy change.
Refresh open pages to load the updated stylesheet. An image-only rollback to `.22`
preserves current data but restores the mobile heading overlap. Rendered acceptance
covers every shared-heading route, hit regions and actual browser zoom. Pre-backup
restore, exact-image deployment, live regression and post-backup restore passed;
evidence is recorded in the ledger.

### Responsive management tables (3.2.6-sr94.24)

Personal links and admin Links/Users/Domains become labeled stacked rows at narrow
widths, preserving every action, filter and pagination control. Desktop columns
remain. Long URLs wrap on mobile and use ellipsis on desktop. Reload open pages
to obtain the stylesheet and row templates together. No migration, dependency,
API, secret or access-policy change. Image-only rollback to `.23` preserves data
but restores clipped mobile actions. Empty/one/many rows, long content, actual
browser zoom and role boundaries are covered; exact-image regression, deployment,
live WAF/OIDC checks, monitoring and post-backup restore passed. Evidence is in
the UI/UX ledger.

### Library lifecycle labels and bulk feedback (3.2.6-sr94.26.1)

The `.26` artifact did not publish an image: CI caught synthetic Workspace
fixture leakage. `.26.1` adds cleanup without changing runtime behavior.
UI filter labels now distinguish not-in-trash from actual redirect availability;
legacy API/saved-filter values remain unchanged. Bulk changes retain native
POST/303/GET navigation and show a server-confirmed action/count with focused
feedback. The count includes already-applied operations. The short-lived signed
receipt cookie is user-bound and contains no link data; it is not an access
credential. No schema, API, dependency, secret or WAF/SSO changes are needed.
Reload management pages after deployment. Image-only rollback to `.25` retains
data but restores ambiguous labels and missing feedback. Publication, exact-image
regression, responsive browser tests, pre-backup recovery and deployment passed.
Post-deployment WAF/OIDC, health and clean post-backup recovery passed. An
intermittent synthetic webhook registration rejection remains recorded separately
in the UI/UX ledger: the complete diagnostic retry passed, but the first cause
is unconfirmed. SSRF/WAF checks were not weakened.

### Native modal dialogs (3.2.6-sr94.25)

Shared native dialogs isolate the background and retain keyboard focus. Close
and Escape cancel only a pending read, not an in-flight write. Failed writes
keep drafts and explicitly ask users to check saved state before retrying; no
automatic mutation retry is added. Requests are bounded at 30 seconds, duplicate
writes are dropped, and cancelled/superseded responses cannot update another
opening. Reload old management pages after upgrade. No schema, API, dependency,
secret or WAF/SSO change. Image-only rollback to `.24` is compatible but restores
the modal accessibility defects. Release/deployment/live health and clean
post-backup recovery passed; evidence is recorded in the UI/UX ledger.

### Form validation and draft recovery (3.2.6-sr94.27)

The shared validation script refreshes field/error associations after HTMX swaps,
including retained inputs, preserves existing descriptions and focuses errors
after automatic focus settles. It does not steal focus from another form edited
while a request was pending. Editing clears obsolete validation messages; an
uncertain transport-failure warning remains until retry. Network/server failures
retain drafts and never trigger automatic mutation retries. Inline Add domain
closes only after the server's confirmed insertion response. Retention draft
edits clear stale preview readiness and acknowledgement without applying deletion.
The login page has a main landmark and SSO-only errors expose a keyboard retry.
Local password login stays disabled wherever configured; no fallback is enabled.

Reload open management pages after deployment. No migration, API status, secret,
dependency, WAF/SSO or authorization change is required. Image-only rollback to
`.26.1` preserves data but restores the validation/focus defects. Exact release,
deployment, public WAF/SSO regression, monitored health and clean post-backup
writable recovery passed; evidence is recorded in the ledger.

`tests/validation.cjs` runs in container smoke CI. Rendered validation uses fresh
loopback-only disposable fixtures, never production data:

```sh
KUTT_BROWSER_DISPOSABLE=1 KUTT_TEST_URL=http://127.0.0.1:3000 \
  KUTT_EVIDENCE_DIR=/tmp/kutt-validation node tests/browser-validation.cjs
```

Use an already installed Playwright module, optionally selected with
`PLAYWRIGHT_MODULE`. The fixture must permit initial bootstrap/local login and
must have an empty temporary SQLite database. Tests refuse initialized fixtures.
The separate `tests/browser-oidc-validation.cjs` requires an SSO-only fixture and
`KUTT_TEST_PROVIDER_URL` pointing to `tests/fixtures/oidc-error-provider.cjs`.
That test-only provider requires `KUTT_BROWSER_DISPOSABLE=1` and the two loopback
URLs; it starts unavailable, enables discovery on POST `/fixture-ready`, then
returns a valid-state cancellation. Use `NODE_ENV=development` only on this
isolated fixture for loopback HTTP OIDC; production HTTPS requirements must not
change. If containerized, publish both ports on `127.0.0.1` only. Fresh rendered
fixtures cover WAF-like failures, retry, draft retention, keyboard/error focus,
owner/admin/recipient forms and 1440/390/320px reflow. Synthetic provider tests do
not replace real Authentik session-expiry acceptance.

### Readable UI colors (3.2.6-sr94.31)

Darker existing link/error colors and button gradients improve text contrast,
including placeholders and secondary descriptions. No schema, dependency, API,
authorization or layout change. Refresh pages to load the new stylesheet.
`tests/contrast.cjs` enforces palette contrast in CI; `tests/browser-contrast.cjs`
checks actual backgrounds, interaction states and error workflows on a fresh
synthetic loopback fixture. Custom CSS overrides need their own measurements.
Image-only rollback preserves data but restores low-contrast colors. Publication,
deployment and recovery acceptance remains in the UI/UX ledger.

### Visible webhook errors (3.2.6-sr94.30)

Webhook save failures now remain beside the editor's Save action with an alert
and recoverable focus. Drafts survive errors; validation correction and Cancel
clear obsolete editor feedback. Requests and URL/SSRF/access checks are unchanged.
No schema, dependency or secret changes. Reload Integrations after deployment.
Image-only rollback preserves data but restores off-screen errors. The focused
API and `tests/browser-webhook-errors.cjs` disposable browser tests cover rejection,
retry, concurrency, keyboard focus and mobile visibility. Release/deployment and
backup/restore evidence belongs in the UI/UX ledger before closing the finding.

### Configuration-aware login copy (3.2.6-sr94.29)

The login header/title and verification-return links advertise sign-up only when
the local form, registration and mail are all enabled. SSO-only and local-only
installations without visible registration say `Log in`; closed login has no
header entry and an explicit closed title. This is a presentation change, not
an authentication policy change: OIDC provisioning, API registration gates,
sessions, WAF and public redirects remain unchanged. No migration or secret
rotation. Reload login pages after deployment. Image-only rollback preserves
data but restores misleading copy. Seven API modes and desktop/mobile workflows
are covered by `tests/login-copy.cjs` and `tests/browser-login-copy.cjs`; exact
release/deployment/recovery status is tracked in the UI/UX ledger.

### Import correction (3.2.6-sr94.28)

Authenticated generic JSON/CSV templates and actionable format errors add no
schema or dependency. The new GET `/api[/v2]/transfer/template` requires
`links:create` for scoped keys; it does not reveal account data or mutate links.
Existing preview/commit authorization, limits and retry receipts are unchanged.
Refresh the transfer page after deployment. An image-only rollback to `.27`
preserves current data but removes the template route and correction improvements.
Exact release/deployment gates are tracked in the UI/UX ledger.

### Clipboard and management responses (.32/.33)

Clipboard actions only report success after the browser confirms a write. Denied
or missing APIs expose a selectable fallback; no browser permission changes are
required. A shared management-response reader validates status, media type and
the consumed JSON fields before replacing trusted state or acknowledging a save.
HTML sign-in responses and malformed JSON retain drafts. Analytics removes stale
exports until fresh results validate. A bad response does not prove a write did
not commit: reload current state before retrying, rather than bypassing revision
conflicts. No automatic mutation retry is introduced.

Reload open pages after upgrading. Both releases passed exact-image, live and
recovery gates recorded in [the ledger](UI-UX-REVIEW.md). They change no schema,
dependencies, secrets, authorization or WAF policy. Image-only rollback preserves
data but restores the relevant UI defects.

### Single-document login and unavailable recipients (.35.1)

Successful HTMX sign-in returns 204 with fixed `HX-Redirect: /`; native HTML
sign-in, including the OIDC callback, returns 303 to `/`. This avoids reinjecting
the application into an already initialized document. JSON clients, failed-login
rendering, state/PKCE, CSRF, cookies, identity and session policies are unchanged.
Do not enable local password login as an SSO workaround.

Unavailable HTML GET/HEAD requests return a titled neutral 410 page with a
homepage action. Non-HTML responses and protected POST behavior remain unchanged;
the page does not disclose a destination or availability reason. Active short
links remain public. The `.34` and `.35` candidates were superseded before any
deployment because CI caught obsolete OIDC callback assertions; `.35.1` updates
those expectations while retaining the security assertions.

### Responsive account headings (.36.1)

The site header can wrap its account controls below the brand without splitting
action labels. Long configured names remain bounded. Account security reuses the
existing responsive page heading. Scoped selectors do not restyle unrelated nested
headers; permissions and routes are unchanged. `.36` was superseded before image
publication because its CI found an attribute-sensitive login test selector.

The `.35.1` and `.36.1` changes require only a page reload, no migration or secret
rotation. Image-only rollback to `.33` preserves data. Consult the ledger for the
actual deployed version and completed gates rather than treating a published tag
or these upgrade notes as deployment acceptance.

## Initial setup

Start with the SQLite Compose example and a private `.env` based on
`.example.env`. Set a randomly generated JWT secret and canonical domain.
Only `127.0.0.1:3000` is published. Put the reverse proxy on the same host or
attach it to the private Docker network; do not expose an unprotected backend
to make a proxy connection work. Bind-mount secret files read-only when using
`*_FILE`, with paths that exist inside the container. A missing file now fails
closed. Never commit `.env`, secret files, SQLite files or backup archives.

The examples pass `.env` into the application, then override database host,
port and persistent path to match their topology. Review existing `*_FILE`
settings, which take precedence over inline values. Set `TRUST_PROXY=true`
only when the app can be reached exclusively through trusted proxies that
replace untrusted forwarding headers. Direct local examples default to false;
the application's legacy default remains true for compatibility.

Complete first-admin bootstrap privately before enabling public DNS/routing.
Configure WAF, TLS and Authentik/OIDC management admission before exposure.
Short-link redirects stay public. Native API tokens authenticate API clients;
do not put an interactive SSO challenge on the token-authenticated shortening
API. Do not disable WAF or token authorization for the Shortcut client.
Review [OIDC identity binding and logout](OIDC-SECURITY.md) when migrating users.

## Optional database examples

SQLite is the fully exercised fork engine. SQL examples provide configuration,
not a claim of complete feature acceptance on PostgreSQL or MariaDB.

- PostgreSQL requires an explicit `POSTGRES_IMAGE`. For a fresh test instance
  use `postgres:17-alpine`; for an existing volume use its current major version.
  The example mounts `/var/lib/postgresql/data`, appropriate to the documented
  pre-18 layout. PostgreSQL 18 changes the volume/PGDATA layout. Upgrading a
  major version requires a supported database migration and restore test, not
  just a changed tag. The initialization user is a database superuser; production
  should provision a dedicated app role/database with only required schema/data
  rights instead of reusing that bootstrap account.
- MariaDB requires an explicit `MARIADB_IMAGE`, a non-root application user and
  separate root-password file. `mariadb:11.4` is an example for a new instance,
  not an automatic upgrade instruction. Health uses the image's `healthcheck.sh`
  without passwords in command arguments. Existing images/volumes must support
  that healthcheck and retain their original account credentials.
- Environment changes only initialize an empty database volume; they do not
  rotate existing users. Preserve volume names and credentials on upgrades.
- Redis examples use `redis:8-alpine`. Redis is private and not host-published.
  Those examples do not persist Redis data: queued visits and shared rate-limit
  counters may be lost on recreation. Production needs a deliberate Redis
  persistence/backup policy if retaining queued work is required. Never flush
  a shared production Redis instance during validation.

Primary references: [PostgreSQL image](https://hub.docker.com/_/postgres),
[MariaDB healthcheck](https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/using-healthcheck-sh).

## Every upgrade

1. Record the current app/wrapper image digests, configuration checksums,
   database engine/version, schema migrations and health. Preserve secrets,
   Authentik bindings and existing links. Keep unrelated deployment changes.
2. Take an application-consistent full backup. For SQLite use its backup API or
   stop writers before copying; copying a live main file without its WAL is not
   a backup. Include original JWT/encryption secrets, custom assets, configuration
   and the matching application/wrapper image references. Store secrets encrypted
   separately from this public repository and retain an off-host copy.
3. Restore the backup into a fresh isolated test database using the exact new
   image, with outbound workers contained. Check integrity/foreign keys and
   original account/link fingerprints, then migrate and perform a write/read
   test. A successful backup upload alone is not a restore test.
4. Run `tests/container-smoke.cjs` in a clean network-isolated candidate image.
   Run rendered desktop/mobile tests against a disposable loopback fixture;
   these tests bootstrap dummy users and must never target production data.
5. Deploy the already-tested digest. Verify migration success, container health,
   public redirects, protected management, real OIDC login/logout, existing
   links and enabled integrations. Recheck monitored routes and application
   counters through at least one post-restart monitoring interval.
6. Wait for the entire post-deployment test process to exit successfully, including
   removal of its disposable accounts and links. Then take another consistent
   local/off-host backup and repeat the exact-image writable restore. Compare
   account/link counts and original record fingerprints against the pre-test
   baseline; reject snapshots containing temporary test records.
7. Record release/CI, backup/restore evidence, deployed digest and acceptance
   results. Keep unsuccessful test evidence, document the cause or uncertainty,
   and do not silently remove failing assertions. Mark roadmap completion only
   after all gates pass.

## Recovery

Prefer fix-forward or a compatible image rollback. Older images may ignore
link lifecycle, privacy, routing and revocation controls. Down migrations
deliberately refuse populated policy/history tables. Do not drop data or
disable guards to force a downgrade. Consult each feature's recovery section.

If restoring a snapshot, reconcile all later links/users/writes before replacing
production. Restore the original encryption secret to retain encrypted webhook
keys; coordinate deliberate credential rotation separately. Reconcile webhook
delivery receipts with receivers and review destinations before reenabling
outbound workers. Restored tokens/sessions may have been revoked after the
snapshot: invalidate those before public access. With no backup, code can build
a new empty instance but cannot reconstruct original users, links, credentials
or analytics. Never claim data recovery from source alone.
