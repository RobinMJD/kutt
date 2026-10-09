# Link lifecycle

## Creation schedule

From `3.2.6-sr94.59`, the homepage's advanced creation options use **Start
date/time (UTC)** and **End date/time (UTC)** instead of a relative duration.
Select a date and time in the picker, then Apply. The result always uses
`yyyy-MM-dd HH:mm:ss`, including seconds, independently of the browser language
or timezone. The picker itself follows the browser's native calendar/time UI.

An empty start means immediately; an empty end means no scheduled expiry.
Clear removes only the selected boundary; Cancel or Escape discards picker
changes. When both boundaries are set, end must be later than start. Past
boundaries are allowed and retain the normal active/expired semantics below.
Dates survive validation errors and creation response swaps. English, French
and Spanish labels come from the shared translation catalogs.

The `.59` creation-form change did not convert existing links. The `.69` editor
update described below consolidates stored deadlines. API clients can still send
`expire_in`; when both it and `ends_at` are set, the earliest expiry wins.

## Existing links

Open a link's Edit action and use **Availability** to pause it, schedule its
start/end or cap successful redirects. From `.69`, dates in personal and admin
editors use the **browser's local timezone**, with `yyyy-MM-dd HH:mm:ss` results
and seconds preserved. Dates are converted to timezone-aware UTC before saving.
The explicitly UTC creation and workspace controls keep their existing behavior.
Empty dates
and limits mean no constraint. Saving availability does not change the target,
alias or password. End is the only expiry control: Clear removes the deadline,
and saving it clears any legacy relative expiry atomically. The list and form
show the resulting status. Description/target saves do not alter the schedule.

Nonexistent spring daylight-saving times are rejected. A newly chosen repeated
autumn time uses the browser's earlier occurrence; reopening and applying an
unchanged repeated time preserves its exact stored occurrence and milliseconds.
Without JavaScript, the fallback accepts an explicit ISO date/time with a
timezone; it never guesses a local timezone on the server. Concurrent policy
changes are rejected atomically; current saved values appear beside retained
drafts for review/retry. Public visits and unrelated edits do not cause conflicts.

## API

Both API prefixes support `PATCH /api/v2/links/:id/lifecycle`. Authenticate as
the owner with a session, legacy API key or scoped token with `links:update`.
Administrator sessions do not override ownership on this endpoint. Domain
restrictions apply. Browser cross-origin mutations are rejected.
The separate `PATCH /api/v2/links/admin/:id/lifecycle` endpoint uses the existing
fresh administrator-session gate; non-admins, legacy keys and scoped API tokens
cannot use it. The owner endpoint's boundaries remain unchanged.

```json
{
  "paused": false,
  "starts_at": "2027-01-01T09:00:00Z",
  "ends_at": "2027-01-31T18:00:00Z",
  "max_visits": 100
}
```

Missing fields retain their values. `paused` must be boolean; dates require an
ISO 8601 timezone, or `null` to clear. `max_visits` is an integer 1..2147483647,
or `null` for unlimited. End must be later than start. `expire_in: null` clears
the previous relative expiry for legacy API clients. The browser editor no longer
exposes Remove previous expiry or relative durations.
Invalid input returns 400 and another owner's link returns 404. The same new
policy fields are accepted by link creation and included in its idempotency
fingerprint. Creation without them and existing retry keys remain compatible.
With `reuse: true`, an existing matching link is returned unchanged; use this
PATCH endpoint to change its policy rather than relying on creation to update it.

Responses include `paused`, UTC `starts_at`/`ends_at`, `max_visits`,
`redirect_count` and `lifecycle_status`. Existing `expire_in` remains supported;
both expiry constraints apply when set. Legacy edits that omit the new fields
do not reset them.

## Redirect semantics

- Start is inclusive and end/expiry exclusive, checked at request time.
- Unavailable links return 410 with a generic message, no target disclosure and
  `Cache-Control: no-store`. They do not consume quota or record visits.
- The cap counts successful GET redirects and successful protected-link password
  submissions, including bots. It is not the asynchronous human analytics count.
  HEAD, information views and unsuccessful password attempts do not consume it.
- Existing links start at zero for this counter at migration time. Lowering a cap
  below the consumed count blocks immediately; raising/clearing it reopens access.
  Pausing and resuming never reset the count.
- A single conditional database increment prevents concurrent requests exceeding
  the cap. Normal, HTTP Basic and password-form routes share this check; cached
  metadata cannot bypass current controls. Already issued redirects cannot be
  withdrawn from clients.
- Expired links remain in the database, retain their aliases and can be edited.
  The old 30-second permanent-deletion cron is removed. From `.4`, manual deletion
  moves links to [trash](LINK-HISTORY.md), retaining their policies and history.

## Deployment and recovery

Migration `20260913230000_link_lifecycle` adds columns without replacing links or
users. Back up before migration and validate restore on the candidate image.
Down migration refuses to discard configured lifecycle policies. Tests remove
policies only from disposable data before testing down/up.

**Do not run an older image on a database with lifecycle policies.** It would
ignore pause/limits and its old cron could delete expired links. Prefer fixing
forward or redeploying the same verified lifecycle-capable image. A pre-feature
image requires restoring its matching pre-upgrade backup into an isolated copy,
validating it and explicitly reconciling all later writes before cutover. Never
overwrite current production data as a shortcut; keep it quarantined for recovery.

`tests/link-lifecycle.cjs` covers validation, owner/domain boundaries, CSRF,
password paths, concurrent caps, request-time expiry, restart and retained data.
`tests/browser-lifecycle.cjs` requires Playwright, `KUTT_BROWSER_DISPOSABLE=1` and
`KUTT_TEST_URL` pointing to a fresh loopback-only instance. It refuses an already
initialized app and exercises desktop/mobile editing and redirect enforcement.

The `.59` creation-picker update requires no migration. A rollback to `.58`
continues enforcing saved start/end policies, although its creation UI reverts
to relative expiry. Reload browser tabs after an upgrade or rollback. Never
roll back to a pre-lifecycle image as a UI workaround.

Migration `20261009000000_canonical_link_expiry` transfers each non-null legacy
expiry to `ends_at` and clears `expire_in`, retaining the earlier instant when
both exist. This includes paused, banned and trashed links, without changing
identity, target, counts, secrets or other fields. Invalid stored timestamps
abort the transaction; never discard them to force an upgrade. The down migration
keeps normalized deadlines because lifecycle-capable rollback images enforce
them. Back up and restore-test before upgrading. Legacy API calls made after
migration remain supported, and the editor still shows their effective deadline.
Reload editors opened before upgrading. Publication/deployment status is in
[the local schedule ledger](LOCAL-SCHEDULE-EDIT.md).

`tests/schedule-creation.cjs` covers creation dates, invalid input/drafts,
authorization and legacy relative-expiry behavior in both API versions.
`tests/browser-csp.sh IMAGE date-time` exercises real creation forms in all
three languages, both themes and desktop/mobile widths under enforced CSP,
including seconds, UTC persistence, cancel/clear, validation and redirects.
