# Webhooks and live updates

Released and deployed as `v3.2.6-sr94.13` for roadmap item 13 on 2026-09-14.
Implementation, CI, exact-image restore and public deployment acceptance passed;
see [deployment evidence](FEATURE-ROADMAP.md#thirteenth-deployment-evidence).

## Manage integrations

Settings > Integrations lists the signed-in owner's webhooks and live management
activity. Create a named receiver, select events and store its signing secret on
the receiver. The native form creates disabled subscriptions by default. Enable
when the receiver is ready, then Send test. Delivery history shows pending,
delivered, failed and cancelled attempts, HTTP status and sanitized failure codes.
Retry queues a new bounded cycle for a failed delivery of the current revision.
Editing, disabling or rotating cancels older pending/failed deliveries. A request
already in flight may still arrive; receivers must enforce their current secret
and idempotency policy. No credentials are put in short links or visitor requests.

Supported events: `link.created`, `link.updated`, `link.trashed`, `link.restored`,
`link.organized`, `link.imported`, `link.routing_updated`, `link.tracking_updated`,
`link.forwarding_updated` (added in `.14`), and `link.health_configured` /
`link.health_changed` (added in `.15`; see [destination monitoring](DESTINATION-HEALTH.md)).
An explicit Send test produces `webhook.test` for that subscription only.
Events contain a UUID, event type, UTC occurrence time and `data` with a link UUID
and changed field names. Test `data` is empty. There are no destination URLs,
passwords, tokens, visitor addresses, user emails or raw analytics. Changes through
workspace permissions notify the underlying link owner, not every workspace
member. Anonymous links do not create owner events. Redirect traffic does not
create these events, regardless of tracking policy.

Live activity is an authenticated, read-only event feed. It does not overwrite
unsaved edits. Pause/reconnect is available, and at most 50 recent events are
displayed. The server checks session expiry, account verification/bans, OIDC
bindings/logout and authentication version every two seconds. Connections last
at most five minutes and reconnect with the last received sequence. Limits are
four streams per user and 100 per app process. A lost/revoked session closes the
stream; there are no URL tokens or public subscriptions. Proxies must support SSE
and honor no buffering, while keeping WAF/SSO unchanged.

## API

All routes accept the existing `/api` and `/api/v2` prefixes, return private
no-store responses and enforce same-origin browser mutations. They are strictly
owner-wide: administrators cannot read other owners' integrations. Domain-limited
tokens are denied instead of silently widening access. Native settings and SSE
require a browser session. Legacy owner API keys remain supported on JSON routes;
new integrations should use explicit scopes in the `X-API-Key` header.

| Method/path | Scope and body |
| --- | --- |
| `GET /webhooks` | `webhooks:read`; configuration list and event types, never secrets |
| `POST /webhooks` | `webhooks:write`; `name`, `url`, `enabled` boolean, `events` array; returns secret once |
| `PUT /webhooks/{id}` | `webhooks:write`; same fields plus current integer `revision` |
| `POST /webhooks/{id}/rotate` | `webhooks:write`; `{revision}`; returns new secret once |
| `DELETE /webhooks/{id}` | `webhooks:write`; `{revision}`; removes configuration/deliveries, not links/history |
| `POST /webhooks/{id}/test` | `webhooks:write`; `{revision}`; 202 with queued delivery/event IDs |
| `GET /webhooks/{id}/deliveries?before={sequence}` | `webhooks:read`; up to 50, descending; `next` cursor for older records |
| `POST /webhooks/{id}/retry` | `webhooks:write`; `{revision, delivery_id}`; 202 for current failed delivery |
| `GET /events?after={sequence}` | `events:read`; up to 50 ascending events, last cursor; omit after for latest 50 |
| `GET /events/stream?after={sequence}` | Browser only; SSE `management`, `revoked`, `unavailable`; honors `Last-Event-ID` |

Ten subscriptions per owner. Creates/edits/deletes are limited to ten requests per
minute; rotation to five; test/manual retry to four per route/client. Stale
configuration revisions return 409; reload rather than guessing revisions.
Session-wide revocation pauses existing subscriptions until an authorized owner
saves or rotates them again. API-token revocation prevents further configuration
changes; a subscription is persistent configuration, not a token session.

## Receiver verification and delivery

Receivers must be public HTTPS DNS names on port 443, without URL credentials or
fragments. A/AAAA results must all be public. Private, loopback, link-local,
carrier-grade NAT, multicast, documentation and reserved addresses are rejected,
including IPv4-mapped IPv6 and transition ranges. Mixed answers or incomplete DNS
checks fail closed. Each send resolves again and pins the validated IP to the TLS
socket while preserving hostname/certificate verification. There is no proxy-env
support, redirect following or private-network exception. DNS is bounded to three
seconds and delivery to ten seconds, with bounded headers and no retained response
body. A domain that changes to a private address fails delivery rather than being
grandfathered in. This deliberately excludes internal lab callback URLs.

Delivery headers are `X-Kutt-Event-Id`, `X-Kutt-Delivery-Id`, `X-Kutt-Timestamp`
(Unix seconds) and `X-Kutt-Signature` (`v1=` plus lowercase HMAC-SHA256 hex).
The signed input is exactly `timestamp + "." + raw UTF-8 body`, using the shown
`whsec_...` string as the HMAC key. Verify signatures in constant time, require a
recent timestamp and persist event IDs for duplicate suppression before applying
side effects. [Receiver verification example](../examples/verify-webhook.cjs)
implements signature/age/body validation; durable receiver storage remains the
receiver's responsibility. Reject unknown event types and validate their schemas.

Link mutation, event and delivery enqueue commit in one transaction. The primary
process checks the durable outbox every ten seconds, at most five deliveries per
run, using 60-second claim leases. Success is any 2xx. Connection/DNS failure,
408, 429 and 5xx retry after 30, 60, 120, 240 and 480 seconds, at most six claims
per cycle; other 4xx, redirects and prohibited addresses fail immediately. Crashed
leases are recovered; claims count even if the process dies before sending.
This is **at least once**, not exactly once or ordered delivery. A response lost
after a receiver commits can cause a duplicate with the same event ID. Retries
use fresh timestamps/signatures, and configuration revisions prevent old payloads
from being redirected to a changed receiver. Retry never reruns the link mutation.

Only these new event/delivery records expire after 30 days, in bounded 500-event
worker cleanup batches. Original link history and analytics retention are separate.
Live cursors older than that window cannot recover expired events. Backups retain
their own history. Signing secrets are AES-256-GCM encrypted at rest with an
HKDF-derived JWT-secret key and webhook-ID authenticated context; configuration
URLs remain private database values and must not contain reusable credentials.

## Migration and recovery

`20260914060000_webhooks_events` adds the event journal, subscriptions and durable
outbox. Existing links/users/keys are unchanged; no subscriptions are created
automatically. Downgrade refuses once subscriptions or event history exist.
Preserve the database and JWT secret together in consistent backups. Changing
the JWT secret makes old signing material unreadable: reauthenticate and rotate
each subscription, then update receivers. Never log secrets, full callback URLs
or receiver response bodies during diagnosis.

Before restoring a snapshot, isolate outbound delivery and application writes.
Restore SQLite with its normal consistent-backup procedure, retain privacy policies,
and reconcile changes since the snapshot. Restoring can replay queued events the
receiver already accepted. Review/disable unwanted subscriptions and reconcile
receiver event IDs before resuming the primary worker. Do not merely lower
revisions or discard outbox tables to force a downgrade. An older application
would miss new events and delivery processing; prefer fix-forward, and retain
privacy rollback restrictions from [PRIVACY.md](PRIVACY.md).

Implementation references: [Node HTTPS](https://nodejs.org/api/https.html),
[Node DNS](https://nodejs.org/api/dns.html),
[SSE protocol](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
