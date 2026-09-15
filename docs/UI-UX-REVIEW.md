# UI/UX Review And Remediation Ledger

Last updated: 2026-09-15 (Europe/Paris).

**Status: initial findings recorded; the full rendered audit is not yet complete.**
Twelve findings are confirmed, none is fixed. Remaining concerns and workflow
coverage are tracked below. Do not describe this as a completed accessibility audit.

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

On the next continuation, the temporary tabs had been cleaned up and a fresh
in-app tab worked. The audit resumed there, without standalone Playwright, using
a new disposable database on the same exact image. Intermittent pre-dispatch
input timeouts remain. Some high-level screenshots incorrectly scale the page
into one quarter of the canvas; those captures are rejected. The same tab's
supported CDP `Page.captureScreenshot` produced correctly sized accepted captures.
No browser permissions or production controls were changed. The supported raw
CDP surface rejected browser clipboard-permission simulation. Subsequently,
temporary failure injection into the disposable document, through the same tab's
supported `Runtime.evaluate`, allowed testing application rejection handling
without changing saved browser permissions. Reload removed the clipboard override
and its absence was verified. A similarly scoped fetch override tested one
synthetic 401 response for rule saving; remaining input commands timed out, so the
unexecuted fault matrix is not counted. The override was removed and a normal
save succeeded before the tab was closed. No standalone browser was used.

Initially, an unsettled mobile viewport capture and a malformed full-page stitched
capture were rejected. Later incorrectly scaled/duplicated captures were also
rejected; only accepted, visually inspected images are linked here. The later
desktop/mobile QR captures supersede the initial unsuccessful QR navigation.

Native Library confirmation was subsequently exercised using the same tab's
supported CDP dialog events and handler, with the keyboard action initiated before
waiting for the dialog. Cancel preserved selection/focus; confirm moved exactly
one synthetic link to trash. This was not a browser-permission change. The separate
Restore action then stalled on its HTMX native confirmation: input, snapshots,
the supported dialog handler and closing the tab timed out while setting focus
emulation; the high-level dialog API returned no dialog. No duplicate restore
action was sent. API inspection confirmed that it had not restored the link.
An explicit API restore succeeded, preserved its pause, and left trash empty.
Browser Restore acceptance is still open. Do not substitute the successful API
test for the blocked UI test or infer an application outage from the tooling stall.

No screen-reader, physical iPhone/Safari, browser zoom/reduced-motion, actual
clipboard permission-denial or fresh human MFA acceptance is claimed. The
clipboard test injected a rejected promise into the disposable document only.
DOM names are evidence of semantics, not
proof of complete assistive-technology compatibility. Historical regression tests
do not replace the missing fresh audit steps.

## Workflow Coverage

