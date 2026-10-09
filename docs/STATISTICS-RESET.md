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

Acceptance tracker (2026-10-09; source `acc91a2`):

| Gate | Status | Evidence |
| --- | --- | --- |
| UI/API implementation and focused authorization | Passed | Owner/scope/domain/origin isolation, transaction rollback and generation fences. |
| Local rendered acceptance | Passed | EN/FR/ES, light/dark, 1440/390/320px; saved reset with failed refresh, reload recovery and subsequent visitors. |
| Exact release CI | Passed | [Main run 37858899945](https://github.com/RobinMJD/kutt/actions/runs/37858899945) and [tag run 37858914355, attempt 2](https://github.com/RobinMJD/kutt/actions/runs/37858914355/attempts/2) passed all gates. The unchanged tag rerun passed after an existing logout check stopped on `ERR_NETWORK_CHANGED`. The full existing-feature browser suite also passed locally; no test relaxation. |
| Recoverable baseline backup | Passed | Local/NAS consistent backup, byte-matched recovery database/secrets and isolated writable restore; refresh before cutover if stale. |
| Exact hardened wrapper and fresh image scan | Passed | Published source digest `sha256:5381aae825699e437833eb419920cb79427586efcd52c38248274de4603bb514`; wrapper `sha256:561cd0e42d6cc11c6ee72058c0cd18a7f600048485623d97e91da5f335354c70`. Full isolated regression and writable restored-data checks passed. Fresh Grype scan: zero Critical/High, three Medium matches for unfixed `CVE-2025-60876`. |
| Deployment and public/UI acceptance | Passed | Live `.67.2` is healthy with zero restarts. Public API scope/revocation/409 checks and real desktop/mobile light/dark reset, cancel, keyboard confirmation and subsequent visits passed. Original records unchanged; no real statistics reset. |
| Post-change backup and monitoring | Passed | Post-change local/NAS backup and isolated writable restore passed. Repeated healthy monitoring samples, no new alerts compared with baseline and full lab validator passed. |
| Documentation closeout | Recorded | README, feature roadmap, deployment/recovery and dated security follow-up updated. Application-release CI receipts above apply to the deployed source; documentation-only commits do not replace that source image. |

Accepted deployment: `3.2.6-sr94.67.2`, source `acc91a274a79d34005b76291f803a6bb9eb8e03b`,
published in [the versioned release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.67.2).
Focused API, Redis/Bull cache/queue fencing, English/French/Spanish browser tests,
main/tag CI, full exact-wrapper regression, publication, backup/restore and live
acceptance passed. The live browser used disposable app identities through the
real public HTTPS/WAF route; this is not a new interactive Authentik login ceremony.
The Authentik authorization-code/PKCE initiation separately passed.

Immediately before deployment, local snapshot `497b364e` was copied to NAS
`79cad53e`; the restored database and three secret files byte-matched and passed
an isolated writable candidate-image check. After deployment, local `32cc7730`
and NAS `e9907fd1` passed the same check, including the four wrapper files.
Private logs, full snapshot IDs and guarded image-only rollback (`rollback67.sh --apply`)
are under `/srv/homelab/security-reports/2026-10-09-kutt-stats-reset/` on Debian3.
The source release stays at `acc91a2`; a subsequent documentation-only closeout
commit does not change the deployed application or move its immutable tag.

During validation on 2026-10-09, an independent origin/network interruption produced Cloudflare 522
and lost Proxmox/VM Tailscale connectivity. It recovered without a host reboot,
container restart or WAF change. No real link's counters were reset. Do not
infer deployment from source. Simultaneous external connectivity failures support
a shared network interruption; the exact router/ISP/power cause remains unconfirmed.
Preexisting global package/update/scanner warnings remain outside this release;
healthy Kutt probes do not mean the whole homelab has no outstanding alerts.
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
