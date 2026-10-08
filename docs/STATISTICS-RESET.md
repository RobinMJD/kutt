# Reset Link Statistics

Open a link's Statistics page and choose **Reset statistics**. Confirm the
permanent deletion to discard test traffic before sharing the link. Cancel
makes no request. The page refreshes its total and charts after success; new
tracked visits start at zero. Labels and messages are available in English,
French and Spanish.
If the write succeeds but the statistics panel cannot refresh, the page says
that the reset was saved and asks for a reload. It never claims stale charts
are fresh, nor automatically repeats the destructive request.

## Boundaries

- Only the link owner can reset, even when another user is an administrator.
  Workspace membership alone does not grant analytics deletion rights.
- The link, alias, destination, password, expiry, routing, tracking opt-out,
  tags and history are retained. Other links are not touched.
- `redirect_count` and `max_visits` are deliberately retained. Resetting
  analytics cannot reactivate a quota-exhausted link; change its lifecycle
  settings separately when appropriate.
- All hourly visit buckets (browser, OS, geography, referrers and totals) for
  this link are deleted, and its displayed `visit_count` becomes zero. A
  `statistics_reset` audit entry records actor/source and field names, not
  deleted visitor data. Aggregate reports/exports subsequently use fresh data.
- This does not erase infrastructure logs, backups or already exported reports.
  There is no Undo button. Historical recovery requires an appropriate backup
  and reconciliation of later writes, not an indiscriminate database restore.

## API

`GET /api/links/{uuid}/stats` returns `reset_revision`. Then submit:

```http
POST /api/links/{uuid}/stats/reset
Content-Type: application/json
X-API-Key: YOUR_SCOPED_TOKEN

{"confirm":true,"revision":0}
```

Both `/api` and `/api/v2` are supported. Browser sessions and legacy owner API
keys retain existing authentication behavior. Named tokens require the new
`stats:reset` scope, plus `stats:read` to obtain statistics/revision. Existing
read/edit/delete tokens are not silently upgraded. Domain restrictions and
current domain grants are checked again inside the write transaction. Foreign
Origin and cross-site requests are refused. The endpoint allows six reset
attempts per minute under the existing rate-limit policy.

Success returns `{id, visit_count: 0, reset_revision}`. Explicit confirmation
and a current integer revision are mandatory. A stale/concurrent reset or
tracking change returns 409. After any ambiguous failure, reload before trying
again; neither browser nor server automatically retries deletion.

## Implementation And Recovery

The reset locks the same link row as visit ingestion and deletes the buckets,
zeros the counter, advances the existing tracking revision and records history
in one transaction. Audit failure rolls back everything. Advancing the revision
rejects delayed pre-reset jobs, including legacy revision-zero jobs, without
changing tracking enabled/disabled. After a tracking change or reset, legacy
Redis statistics caches are bypassed, including late results written by an
older in-flight reader. No Redis flush, dependency or schema migration is needed.

Older images already understand the tracking fence, so image-only rollback to
the previously verified `.66` preserves link data and queued-visit boundaries,
but removes the reset endpoint/UI. It cannot restore deleted statistics. For
Redis-backed installations, the old image may read stale pre-reset cached
aggregates: invalidate only the affected link's statistics keys or leave Redis
disabled until their TTL expires. Never flush a shared Redis database. Keep
the normal pre-deployment consistent backup and isolated restore validation;
do not deploy while the origin is unreachable.

## Verification Status

Target release: `3.2.6-sr94.67.2`. Focused API, Redis/Bull cache/queue fencing,
and English/French/Spanish browser tests pass. Full regression, publication,
CI, backup/restore and live acceptance remain pending. During validation on
2026-10-09, an independent origin/network interruption produced Cloudflare 522
and lost Proxmox/VM Tailscale connectivity. It recovered without a host reboot,
container restart or WAF change. No real link's counters were reset. Do not
infer deployment from source.
The `.67` candidate was not published or deployed: its Redis-over-TLS test
observer missed a completed job already removed by the worker. The `.67.1`
fixture subscribes before enqueueing and retains bounded completion and TLS
checks. No production TLS or queue behavior was relaxed.
The `.67.1` workflows were then canceled before publication after identifying
HTMX's resolved HTTP-error response behavior. The `.67.2` candidate verifies
the rendered revision and covers a saved reset followed by a failed refresh.

The release also pins compatible security patches `handlebars@4.7.10` and
`proxy-addr@2.0.8`, following newly published upstream advisories:
[template AST validation](https://github.com/advisories/GHSA-8r5x-fm3f-whwj),
[property validation](https://github.com/advisories/GHSA-p8wg-vrv2-v86f), and
[IPv4-mapped IPv6 trust](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
The lockfile audit reports zero findings after the patches. This does not prove
the absence of vulnerabilities or exploitation in the prior application.

The API regression is included in the full container suite and available with
`KUTT_TEST_ONLY=stats-reset`. It checks owner/token/domain/origin boundaries,
explicit confirmation, transaction rollback, delayed jobs, stale/concurrent
resets, opt-out, quotas, other-link preservation and restart. Rendered tests
use `sh tests/browser-csp.sh IMAGE stats-reset` with `KUTT_TEST_LOCALE=en|fr|es`
on a fresh disposable loopback fixture, never production. They cover cancel,
conflict recovery, saved-write/failed-refresh recovery, keyboard confirmation, new visits and charts at
1440/390/320px in light/dark mode under enforced CSP.