| Step | Workflow | Current result | Remaining acceptance |
| --- | --- | --- | --- |
| 1 | Production SSO entry | Desktop and fresh 390px mobile observed; clear Authentik action, misleading sign-up label | Auth error/cancel/expired-session states |
| 2 | Empty home and first link | Mobile/desktop observed; Enter submitted a synthetic link successfully | Complete keyboard-only path, 320px reflow and 200/400% zoom |
| 3 | Invalid URL and campaign creation | Invalid input rejected; campaign applied and link created | Announcements, no-apply draft behavior, long/encoded values |
| 4 | Recent links and inline editing | Desktop actions and mobile edit observed; saving either personal edit form preserves the other form's draft | Mobile action access, complete keyboard edit/save/cancel and legacy expiry/lifecycle-end interaction |
| 5 | Library filtering and bulk pause | Pause succeeded; state label contradicts result; mobile heading overlap | Tags/collections/saved-filter CRUD, pagination, clear success feedback |
| 6 | Import/export | Invalid schema reported; valid dry run and explicit commit created one link | File chooser, templates, export/download, conflict and stale-preview recovery on mobile |
| 7 | Trash and history | Native bulk cancel preserved selection/focus, confirm trashed one synthetic link; custom dialog focus/Escape defective. Trash view rendered. API restore retained pause and public 410 | Browser Restore stalled on its separate native confirmation; history, remaining dialog variants and reserved-alias recovery |
| 8 | QR | Fresh desktop/mobile preview accepted; keyboard Apply changed 512/M to 256/H and updated download URLs | Download bytes, clipboard failure, print and scanability |
| 9 | Workspaces | Owner create/share and viewer invitation acceptance/read-only UI observed. API rejected pending/outsider access and viewer edits; editor API edit passed, rename denied | Editor and outsider rendered views, role changes/revocation, remaining invitation lifecycle and shared UI edits |
| 10 | Routing and forwarding | Created and saved mobile routing rule; preview selected the expected destination. Synthetic 401 preserved the draft and normal retry saved it | Reorder rules, forwarding, remaining HTTP/offline/slow/stale states and duplicate-submit handling |
| 11 | Analytics and privacy | Empty mobile and populated desktop report observed; synthetic redirect counted once. Date-range changes passed; invalid range hid old report and correction recovered it. Tables match chart | Browser export/download, tracking/retention UI, pagination and failure/retry states; fresh offline privacy/API coverage passed separately |
| 12 | Monitoring and integrations | Mobile monitoring empty state accepted; live events connected, paused and resumed. Private webhook target rejected and draft retained, but error off-screen | Pending/failed checks, webhook delivery/retry, forced live disconnection/recovery and remaining faults |
| 13 | Settings, tokens and security | Admin and ordinary-user mobile settings inspected; feature links reachable and Admin absent for ordinary user. Security diagnostics and clipboard behavior observed | Token lifecycle UI, OIDC modes and session revocation; fresh offline protocol tests passed separately |
| 14 | Administration and recipient pages | Protected page reflows at 320px. Wrong password rejected, correction reached intended destination. Paused/expired return a bare 410 message; styled 404 has a return link | Admin users/domains/links/reports; scheduled/capped recipient states and broader keyboard/zoom checks |

### Continuation Evidence

These captures are from the resumed in-app audit, not an earlier release test.
The viewport is 390 x 844 except the desktop dialog/QR captures at 1440 x 1000.

| Step | Capture | Observed result and limit |
| --- | --- | --- |
| 1 | [SSO entry](ui-ux-review/2026-09-15/12-production-login-mobile.png) | Main sign-in action fits; unavailable sign-up wording remains |
| 4 | [Independent edit drafts](ui-ux-review/2026-09-15/21-edit-two-drafts-mobile.png) | Both drafts survive saving the other form; complete keyboard/error checks remain |
| 7 | [Custom confirmation](ui-ux-review/2026-09-15/13e-custom-modal-desktop.png) | Clear retention wording, broken keyboard focus/Escape behavior |
| 8 | [Desktop QR](ui-ux-review/2026-09-15/14-qr-desktop.png), [mobile QR](ui-ux-review/2026-09-15/15-qr-mobile.png) | Preview and options work; downloads/print/decoding remain |
| 9 | [Workspace owner](ui-ux-review/2026-09-15/22-workspace-owner-mobile.png) | Shared link creation and owner controls render; other roles remain |
| 10 | [Routing preview](ui-ux-review/2026-09-15/20-routing-preview-mobile.png) | Test context selects the saved mobile destination; forwarding and remaining faults remain |
| 12 | [Webhook validation at Save](ui-ux-review/2026-09-15/18b-webhook-error-mobile.png), [monitoring empty state](ui-ux-review/2026-09-15/19-health-mobile.png) | Correct target rejection is invisible at Save; monitoring has a usable setup path |
| 13 | [Settings](ui-ux-review/2026-09-15/16c-settings-mobile.png), [security](ui-ux-review/2026-09-15/17-security-mobile.png) | Navigation and local-mode identity/session diagnostics render; token/OIDC/ordinary-user checks remain |
| 9 | [Workspace viewer](ui-ux-review/2026-09-15/24-workspace-viewer-mobile.png) | Accepted viewer sees shared destination and Copy, not Edit/Create/member management; API denial verified separately |
| 11 | [Empty analytics](ui-ux-review/2026-09-15/25-analytics-empty-mobile.png), [populated analytics](ui-ux-review/2026-09-15/26b-analytics-populated-desktop.png) | Empty state, chart, totals and range correction work; first malformed desktop capture rejected |
| 14 | [Protected-link error](ui-ux-review/2026-09-15/27-protected-error-mobile.png), [expired recipient](ui-ux-review/2026-09-15/28-expired-recipient-mobile.png) | 320 x 720 captures; password correction succeeds but error semantics are missing; expired page is an unstructured message |

