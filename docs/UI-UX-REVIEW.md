# UI/UX Review And Remediation Ledger

Last updated: 2026-09-15 (Europe/Paris).

**Status: initial findings recorded; the full rendered audit is not yet complete.**
Seven findings are confirmed, none is fixed. Six additional concerns need browser
validation. Do not describe this document as a completed accessibility audit.

## Feature And Deployment Gate

- All 16 items in [FEATURE-ROADMAP.md](FEATURE-ROADMAP.md) are complete.
- Selected community improvements through `v3.2.6-sr94.18` are implemented;
  optional deferred proposals in [UPSTREAM-PR-REVIEW.md](UPSTREAM-PR-REVIEW.md)
  are not prerequisites for this audit.
- Source reviewed: `ecb23daa1b4a6fa10c3ec3dd59470ec882e1be3f`, package
  `3.2.6-sr94.18`. The checkout was clean and synchronized before the audit.
- Fresh live inspection: container `kutt`, image `local/kutt:3.2.6-sr94.18`,
  healthy, zero restarts. Exact wrapper image:
  `sha256:17639101731d1f741b6e596c0f975ad46ee46a87455394a4759965a847116114`.
- Production observation was limited to the public login page and container
  inspection. All creation, editing, bulk-action and import exercises used an
  isolated instance of that exact image, a fresh temporary SQLite database and
  synthetic `example.org` / `example.invalid` data. No real user data was copied.
- The fixture was loopback-only through SSH, non-root, read-only, with all
  capabilities dropped. Local fixture login replaced OIDC only in the disposable
  instance. Production WAF, SSO, routes and secrets were not changed.

## Method And Evidence Limits

Current-run Codex in-app browser captures at desktop 1440 x 1000 and mobile
390 x 844, with DOM/accessibility snapshots and targeted source review. Screenshots
linked below were opened and visually inspected during this audit. They are not
recycled release-test evidence. The evidence uses synthetic identities and links.

The in-app browser stalled when the Library bulk-trash action opened a native
confirmation. The dialog API did not return the pending dialog; subsequent
interaction and capture commands timed out, including after trying a fresh tab.
This is an **audit-tool blocker**, not evidence of a Kutt production outage or a
confirmed application defect. Approval to finish using the installed standalone
Playwright browser was requested and is still pending. Do not bypass that gate.

Two captures were rejected: an unsettled mobile viewport capture and a malformed
full-page stitched capture. Neither is included or counted as evidence. QR
navigation was attempted after the tooling stall but did not produce an accepted
capture; it is not counted as reviewed.

No screen-reader, physical iPhone/Safari, zoom/reduced-motion, clipboard-denial or
fresh human MFA acceptance is claimed. DOM names are evidence of semantics, not
proof of complete assistive-technology compatibility. Historical regression tests
do not replace the missing fresh audit steps.

## Workflow Coverage

| Step | Workflow | Current result | Remaining acceptance |
| --- | --- | --- | --- |
| 1 | Production SSO entry | Desktop observed; clear Authentik action, misleading sign-up label | Mobile recapture; auth error/cancel/expired-session states |
| 2 | Empty home and first link | Mobile/desktop observed; created a synthetic link | Keyboard-only path, 320px reflow and 200/400% zoom |
| 3 | Invalid URL and campaign creation | Invalid input rejected; campaign applied and link created | Announcements, no-apply draft behavior, long/encoded values |
| 4 | Recent links and inline editing | Desktop actions and mobile edit observed | Mobile action access, complete keyboard edit/save/cancel |
| 5 | Library filtering and bulk pause | Pause succeeded; state label contradicts result; mobile heading overlap | Tags/collections/saved-filter CRUD, pagination, clear success feedback |
| 6 | Import/export | Invalid schema reported; valid dry run and explicit commit created one link | File chooser, templates, export/download, conflict and stale-preview recovery on mobile |
| 7 | Trash and history | Native bulk confirmation blocked the audit tool; no deletion claimed | Cancel/confirm, restore, history, focus and reserved-alias recovery |
| 8 | QR | Not visually accepted | Preview, options, PNG/SVG, clipboard failure, print and scanability |
| 9 | Workspaces | Templates/scripts inspected only | Owner/editor/viewer/outsider UI, invitation lifecycle and shared edits |
| 10 | Routing and forwarding | Templates/scripts inspected only | Create/reorder rules, preview, allowlists, unsaved/stale changes |
| 11 | Analytics and privacy | Templates inspected only | Empty/populated charts and tables, ranges, exports, tracking/retention boundaries |
| 12 | Monitoring and integrations | Templates inspected only | Pending/failed checks, retries, webhooks, live-state disconnection/recovery |
| 13 | Settings, tokens and security | Templates inspected only | Navigation, token lifecycle, clipboard, OIDC/legacy modes and admin/ordinary roles |
| 14 | Administration and recipient pages | Not visually reviewed | Users/domains/links/reports, protected/expired/paused/missing short-link pages |

