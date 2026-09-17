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

### Admin editor upgrade (3.2.6-sr94.21 candidate)

No schema, dependency, secret or access-policy changes. The admin editor now
renders fresh joined owner/domain context after save and validation, retains
non-secret drafts, and keeps the admin endpoint. Missing records do not produce
an actionable editor. Ordinary API projections remain unchanged. Image-only
rollback is schema-compatible but restores the misleading owner/error display;
keep the current database and secrets. Deployment acceptance remains in the
UI/UX ledger until the exact-image and post-change gates pass.

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
6. Record release/CI, backup/restore evidence, deployed digest and acceptance
   results. Mark roadmap completion only after all gates pass.

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