### Fresh Offline Regression

The complete `tests/container-smoke.cjs` suite passed on 2026-09-15 using the exact
deployed wrapper image above, a separate disposable container with network disabled,
read-only root, dropped capabilities and temporary writable storage. The release
wrapper does not contain the test harness: the first invocation failed with
`MODULE_NOT_FOUND` and is not counted as a test. The unchanged tests from source
commit `11c5cadceeb6824e578b203b39705b714fa88841` were then mounted read-only at
`/kutt/tests`; the corrected full run exited zero.

Passed groups include migrations/rollback, configuration, tokens/domain scopes,
lifecycle, history/trash/restore, Library, transfer, QR, admin filters, campaigns,
workspaces, routing, analytics, privacy, SSRF transport, webhooks, forwarding,
destination health, credential-free Shortcut artifacts, security and OIDC.
No browser tests or Apple Shortcuts application were run by this suite. It used
its own temporary databases and did not attach production data or credentials.
This is fresh API/protocol regression evidence, not completion of the rendered
audit, a physical-device test, or a production backup/restore drill.
At this checkpoint, the temporary fixture and regression containers, remote test
files and SSH tunnel were removed; the responsive viewport override was reset.
A byte-verified, integrity-checked synthetic database checkpoint is retained
outside Git for resuming the audit. Production remained on the same healthy image
with zero restarts. No production backup or new deployment is claimed.

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
| UX-008 | P1 | Custom confirmation dialogs leave keyboard focus behind the overlay | Fresh keyboard/DOM checks, screenshot | Open |
| UX-009 | P2 | Mobile webhook save errors are outside the visible viewport | Rejected private target, preserved draft and measured status geometry | Open |
| UX-010 | P2 | Small navigation links fail minimum text contrast | Rendered computed colors and calculated ratio | Open |
| UX-011 | P2 | Legacy Copy shows success even when the clipboard rejects the write | Controlled rejection, copied CSS state and unhandled error | Open |
| UX-012 | P3 | Unavailable recipient pages are bare messages without a named page or next step | Fresh expired/paused pages and source | Open |

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
The [protected-link form](../server/views/partials/protected/form.hbs) reproduces
the same problem: after a wrong password there is no `aria-invalid`,
`aria-describedby`, alert or live region. The visible error is clear, and a correct
password subsequently reached `https://example.org/audit-only`; preserve that
recovery path. The 320px recipient form had no horizontal document overflow.

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

### UX-008: Make Custom Dialogs Keyboard Operable

Promoted from C-01. Pressing Enter on the row delete action opens the custom
`Move link to trash?` confirmation, but focus remains on the trigger behind the
overlay. Escape does not close it. The next Tab focuses the background pagination
button `20`, not Cancel or Move to trash. The frame is a plain `div.dialog.open`
without a dialog role, accessible name or modal state. Cancel closes the overlay
but focus falls back to the document instead of returning to the trigger.

This is independently reproduced in the application, not the native-confirm
tool timeout. No link was deleted during this check. The confirmation clearly
explains that aliases and data are retained; preserve that useful copy.

Sources: [dialog frame](../server/views/partials/links/dialog/frame.hbs),
[dialog handlers](../static/scripts/main.js).
Evidence: [custom confirmation](ui-ux-review/2026-09-15/13e-custom-modal-desktop.png).

Acceptance: named modal semantics, initial focus, Tab/Shift+Tab containment,
Escape/cancel, focus restoration and background non-interactivity for every
shared link/admin/domain dialog. Preserve explicit destructive confirmation,
authorization, asynchronous loading/errors and repeated HTMX open/close behavior.
Verify desktop/mobile and slow responses, including cancellation before load.