## Prioritized Findings

P1: blocks a core path for a viewport or assistive-technology user.
P2: material usability, clarity or error-recovery problem.
P3: polish with no blocked task. These are product priorities, not CVSS scores.

| ID | Priority | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| UX-001 | P1 | Core icon controls lack accessible names | Rendered DOM and source | Open |
| UX-002 | P1 | Mobile recent-links table hides essential actions and the empty state | Mobile screenshots, source | Open |
| UX-003 | P1 | Library heading links overlap mobile filter controls | Screenshot and measured DOM | Open |
| UX-004 | P2 | `active` filter includes visibly paused links | Successful bulk pause, source | Open |
| UX-005 | P2 | Legacy URL validation lacks programmatic field/error association | Invalid-submit DOM, source | Open |
| UX-006 | P2 | Import schema errors do not give a usable correction path | Error/preview/commit exercise | Open |
| UX-007 | P2 | SSO-only login advertises sign-up even when registration is disabled | Production screenshot, source | Open |

### UX-001: Name Core Actions

The create-link submit button, row edit/delete buttons and pagination arrows
appear as unnamed `button` nodes. A screen-reader or voice-control user cannot
reliably distinguish them. The target input is named only `target`.

Reproduce: open the home page with one link and inspect accessible names. The row
has a named Copy button, followed by unnamed edit and delete buttons. The newer
routing/forwarding/health/QR links already have useful names; preserve them.

Sources: [shortener](../server/views/partials/shortener.hbs),
[row actions](../server/views/partials/links/actions.hbs),
[pagination](../server/views/partials/links/nav.hbs).
Evidence: [desktop actions](ui-ux-review/2026-09-15/07-links-actions-desktop.png).

Acceptance: name every interactive control in personal and admin variants; use
link-specific labels where necessary, meaningful field labels and visible
focus/hover tooltips for unfamiliar icons. Test keyboard activation and the
accessibility tree before and after HTMX updates. Icon naming must not change
authorization or destructive-action confirmation.

### UX-002: Make Recent Links Usable On Phones

At 390px, the original URL consumes the visible row; the short link, views and
actions are off-screen in the table. Even `No links.` is outside the visible empty
table area. A page-level no-overflow assertion can pass while the useful content
is still clipped inside the table. Inline editing fits after programmatic access,
but its entry action is not discoverable in the initial mobile view.

The desktop toolbar also packs eight low-emphasis icons into a small area and
truncates the short alias. Mobile CSS reduces action buttons to 20 x 20px. Target
spacing exceptions must be measured before claiming a specific WCAG failure.

Sources: [table](../server/views/partials/links/table.hbs),
[rows](../server/views/partials/links/tr.hbs),
[styles](../static/css/styles.css) (`#main-table-wrapper`, mobile `.action`).
Additional evidence: [mobile inline edit](ui-ux-review/2026-09-15/08-edit-mobile.png).

Acceptance: expose the short alias, destination, lifecycle state, Copy and edit
entry without horizontal hunting at 320/390/768px; provide a keyboard/touch
accessible action menu if needed. Keep search, pagination, all existing actions
and admin functionality. Empty states must be visible. Test 0/1/many rows and long
URLs; verify hit regions and not merely document scroll width.

![Empty mobile table hides its empty-state text](ui-ux-review/2026-09-15/03-home-empty-mobile.png)

### UX-003: Prevent Mobile Heading/Filter Overlap

Library shows only `Links` and `Analytics` beside the title. `Import and export`
and `Trash` wrap underneath and are covered by the search/tag controls. At 390px,
the measured Import link occupies x=30..143.5, y=202.5..223.8 while the search
input occupies that same visible band. Attempting to resolve/interact with that
link failed on mobile; the desktop link worked.

Cause: the unscoped global `header` dimensions also apply to `.archive-heading`.
The heading wraps, but its fixed height does not reserve the extra row. Transfer,
workspaces and QR already have local height overrides; Library does not.

Sources: [Library](../server/views/library.hbs),
[styles](../static/css/styles.css) (`header`, `.archive-heading`).

Acceptance: use shared, content-sized page-heading rules without altering the
site header. Every heading link must have an unobscured clickable hit region at
320/390/768/1440px, with long titles and zoom. Check all pages using the shared
heading, not only Library. Include a hit-test/overlap assertion in regression
tests, because presence in the DOM did not catch this bug.

