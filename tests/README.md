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

For rendered lifecycle UI, install Playwright in your test runtime and run
`tests/browser-lifecycle.cjs` with `KUTT_BROWSER_DISPOSABLE=1` and a loopback
`KUTT_TEST_URL` for a fresh disposable instance. `PLAYWRIGHT_MODULE` can point to
an external installation. The test refuses an initialized app, checks desktop
and mobile controls, persists/reloads policies, verifies public redirects and
captures screenshots to `KUTT_EVIDENCE_DIR` (or a fresh temporary directory).

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
