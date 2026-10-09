# Live Service Validation: 2026-10-09

## Scope And Accepted Version

Validated the existing homelab service, not a new application deployment.
Accepted live version remains `3.2.6-sr94.67.2`, image index
`sha256:561cd0e42d6cc11c6ee72058c0cd18a7f600048485623d97e91da5f335354c70`.
Kutt was healthy with zero restarts, no OOM and no recent application errors.
Anonymous management access remained denied, the public root returned 302,
and direct-origin health returned 200 with valid TLS.

The reviewed homelab smoke suite passed 39 checks and cleaned up its disposable
fixtures. Coverage included authorization, scoped API tokens, public redirects,
CRUD, imports/exports, lifecycle, workspaces, routing, analytics, webhooks and
secret rotation, SSE delivery, QR/copy controls, and English/French/Spanish UI.
OIDC initiation and PKCE were tested; a fresh human MFA/passkey login and
physical phone workflow were not performed in this maintenance pass.

Original users, links, identities and policies passed the preservation check;
database integrity and foreign-key checks passed. A consistent pre-test SQLite
snapshot was restored and migrated in an isolated same-image container. This
is local recovery evidence, not a newly verified off-host/NAS/USB backup.
JWT, metrics and OIDC secret files were also verified unchanged.

## Monitoring Defect And Repair

An initial strict post-test check detected pending public probe alerts. The
history showed DNS resolution taking 8-9.5 seconds, before any TCP/TLS request,
across Kutt and other lab routes. Technitium logged the shared Docker gateway
exceeding its unchanged 600 queries/minute client limit (601-608 queries/minute).
Kutt itself remained healthy; the application was not restarted or upgraded.

Blackbox now uses the same filtered resolver at `172.30.53.2` through the
dedicated internal `homelab_monitoring_dns` bridge (`172.30.53.0/24`), with its
own reserved client address `172.30.53.3`. Only these two containers belong to
the bridge. Blackbox retains its observability network for public HTTP egress;
it was not added to the general application proxy network. DNS filtering,
DNSSEC, rate limits, WAF, SSO, TLS and published ports remain unchanged.

Only blackbox was recreated, with exactly its previous image. Technitium was
attached without a restart. The provisioning helper checks subnet/route
conflicts, rejects unexpected clients and runs before observability bootstrap.
Compose definitions, provisioning tests, rebuild order and rollback are
tracked in the homelab repository. Other shared-gateway DNS clients remain
outside this scoped repair and may still encounter aggregation limits.

Pre-change Compose files and the bootstrap unit are retained privately.
Rollback restores those files and recreates only blackbox, then disconnects
the resolver and removes the empty bridge; it must not restore Kutt or DNS
application data for this network-only change.

## Evidence And Remaining Gate

Private evidence directory on Debian3:
`/srv/homelab/security-reports/2026-10-09T024609Z-kutt-service-check/`.
It retains the initial failed acceptance artifact rather than hiding it,
the smoke log, preservation checks, local recovery snapshot/restore result,
DNS validation, before-state, narrow repair patch and post-change monitoring.
Do not publish the private SQLite snapshot or credential fingerprints.

The isolated resolver test passed 24 IPv4/IPv6 pairs with zero errors and an
average of about 1.7 ms per pair. Sustained probe acceptance is recorded in
the private post-change evidence: five successful samples, 65 seconds apart,
with all three required Kutt probes healthy and zero public-probe failures.
Public DNS resolution measured 1.6-3.5 ms. Four strict acceptance samples,
also 65 seconds apart, passed with zero Kutt alerts, restarts, failed units
or unhealthy containers. Kutt and Technitium retained their original start
times; DNS policy and authentication configuration fingerprints matched.
Final external HTTPS checks returned root 302 and anonymous management 401
with certificate verification succeeding.

Candidate `.69` (local-time expiry editing, including `.68` country labels)
remains **not deployed**. A fresh required workflow dispatch still returned
HTTP 422, `Actions has been disabled for this repository`, despite the
permissions API reporting enabled. No cause is assumed and the CI/release
gate was not bypassed. Follow [deployment and recovery](DEPLOYMENT.md) after
required checks and publication succeed; this service validation does not
approve an untested live migration.