![Wrapped Library navigation covered by filters](ui-ux-review/2026-09-15/09-library-mobile.png)

### UX-004: Use Accurate Lifecycle Filter Names

After selecting the synthetic link, choosing Pause and applying it, the row
correctly says `Paused` but remains under the selected `active` filter. The query
uses `active` to mean not deleted, not currently redirecting. The lower-case
`active/paused/unpaused/trash` labels expose API vocabulary rather than clear
user meaning. Workspace `Active` uses a similar distinction and needs checking.

Sources: [query](../server/library.js) (state filter),
[view model](../server/handlers/library.handler.js),
[Library](../server/views/library.hbs), [Workspaces](../server/views/workspaces.hbs).

Acceptance: preserve API and saved-filter values for backward compatibility but
render accurate labels such as `Not in trash`. Distinguish pause flag from
effective availability (scheduled, expired, visit-capped). Test paused/unpaused,
future-start, expired, capped and trashed fixtures; changing terminology must not
silently narrow users' saved searches.

![Paused result remains under the active filter](ui-ux-review/2026-09-15/10-library-paused-mobile.png)

### UX-005: Associate Validation Errors With Fields

Submitting `not a url` renders `URL is not valid.` and a red decoration, but the
input has no `aria-invalid` or `aria-describedby` relationship and the error has
no alert/status semantics. After editing the field to a valid destination, the
old error remains until another submission. The entered value is preserved,
which is good and must remain true.

Source: [shortener](../server/views/partials/shortener.hbs). Apply the review to
related legacy auth, settings and inline-edit forms before choosing a shared fix.

Acceptance: stable error IDs, programmatic association, intentional focus and
announcements after HTMX responses, and a clear stale-error lifecycle. Preserve
drafts after validation/network/server failures. A campaign Apply action must
not imply that the link itself has been saved. Test valid correction, invalid
alias, expiry errors, network failure and server/WAF error responses.

![Invalid URL response](ui-ux-review/2026-09-15/04-home-invalid-desktop.png)

### UX-006: Make Import Errors Actionable

The import form provides File, Format and Content but no reachable schema/sample
or template. Pasting `{"bad":true}` yields `Unsupported export schema.` in the
import workflow. A valid array was accepted, previewed and explicitly committed;
the safety mechanism works, but discovering the required format needs knowledge
outside the page.

Sources: [transfer page](../server/views/transfer.hbs),
[transfer script](../static/scripts/transfer.js), [transfer guide](TRANSFER.md).

Acceptance: provide downloadable valid JSON/CSV templates or an appropriate
format-reference link, clear import-specific errors, row/field references where
available, and a direct correction/retry path. Keep dry-run expiry, conflict
handling, protected-link requirements and explicit commit unchanged. Do not
relax parser/security validation to accept malformed data.

![Import schema error lacks a correction path](ui-ux-review/2026-09-15/11-import-error-desktop.png)

### UX-007: Match Login Copy To Enabled Authentication

Production offers only `Sign in with Authentik`, but the header says `Log in /
Sign up` and the page title mentions signing up. Self-registration is disabled.
This suggests an unavailable route to someone who has not been granted access.

Sources: [header](../server/views/partials/header.hbs),
[auth form](../server/views/partials/auth/form.hbs), [login](../server/views/login.hbs).

Acceptance: derive the header/title from enabled sign-in/registration modes,
provide a clear SSO retry path for failure/cancellation, and do not expose account
details or open registration. Test SSO-only, local-login-only, registration-enabled
and login-disabled configurations. Short-link recipients must remain unauthenticated.

![Production SSO-only login](ui-ux-review/2026-09-15/01-production-login-desktop.png)

## Source Concerns Requiring Rendered Validation

These are not counted as confirmed UX defects. Validate, merge into an existing
finding, promote to a new UX ID, or reject with evidence. Do not blindly redesign.

