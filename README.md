<p align="center">
  <img src="static/images/logo.png" alt="Kutt logo" width="100">
</p>

# Kutt: RobinMJD fork

A self-hosted URL shortener with public redirects, authenticated management,
shared workspaces, advanced routing and operational controls. Built on
[thedevs-network/kutt](https://github.com/thedevs-network/kutt), using Node.js,
Express, server-rendered templates and HTMX. This is an independent fork, not
the upstream hosted service.

[![Fork CI](https://github.com/RobinMJD/kutt/actions/workflows/fork-release.yaml/badge.svg?branch=main)](https://github.com/RobinMJD/kutt/actions/workflows/fork-release.yaml)
[![Release](https://img.shields.io/github/v/release/RobinMJD/kutt)](https://github.com/RobinMJD/kutt/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Project status

As of **22 September 2026**, the current deployed application version is
[3.2.6-sr94.49](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.49).
All 16 original roadmap features, the earlier selected community improvements and 25
confirmed UI/UX fixes have passed their recorded release and homelab deployment
gates. Release `.40` added DNS ownership verification and closed seven security
findings; `.41` corrects Safari analytics and prefix-only hostname normalization.
Release `.42` adds proxy-trust, database-search, OIDC-algorithm and custom-host
API correctness, preserving management authorization and public redirects.
Exact-image tests, public WAF regression and pre/post off-host writable restores passed.

The expanded community work list is approved and in progress. Complete English
(default), French and Spanish localization is deployed in `.49`, using separate
extensible catalogs. Verified database/Redis TLS in `.43` passed
deployment/recovery gates; stable table sorting `.44` has passed them too.
Transactional moderation `.45` has also passed deployment/recovery gates.
Dotted aliases `.46` have passed deployment/recovery gates too.
System/Light/Dark appearance `.47`, private metrics `.48` and localization `.49`
have also passed their recorded release/deployment gates. Staged/enforced CSP,
branded QR exports, optional OIDC roles, destination policy, interactive geography
and indexed visit aggregation are integrated candidates. Separate management
hosting and explicit shared-domain grants are still being implemented. See the
delivery ledger for current evidence; pending additions are not yet complete.

- [Feature roadmap](docs/FEATURE-ROADMAP.md): completed features and release evidence.
- [Community contribution review](docs/UPSTREAM-PR-REVIEW.md): selected proposals, attribution and deferred ideas.
- [Community delivery ledger](docs/COMMUNITY-FEATURE-ROADMAP.md): approved additions and current validation status.
- [UI/UX review](docs/UI-UX-REVIEW.md): fixes, completed human acceptance and the final security remediation gates.
- [Custom domain ownership](docs/CUSTOM-DOMAINS.md): DNS proof, client compatibility and recovery for new claims.
- [Upstream PR #1046](https://github.com/thedevs-network/kutt/pull/1046): submitted changes; still awaiting upstream review/merge at the status date above.

SQLite is the fully exercised database engine. PostgreSQL 16 and MySQL 8.4 have
targeted security/concurrency tests; MariaDB remains configuration-only. These
are **not** full feature-parity guarantees. Security
reviews and image scans are bounded, dated evidence, not certification that the
application has no vulnerabilities.

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Configuration and access](#configuration-and-access)
- [API and integrations](#api-and-integrations)
- [Development and testing](#development-and-testing)
- [Upgrades and recovery](#upgrades-and-recovery)
- [Customization](#customization)
- [Documentation](#documentation)
- [Contributing and credits](#contributing-and-credits)

## Features

The fork retains custom domains, custom aliases, password-protected links,
visit statistics, local accounts and administrator tools. It adds:

| Area | Capabilities and guide |
| --- | --- |
| API access | [Named, scoped, expiring and revocable tokens](docs/API-TOKENS.md), domain restrictions and retry-safe idempotent link creation |
| Link availability | [Pause, scheduled start/end and maximum visits](docs/LINK-LIFECYCLE.md), enforced when a redirect is requested |
| Recovery | [Change history, trash and restore](docs/LINK-HISTORY.md), with protection against silently reusing retired aliases |
| Moderation | [Atomic administrative bans, explicit recovery and audit](docs/MODERATION.md), with permanent credential revocation and final-administrator protection |
| Appearance | [System, Light and Dark](docs/THEMES.md), persistent browser preference, readable charts and unchanged white QR exports |
| Languages | [English (default), French and Spanish](docs/LOCALIZATION.md), separate extensible catalogs, request-local translation and localized UI, feedback, email, dates and numbers |
| Sign-in | [Stable OIDC identity binding, session revocation, signed back-channel logout and diagnostics](docs/OIDC-SECURITY.md) |
| Organization | [Tags, collections, saved filters and bulk actions](docs/LIBRARY.md) |
| Data transfer | [CSV/JSON import and export](docs/TRANSFER.md), templates, dry-run previews and explicit conflict handling |
| QR codes | [PNG/SVG downloads, PNG clipboard copy and printing](docs/QR-CODES.md), generated locally |
| Collaboration | [Shared workspaces](docs/WORKSPACES.md) with owner/editor/viewer roles and conflict-aware editing |
| Routing | [Ordered device, language, country and query rules](docs/ROUTING.md), with a redirect preview |
| Forwarding | [Multi-segment aliases and allowlisted query/path forwarding](docs/FORWARDING.md) |
| Campaigns | [UTM campaign builder](docs/CAMPAIGNS.md) in personal, admin and workspace editors, with API support |
| Analytics | [Date ranges, exports, tag summaries and bot filtering](docs/ANALYTICS.md) |
| Privacy | [Per-link tracking opt-outs and administrator-controlled retention](docs/PRIVACY.md) |
| Integrations | [Signed asynchronous webhooks, delivery history, retries and private live updates](docs/WEBHOOKS.md) |
| Monitoring | [Opt-in destination checks](docs/DESTINATION-HEALTH.md), private aggregate monitoring and protections against requests to private network destinations |
| Performance monitoring | [Dedicated authenticated metrics listener](docs/METRICS.md), bounded request/latency labels and process gauges; off by default |
| Optional mobile client | [Scoped-token iOS Shortcut](examples/IOS-SHORTCUT.md); Apple Shortcuts is not needed to run the server |

Management screens include responsive tables, keyboard-accessible dialogs,
draft preservation, conflict feedback, masked one-time credentials and explicit
clipboard success/failure states. See the [UI/UX ledger](docs/UI-UX-REVIEW.md)
for measured coverage and limitations.

## Quick start

### Docker Compose with SQLite

Use Docker Engine with the Compose plugin. The default example builds the
checked-out source, persists SQLite and custom assets in named volumes, and
publishes only `127.0.0.1:3000` on the Docker host.

```sh
git clone --branch v3.2.6-sr94.49 --depth 1 https://github.com/RobinMJD/kutt.git
cd kutt
cp .example.env .env
chmod 600 .env
```

Before starting, edit `.env`:

1. Set `JWT_SECRET` to a long random value. For a **new installation**, generate
   one with `openssl rand -base64 48`. Preserve the existing secret on upgrades.
2. Set `DEFAULT_DOMAIN` to the canonical hostname, without a scheme or path,
   for example `short.example.com`. Keep `localhost:3000` only for local testing.
3. Leave anonymous creation and local registration disabled unless deliberately
   required. Keep `TRUST_PROXY=false` for direct local access; configure it
   explicitly for your trusted proxy topology before deployment.

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

The container applies database migrations before starting. Complete first-admin
setup **privately** before enabling public routing. On a remote Docker host,
use a private tunnel or the documented trusted proxy path, not a public backend
port. Follow [deployment setup](docs/DEPLOYMENT.md#initial-setup) to configure
TLS, WAF and OIDC management access before exposure. These controls are **not**
automatically installed by the Compose example.

The default example is a starting point, not the complete hardened homelab
deployment. Add an appropriate restart, backup, monitoring and resource policy
for your environment. Do not use `docker compose down --volumes` on an instance
whose data you intend to keep.

### Published images and alternative examples

Fork images are published as
`ghcr.io/robinmjd/kutt:v3.2.6-sr94.49`. For an image-based deployment, replace
the Compose service's `build` section with an `image` reference, retaining its
environment and persistent volumes. Pin the tested image digest in production.
The upstream `kutt/kutt` Docker Hub image does **not** contain these fork changes.

The [fork workflow](.github/workflows/fork-release.yaml) tests `main` and release
tags, but publishes an image only for `v*-sr94.*` tags. Publication is separate
from deployment; do not auto-deploy untested branch builds or moving tags.

| Example | Purpose |
| --- | --- |
| [docker-compose.yml](docker-compose.yml) | SQLite, no external database service |
| [docker-compose.sqlite-redis.yml](docker-compose.sqlite-redis.yml) | SQLite with private Redis for visit queues and shared rate-limit state |
| [docker-compose.postgres.yml](docker-compose.postgres.yml) | PostgreSQL configuration example; explicit database image and credentials required |
| [docker-compose.mariadb.yml](docker-compose.mariadb.yml) | MariaDB configuration example; separate application and root credentials required |

Select an alternative with `docker compose -f <file> ...`; these are standalone
examples, not overlays to combine. Read the [database and Redis caveats](docs/DEPLOYMENT.md#optional-database-examples)
before using them. In particular, the Redis examples do not persist queued work,
and changing database image tags is not a supported major-version migration.

## Configuration and access

Use [`.example.env`](.example.env) as the configuration checklist and
[`server/env.js`](server/env.js) for the accepted values/defaults. Avoid copying
an old full environment table from another Kutt version. Important settings:

| Setting | Operational guidance |
| --- | --- |
| `JWT_SECRET` | Required for production; preserve it with the database because it also protects sessions and encrypted webhook credentials |
| `DEFAULT_DOMAIN`, `SITE_NAME` | Canonical hostname and display name; the domain contains no scheme/path |
| `DISALLOW_ANONYMOUS_LINKS`, `DISALLOW_REGISTRATION` | Both default to `true`; delegated OIDC provisioning is a separate policy |
| `OIDC_*`, `DISALLOW_LOGIN_FORM` | Configure native SSO and provider admission first; use `DISALLOW_LOGIN_FORM=true` for SSO-only login |
| `OIDC_ALLOW_REGISTRATION` | Controls new OIDC identities, not local signup; defaults to `true` |
| `OIDC_SESSION_MAX_SECONDS` | Absolute OIDC session lifetime; defaults to 3,600 seconds |
| `TRUST_PROXY` | Examples use `false`; the application's legacy default is `true`. Only trust proxies that are the exclusive backend path and replace untrusted forwarding headers |
| `CSP_MODE` | Optional `off` (default), `report-only` or `enforce`; see [nonce policy and customization compatibility](docs/CSP.md) before enabling |
| `DB_*`, `REDIS_*` | Must match the selected topology, persistent paths and existing credentials |
| `ENABLE_RATE_LIMIT` | Optional management API limiting; protected-link password and report throttles remain enabled independently |
| `CUSTOM_DOMAIN_USE_HTTPS` | Controls custom-domain link URLs; it does not provision DNS, TLS certificates or proxy routes |
| `MAIL_*`, `REPORT_EMAIL`, `CONTACT_EMAIL` | Configure SMTP for verification/recovery/report workflows; mail is disabled by default |

Declared application settings support `NAME_FILE` secret-file input. File
values take precedence over inline values and unreadable files fail startup.
Mount secret files read-only at their **container** paths. The supplied Compose
examples validate an inline `JWT_SECRET`; adapt that declaration deliberately
when switching to file-only injection. Never commit real `.env` files,
credentials, identity mappings, databases or backup archives.

### Public links, protected management

- Public short-link redirects do not require a Kutt or Authentik login. An
  explicitly password-protected link still requires its own link password, and
  pause/expiry/trash rules still apply. Do not put an interactive SSO challenge
  over the whole hostname.
- Management uses Kutt's authorization and native OIDC. The homelab uses
  Authentik plus BunkerWeb/WAF; a new installation must configure its own edge
  protections and provider access policy. Never expose a direct backend to
  bypass those controls.
- API clients authenticate with scoped tokens. OIDC callbacks and signed
  back-channel logout need their documented routes, not an extra interactive
  SSO challenge. WAF and application validation must remain in place.
- Existing accounts are **not automatically linked by email**. Before migrating
  an existing OIDC installation, follow the [verified identity-binding procedure](docs/OIDC-SECURITY.md#existing-account-migration).
  The callback is `https://YOUR_DOMAIN/login/oidc`; changing issuer or subject
  mode later requires a planned identity migration.

## API and integrations

The application serves both `/api` and `/api/v2`. Prefer named tokens created
in Settings, give each integration only the scopes/domain it needs, and send
the secret in the `X-API-Key` header. Public redirects need no API credential.
Legacy API keys remain compatible but broad; migrate integrations to scoped
tokens rather than treating old keys as least-privilege credentials.

Start with the [API token and idempotency guide](docs/API-TOKENS.md). Feature
guides above document their endpoints, permissions, limits and recovery
behavior. Some account, invitation and administrator operations deliberately
require a browser session; a token never grants site-administrator privileges.

The [base API specification](docs/api/api.js) can be rendered with
`npm run docs:build` in a development checkout. It is not a complete reference
for every fork endpoint; use the feature guides for additions. Older upstream
API clients may work with compatible routes but are not automatically validated
against the fork's scopes and security policies.

The optional [iOS Shortcut guide](examples/IOS-SHORTCUT.md) covers the reviewed
artifact and private token setup. It is an API client example, not a server
dependency or deployment mechanism.

## Development and testing

Use **Node.js 24**. SQLite is the default and needs no separate database server.
There is no frontend bundler step; templates, CSS and browser scripts ship with
the application. Install locked dependencies, configure a private `.env` and
initialize the database:

```sh
npm ci
npm run migrate
npm run dev
```

`npm start` runs production mode. Standalone Node listens on network interfaces,
so restrict access with your host firewall/trusted proxy; the Compose loopback
binding does not apply to a standalone process. Native SQLite dependencies may
need a compiler toolchain when no prebuilt binary is available for your platform.

For release validation, use a separate disposable checkout with **no `.env`**:

```sh
docker build -t kutt-smoke .
docker run --rm --network none --entrypoint node kutt-smoke tests/container-smoke.cjs
sh tests/redis-smoke.sh kutt-smoke
python3 tests/compose-config.py
```

The full smoke suite uses temporary SQLite data and tests migrations, API
compatibility, authorization, public redirects and feature behavior. The Redis
test uses its own isolated containers. Compose validation renders the four
examples without claiming full PostgreSQL/MariaDB runtime coverage.

See [test instructions](tests/README.md) for rendered desktop/mobile suites,
fresh loopback fixtures, Playwright requirements and separate native-device
acceptance. **Never point disposable browser tests at a real deployment or an
existing user's browser profile.** CI is not a substitute for testing the exact
deployed image, real SSO, monitoring and recovery.

## Upgrades and recovery

Read [deployment and recoverable upgrades](docs/DEPLOYMENT.md) before changing
an existing instance. Release publication alone is not a successful deployment.

1. Record the current source/image digest, configuration, database version and
   health. Take a consistent backup of the database, custom assets and private
   configuration/secrets, and keep an encrypted off-host copy.
2. Restore into an isolated instance using the exact candidate image; verify
   integrity, migrations and a write/read cycle before deploying. For SQLite,
   use its backup API or stop writers; copying only a live main file is unsafe.
3. Deploy the tested digest without replacing secrets or volumes. Validate
   existing links, public redirects, management authorization, real OIDC and
   enabled integrations, then observe monitoring through a post-restart interval.
4. Take a clean post-deployment backup and verify restoration again. Record the
   deployment and rollback evidence separately from release CI.

Prefer fix-forward or a documented schema-compatible rollback. Old images can
ignore newer lifecycle, privacy or revocation rules; do not drop populated policy
tables to force a downgrade. Restores must reconcile later writes and revoked
credentials before reopening access. **The repository alone can recreate an
empty application, not recover lost users, links, secrets or analytics.**

## Customization

Local branding can override files through `custom/css`, `custom/images` and
`custom/views`. A `custom/css/styles.css` replaces the corresponding default
stylesheet. Keep overrides under version control without private credentials,
and include them in backups.

Containers load overrides from `/kutt/custom`. The example Compose files mount
a persistent `custom` volume there; populate that volume or use a deliberate
bind mount instead of relying on edits to an ephemeral container filesystem.
Restart after template/configuration changes and verify loaded browser assets.

Custom templates and themes must be checked on every upgrade. Older upstream
themes may omit new controls, validation, accessibility or security behavior;
they are not automatically compatible with this fork. Preserve versioned asset
URLs and their query strings through proxy/CDN caches.

## Documentation

| Task | Start here |
| --- | --- |
| Install, upgrade or restore | [Deployment and recovery](docs/DEPLOYMENT.md) |
| Configure SSO or migrate identities | [OIDC security](docs/OIDC-SECURITY.md) |
| Connect an API client | [Tokens and idempotency](docs/API-TOKENS.md) |
| Understand a feature | [Feature guides](#features) |
| Operate destination checks | [Destination health](docs/DESTINATION-HEALTH.md) |
| Review hardening and scan limits | [Security maintenance](docs/SECURITY-MAINTENANCE.md) |
| Reproduce automated checks | [Testing](tests/README.md) |
| Check implementation/deployment status | [Roadmap](docs/FEATURE-ROADMAP.md) and [UI/UX ledger](docs/UI-UX-REVIEW.md) |
| Review community ideas and attribution | [Community review](docs/UPSTREAM-PR-REVIEW.md) |

## Contributing and credits

Propose fork-specific fixes and enhancements through
[pull requests](https://github.com/RobinMJD/kutt/pulls). The fork's issue tracker
is currently disabled. Include the version, database engine, reproduction steps
and sanitized logs; never post credentials, private destinations or identity
mappings. Changes should include focused tests, authorization/backward-compatibility
checks and any migration/recovery notes.

This fork builds on the work of the
[upstream Kutt contributors](https://github.com/thedevs-network/kutt/graphs/contributors).
Original author: Pouria Ezzati. Special thanks to
[Thomas](https://github.com/trgwii) and [Muthu](https://github.com/MKRhere);
logo design by Muthu. Selected community proposals are credited in the review
linked above. The upstream hosted service and third-party integrations are
operated independently of this fork.

Licensed under the [MIT License](LICENSE).