### UX-009: Keep Save Errors Visible

On mobile, creating a disabled webhook with receiver
`https://127.0.0.1/blocked-test` correctly fails validation without sending a
delivery. The form preserves its fields and selections. However, after Save,
the error status occupies y=-313..-272 at scrollY=457 in an 844px viewport; it is
entirely above the viewport. Focus is on the document, and there is no field-local
message or visible error near Save. The live-region semantics help assistive
technology but do not solve visual error discovery. Cancel also leaves the old
error at the top after the editor closes.

Sources: [integrations script](../static/scripts/webhooks.js),
[integrations template](../server/views/webhooks.hbs).
Evidence: [save position](ui-ux-review/2026-09-15/18b-webhook-error-mobile.png).

Acceptance: show a clear error at the relevant form/field or bring an error summary
into view, while retaining drafts, restoring usable focus and preserving live
announcements. Clear obsolete editor errors on cancel or successful correction.
Review long rule/forwarding/token forms for the same behavior without assuming
every form is broken. Retain server URL validation and explicit save actions.

### UX-010: Increase Navigation Text Contrast

The enabled Library/Links navigation on the mobile monitoring page renders at
14px, weight 400, foreground `rgb(32,148,243)` over `rgb(241,242,244)` with no
background image. Relative-luminance calculation gives **2.8441:1**, below the
4.5:1 minimum for ordinary text. These are functional text links, not disabled
controls or exempt logotypes. The same link styling is visible in settings and
workspace navigation, but each affected surface and state must be checked.

Source: [styles](../static/css/styles.css).
Evidence: [monitoring navigation](ui-ux-review/2026-09-15/19-health-mobile.png),
[settings navigation](ui-ux-review/2026-09-15/16c-settings-mobile.png).