| ID | Concern and source | Required validation |
| --- | --- | --- |
| C-01 | Legacy custom dialogs use a `div` and class toggling with no explicit dialog semantics, focus transfer/trap/return or Escape handler in [main.js](../static/scripts/main.js) and [dialog frame](../server/views/partials/links/dialog/frame.hbs) | Keyboard open/cancel/Escape/Tab/Shift+Tab, modal naming and focus return for link/admin/domain dialogs; distinguish native-dialog tool failures from app failures |
| C-02 | `handleShortURLCopyLink` signals copied before awaiting `navigator.clipboard.writeText`; it does not handle rejection in [main.js](../static/scripts/main.js) | Denied/unavailable clipboard, actual copied bytes, success/failure announcements for short links and tokens; keep manual selection/download alternatives |
| C-03 | Main Settings is a row of unrelated links plus long stacked forms; feature navigation differs between pages in [settings.hbs](../server/views/settings.hbs) | Test discovering every feature as admin/ordinary user, current-page context, back paths and mobile navigation; avoid creating duplicate destinations |
| C-04 | Personal inline edit separates Update and Save availability, whereas workspace edit combines them; legacy expiry and lifecycle end coexist | Exercise editing both sets, cancel/navigation/reload and error cases; identify actual draft-loss or contradictory-state behavior before changing save semantics |
| C-05 | Legacy CSS suppresses some outlines, uses pale action/text colors, and contains animations without a reduced-motion rule | Measure actual contrast and focus in enabled/error/hover states; keyboard-only paths, zoom and reduced motion. Do not claim global WCAG compliance from screenshots |
| C-06 | Separate scripts manage fetch/loading/conflict states for rules, forwarding, analytics, monitoring and integrations | Fresh slow/offline/401/403/409/5xx tests, stale edit preservation, retry discovery, live-update reconnection, status announcements and duplicate-submit prevention |

## Remediation Order And Status Contract

1. **AUDIT-00: finish the coverage matrix** using the approved browser mechanism;
   capture and inspect fresh desktop/mobile evidence, including ordinary-user and
   workspace roles. Resolve C-01 through C-06. Status: **waiting for browser-tool
   approval**, not complete.
2. Fix UX-001, UX-003 and UX-002 in that order; shared components may overlap, but
   document and validate each finding independently.
3. Fix UX-004 through UX-007, then all additional confirmed findings in severity
   order. Reorder only with a written reason in the change log.
4. Run a final full regression/security and desktop/mobile review, reconcile
   source/release/deployment versions and close the ledger only after all gates.

Use `Open -> In progress -> Implemented -> Validated -> Released -> Deployed ->
Verified/closed`. `Rejected` requires evidence that the concern is not a defect;
`Blocked` requires the precise external prerequisite. Do not quietly mark a real
finding accepted or remove it from the ledger to finish the goal.

**Update this file immediately after each change**, even before that change has
passed tests. Record ID, concrete behavior changed, files, tests/results,
screenshots, commit/release, backup IDs/restore evidence, deployment image,
post-change checks and any remaining gate. Never mark an implemented-only finding
closed. If a shared patch fixes several IDs, record independent acceptance for
each. Keep regression history rather than rewriting failed runs as successes.

For each completed fix, follow the standing release contract in
[DEPLOYMENT.md](DEPLOYMENT.md): scoped commit/push to `RobinMJD/kutt`, versioned
release and green CI; fresh recoverable backup with verification; deployment of
the tested image; feature and existing-service acceptance; rollback on regression.
No production mutation is needed for an audit-only documentation commit.

Preserve links/users/secrets, public redirects and management WAF/Authentik SSO.
Use synthetic fixtures for destructive/credential/error tests, never weaken
production controls to get a green result. Preserve unrelated dirty homelab work
and use its authoritative live checkout only for scoped deployment changes.

## Validation Checklist

- [ ] Finish every remaining coverage row and triage each source concern.
- [ ] Check desktop/mobile at 1440/768/390/320px, zoom, keyboard, focus and reduced motion.
- [ ] Check screen-reader-relevant names, landmarks, errors, status and modal semantics.
- [ ] Measure contrast and interactive target geometry, including spacing exceptions.
- [ ] Exercise empty/populated/paginated/long-data, slow/offline/error and stale-edit states.
- [ ] Test admin, ordinary user, workspace owner/editor/viewer and outsider boundaries.
- [ ] Keep all existing APIs, persisted filters, redirects and migrations compatible.
- [ ] Close each finding only after its source/release/deployment/backup/verification gates.
- [ ] Complete final regressions and retain a clean, pushed source tree and accurate deployment docs.

Accessibility review references: [W3C Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html),
[Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and
[Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Use the criteria and their exceptions, not screenshot appearance alone, when
classifying a standards failure.

## Change Log

| Date | IDs | Change | Validation and outstanding gates |
| --- | --- | --- | --- |
| 2026-09-15 | AUDIT-00, UX-001..007, C-01..06 | Created initial evidence-backed ledger after feature completion and exact-image fixture testing | Seven open findings; six unvalidated concerns. Tooling blocked the remainder of the rendered audit. No runtime fixes, release, deployment or completed-audit claim. |
| 2026-09-15 | Goal | Created an active Codex goal referencing this ledger | Goal requires completing the audit, sequential remediation, an update after every change, and all publication/backup/deployment/verification gates before closure. Browser-tool permission remains pending. |
