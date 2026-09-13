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
- Public redirection without credentials, including the missing-link redirect
  after deletion.
- Token scopes, expiry, revocation, owner bans, legacy key compatibility,
  cross-user access denial, CSRF and explicit credential precedence over cookies.
- Domain-restricted list totals, CRUD and statistics; domain deletion, recreation,
  bans and ownership transfer; fail-closed older-image token format.
- Eight concurrent idempotent creates produce one link, replay survives server
  restart, conflicts return 409, expired records are reusable, and failed
  creations roll back their reservations. Stored records contain no raw secrets.
- Latest additive migration down/up preserves existing accounts and links.
- Lifecycle validation, owner/domain/CSRF checks, concurrent visit caps, password
  flows, HEAD and info semantics, restart persistence, retained expired records
  and guarded policy schema rollback.

For rendered lifecycle UI, install Playwright in your test runtime and run
`tests/browser-lifecycle.cjs` with `KUTT_BROWSER_DISPOSABLE=1` and a loopback
`KUTT_TEST_URL` for a fresh disposable instance. `PLAYWRIGHT_MODULE` can point to
an external installation. The test refuses an initialized app, checks desktop
and mobile controls, persists/reloads policies, verifies public redirects and
captures screenshots to `KUTT_EVIDENCE_DIR` (or a fresh temporary directory).

This is not an OIDC provider, SMTP, PostgreSQL, MySQL or browser test. It does
not demonstrate compatibility with every persisted database or CPU platform.
Take a database backup before upgrading an existing deployment.