Acceptance: preserve the existing palette while choosing readable link colors,
including hover/visited/focus states on their actual backgrounds. Check button,
placeholder and error text independently; do not infer whole-site compliance from
one fixed token. Keyboard focus, reduced motion and zoom remain separate checks.
Basis: [W3C Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### UX-011: Report Clipboard Failure Honestly

Promoted from C-02. In the disposable document, `clipboard.writeText` was replaced
temporarily with a rejected `NotAllowedError` promise. The workspace Copy action
correctly reported `Copy failed. Select and copy the short link.` The legacy
personal-row action instead set `.clipboard.small.copied`, emitted an unhandled
`NotAllowedError`, and left the status region empty. No clipboard write succeeded
in that test. A previous uninjected write was checked byte-for-byte successfully.

Source: [legacy copy handler](../static/scripts/main.js). The screenshot attempt
for the transient legacy copied state was rejected because its capture geometry
was invalid; confirmation rests on current-run DOM state and console error, not
that image. Reload removed the temporary override and its absence was verified.

Acceptance: await the write before success styling, catch unavailable/denied
clipboard errors, expose truthful accessible feedback and a selectable fallback.
Cover top-level, row and legacy API-key copy actions without regressing workspace
or QR fallback behavior. Do not request broader browser permissions to mask failure.

### UX-012: Give Unavailable Links A Useful Recipient Page

Paused and expired synthetic links correctly return HTTP 410 and never redirect.
However, the browser displays only `This short link is not currently available.`
on a bare page. Its title is the URL, with no heading/landmark or next step. The
existing styled 404 page has both a meaningful title and a homepage link. This
is a presentation/recovery-context improvement, not a failure of availability
enforcement. The screenshot is a genuine 320 x 720 page, not a broken capture.

Source: [unavailable response](../server/handlers/links.handler.js).
Evidence: [expired recipient](ui-ux-review/2026-09-15/28-expired-recipient-mobile.png).

Acceptance: give browser recipients an accessible title, heading and brief next
step such as checking with the sender. Preserve 410, public unauthenticated access,
privacy and existing API/HEAD behavior. Do not expose the destination, owner,
password or detailed lifecycle reason, bypass policy, or suggest repeated retries
will repair an expired/disabled link. Test paused, expired, scheduled, quota-capped
and trashed links alongside password-protected and missing links.

## Source Concerns Requiring Rendered Validation

These are not counted as confirmed UX defects. Validate, merge into an existing
finding, promote to a new UX ID, or reject with evidence. Do not blindly redesign.

| ID | Concern and source | Required validation |
| --- | --- | --- |
| C-01 | Confirmed and promoted to UX-008 | Shared admin/domain variants and Shift+Tab remain in the fix acceptance scope |
| C-02 | Confirmed and promoted to UX-011 through controlled document-level rejection | Browser permission settings untouched; token and QR variants remain in acceptance coverage |
| C-03 | Main Settings is a row of unrelated links plus long stacked forms; feature navigation differs between pages in [settings.hbs](../server/views/settings.hbs) | Admin and ordinary-user navigation are reachable; ordinary user has no Admin link. Still check every feature, current-page context and back paths before deciding whether a change is warranted |
| C-04 | Suspected cross-form draft clobbering rejected: target Update retained paused/max-redirect drafts; Save availability retained an unsaved target. Close discarded the draft as requested | Keep separate forms unless further evidence warrants change. Legacy expiry/lifecycle-end interaction and workspace comparison still need checking |
| C-05 | Navigation contrast confirmed as UX-010 | Remaining enabled/error/hover/focus, keyboard, zoom and reduced-motion measurements are not yet complete |
| C-06 | Webhook error visibility confirmed as UX-009. Rules preserved draft on synthetic 401; normal retry saved. Live activity paused/resumed correctly. Invalid analytics range hid stale output and correction recovered it | Remaining slow/offline/403/409/5xx, actual stale-write conflicts, other editors, forced live reconnection and duplicate-submit tests still required |
| C-07 | One HTMX swap error occurred during local fixture login (`insertBefore` on null), although login and subsequent navigation succeeded. A later fresh viewer login succeeded with no captured console errors | Not reproduced in that second run; retain as an unconfirmed race candidate, not a production outage or a confirmed defect |

## Remediation Order And Status Contract

1. **AUDIT-00: finish the coverage matrix** using the approved browser mechanism;
   capture and inspect fresh desktop/mobile evidence, including ordinary-user and
   workspace roles. Resolve C-01 through C-06. Status: **in progress in the
   intermittently failing in-app browser**. Standalone Playwright permission is still pending
   for unsupported/failing browser checks; no alternate browser was used.
2. Fix UX-001, UX-003 and UX-002 in that order; shared components may overlap, but
   document and validate each finding independently.
3. Fix UX-008 before UX-004 through UX-007, then UX-009 through UX-012 and all additional confirmed findings in severity
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
| 2026-09-15 | AUDIT-00, UX-008, C-01..03 | Resumed in a fresh in-app tab and exact-image disposable fixture; confirmed custom modal focus/Escape defect; accepted mobile SSO/settings and desktop/mobile QR captures | Keyboard link creation and QR option changes passed; short-link clipboard bytes matched. Eight open findings, five remaining concerns. No runtime fixes or production mutation. Unsupported clipboard-denial simulation and remaining coverage stay open. |
| 2026-09-15 | AUDIT-00, UX-009..011, C-02/04/05/06/07 | Confirmed off-screen webhook errors, measured low link contrast and legacy false clipboard-success feedback. Exercised shared-link creation, routing preview, security/monitoring views and independent edit saves | Eleven open findings. Synthetic clipboard and one routing 401 failure tested through the existing tab; overrides removed and normal save restored. No production changes. Cross-form draft-clobber suspicion rejected, other coverage remains open. One login HTMX error needs reproduction. |
| 2026-09-15 | AUDIT-00, UX-005/012, C-03/06/07 | Added viewer acceptance/read-only rendering, direct role boundary checks, analytics empty/populated/range recovery, recipient password correction and 320px pages; full offline image regression passed | Twelve open findings. Native Library cancel/confirm worked; separate browser Restore stalled. API restore passed with pause retained. Fresh login did not reproduce C-07. Runtime fixes, full audit completion and release/deployment gates remain open. |
