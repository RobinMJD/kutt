# Analytics ranges and exports

In development; not deployed or checked off in the roadmap yet.

## Reports

Analytics is available from Library, Settings and the links navigation. The old
stats page also links to an exact-link report. Choose inclusive UTC start/end
dates, domain, tag and literal alias/description search. Daily values, totals,
browser/OS/country/referrer breakdowns and current tag summaries are available
in the UI and JSON/CSV exports. Tables are paginated; exports include all rows.
Empty ranges, request errors and retry are distinct states. Date/filter values
are preserved in the page URL. No visitor IPs or user agents are exported.

Both `GET /api/analytics` and `GET /api/v2/analytics` accept:

| Parameter | Meaning |
| --- | --- |
| `start`, `end` | `YYYY-MM-DD`, inclusive UTC calendar dates, 1-366 days; supported dates 1000-01-01 through 9999-12-30 |
| `link` | Exact owned link UUID, optional |
| `domain` | Owned custom-domain UUID or `default`, optional |
| `tag` | Owned tag UUID, optional |
| `q` | Literal case-insensitive alias/description substring, maximum 200 characters |
| `format` | `json` (default) or `csv` |

Without dates, the last 30 UTC dates ending today are returned. With only `end`,
the start defaults to 29 days before it. Invalid dates/ranges/fields return 400;
unavailable links/domains/tags return 404. Filters combine with AND. No target
HTTP requests are made. Responses are private/no-store and do not create visits.
Exports require the same authentication and filters; CSV text cells that could
be interpreted as spreadsheet formulas receive a leading apostrophe.

The response includes `filters`, `timezone`, `total`, `matched_links`,
`visited_links`, `by_day`, `stats`, `tags`, `available_filters`, and
`generated_at`. Tag totals use current assignments, not historical assignments:
one visit can count under several tags. They must not be summed as unique visits.
Trashed links retain their historical analytics until explicit retention/deletion;
reports do not restore or change their public availability.

Native pages require a signed-in session. API tokens need `stats:read`; all
current domain restrictions and revocation checks apply. Cookie credentials do
not elevate scoped tokens. Personal ownership is required even for administrators;
workspace membership alone does not grant access to another owner's analytics.
Restricted-domain tokens receive only tags assigned to visible links and allowed
domain choices, never the account's unrelated metadata.

Reports are bounded to 10,000 selected links, 100,000 hourly buckets, 20,000 tag
assignments and 10,000 distinct values per dimension. Oversized reports return
422 and ask for narrower filters instead of silently truncating results. Invalid
stored counts/dimensions fail closed (503). The application limits this endpoint
to 30 requests/minute per client/path when rate limiting is enabled; edge controls
remain active. These limits do not change the legacy stats response.

## Ingestion and compatibility

Request and queue processing use the same `isbot` classification and 1,000-character
user-agent bound. Known bots and HEAD requests do not add analytics; redirect
availability/maximum-visit enforcement remains separate and unchanged. The worker
also rechecks bots in older queued header-shaped jobs. Missing or unrecognized
agents may not be detected: this is heuristic filtering, not proof of humanity.

Country is derived locally from the trusted client IP using GeoIP. Client-supplied
country hints are ignored. Invalid referrer URLs become direct visits; paths,
queries and fragments are not retained in referrer dimensions. Worker processing
rechecks link/user ownership, deletion and bans. The displayed counter and hourly
aggregate now commit atomically; a failed aggregate write cannot increment only
the displayed counter. Concurrent inline workers retain every increment, and
referrer keys cannot inherit object properties. This does not claim exactly-once
delivery from Redis.

Existing hourly aggregate data and the legacy `/links/{uuid}/stats` API are
preserved. Historical aggregates have no raw user agent, so older bot/country
classification cannot be reconstructed or honestly corrected. New reports include
those existing aggregates without reclassifying them.

## Migration and recovery

`20260914040000_analytics_range_index` adds a composite owner/time/link index to
existing visits. It does not rewrite or delete analytics. Downgrade removes only
the index and is tested with populated data. Old application versions remain
schema-compatible but lose the new reports and ingestion improvements. Prefer
fix-forward; preserve current data and reconcile later writes before restoring
an older backup. Full database backups include aggregates; CSV reports are not
a substitute for backups of links, credentials, policies and account state.

`tests/analytics.cjs` checks UTC boundaries, ownership/scopes, private domain/tag
metadata, exports, invalid stored dimensions/counts, old API compatibility, bot
filtering, queued hints, concurrent increments, object-property referrers, rollback,
restart and index migration. `tests/browser-analytics.cjs` uses only a fresh
loopback fixture and checks desktop/mobile filters, charts, tables, downloads,
empty/error/retry states and browser runtime/layout errors. Publication, backup
restore and live WAF/SSO acceptance remain required before completion.
