# UI/UX Review And Remediation Ledger

Last updated: 2026-09-15 (Europe/Paris).

**Status: initial findings recorded; the full rendered audit is not yet complete.**
Fifteen findings are confirmed, none is fixed. Remaining concerns and workflow
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

Current-run Codex in-app browser captures at desktop 1440 x 1000, tablet
768 x 1024, and mobile 390 x 844 / 320 x 720, with DOM/accessibility snapshots and targeted source review. Screenshots
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
That initial browser Restore acceptance remained open; the later successful
rendered test below supersedes this blocker. Do not infer an application outage
from the tooling stall.

In a later fresh tab, Restore's native confirmation was observed through the
same tab's CDP event stream. Cancel left the synthetic paused link in Trash.
Initiating the observed button activation without awaiting it, then accepting
the exact pending confirmation in the same invocation, completed successfully.
The rendered article said `Restored. Paused`; an independent API check found no
trashed link and the public URL still returned 410. Reload displayed
`Links: 0` and `Trash is empty.` This validates the rendered action and response,
not an end-to-end keyboard Restore path. No API restore was used in this test.

A fresh tab subsequently resumed from the integrity-checked synthetic checkpoint.
Some semantic pointer/key actions still timed out or had no effect; the same
tab's supported CDP activated the already-observed form controls successfully.
Those saves validate rendered forms and responses, not genuine pointer or
keyboard acceptance. Editor login and a shared-description save passed; owner
controls remained absent. Forwarding save/preview and tracking save/reload passed.
Tracking was restored to its original enabled value. Retention was previewed only;
no deletion was applied. The fixture remained isolated and production unchanged.

Forwarding was then exercised with document-local fetch faults: JSON 403/409,
HTML 503, a rejected network promise, HTML 200, and a manually released pending
request. No injected PUT reached the server. The first four preserved the draft
and reported failure; HTML 200 falsely reported success (UX-014). Two activations
while pending produced only one request and disabled editing until completion.
All overrides were removed and their absence checked. Reload proved the failed
draft was not persisted, and an ordinary save subsequently succeeded.

An actual independent authenticated API client then saved the unchanged forwarding
policy, advancing its revision from 2 to 3 while the rendered editor retained the
old revision. The browser save was rejected with the conflict/reload message.
The first draft-setting expression had a syntax error and is not counted; after
correcting it and verifying the edited textarea, a second stale save preserved
`audit_conflict` in the draft and again reported conflict. Explicit Reload
restored the unchanged server allowlist and a normal browser save succeeded.
No response override or mocked 409 was used for this case.

The paused viewer link also exercised two ordered mobile routing rules. Moving
the second rule up changed preview to that rule's destination. Browser Save
persisted the order at revision 1. An independent authenticated client saved the
unchanged rules at revision 2; the stale browser save reported
`Routing changed elsewhere. Reload before saving.` and retained the edited name.
Canceling Reload retained that draft; accepting Reload recovered the saved names,
and a normal Save advanced to revision 3. The temporary rules were then removed
through the fixture API at revision 4 and the browser showed `No routing rules`.
The link stayed paused/public 410 throughout. No real links or response mocks
were used. Native dialog event handling, not genuine keyboard activation, was
used for the reload confirmations.

Reduced-motion emulation was supported by the same tab's CDP surface and
`matchMedia` confirmed it was active. The 320px Shortcut setup page had no
horizontal document overflow; that page, settled Recent links and the routing
editor had no active animations at the measured moments. This is limited state
coverage, not proof that every loading/hover transition respects the preference.
The high-level screenshot incorrectly rendered at half scale and was rejected;
the accepted CDP capture is linked below. Emulation and viewport overrides were
reset afterward. No Shortcut token was created and the Apple Shortcuts app was
not used. A genuine Tab focused the homepage link and Return later opened the
focused Settings link, but intervening input batches still timed out; this is
partial keyboard evidence, not a complete keyboard-only workflow.

A fresh outsider session saw no workspace or pending invitation, and direct
workspace navigation returned 404 without shared content. A fixture-only API
client invited that synthetic account as a viewer; pending access remained 404.
The rendered Decline action removed the invitation without granting access.
After a second invitation, rendered Accept opened the read-only workspace;
independent API checks rejected viewer writes. Promotion through the fixture API
made editor controls appear after refresh. With a description draft open, a
subsequent API downgrade to viewer caused the rendered Save to reject the write,
show `Your workspace role does not permit this action.` and remove editing
controls. The persisted description stayed unchanged. At 390px the role error
was visible above the workspace with no horizontal document overflow. Revocation
then removed both page and API access; the original synthetic membership set was
restored. These role changes touched only disposable accounts and test links.
The helper initially expected 200 from a successful role update; the actual 204
was checked against the handler, the assertion corrected, and current role
verified before continuing. No duplicate promotion was sent. Native Decline
activation timed out before dispatch; supported same-tab page control activation
completed the rendered form tests, not genuine pointer/keyboard acceptance.
Later ordinary owner-side controls also worked: Invite created a pending viewer
invitation; native revoke Cancel preserved it and Confirm removed it, returning
to All workspaces. Saving the existing synthetic viewer's role as Editor persisted
after reopening management; saving Viewer restored the original role. Read-only
database inspection confirmed exactly the original editor/viewer memberships,
both accepted, with no outsider membership. One semantic value-read timed out;
a same-tab DOM read verified the value before the restoration action continued.

Ordinary in-app controls subsequently worked for the Library: assigning the audit
collection to one selected link added its badge; filtering by that collection
returned exactly that link. Replacing a saved filter, clearing the current filter
and reopening the saved filter retained the new collection criterion. Removing
the assignment yielded zero matching links without deleting the link. The
original tag-based saved filter was restored. A verified six-link checkpoint was
taken before adding 51 paused pagination-only links. Their API pages contained
50 and 1 distinct results. The rendered first page selected exactly its 50 rows;
Next showed one unselected row, Previous and no Next. Enter in a narrowed Search
reset page 2 to page 1 with one matching unselected result. These successful
semantic pointer/keyboard actions do not erase the earlier tool failures or
complete keyboard-only audit coverage.

QR download activation in the fresh tab again produced no verified PNG/SVG file;
the SVG attempt also produced no captured network response or failure event.
Delivery therefore remains unverified, not reported as an application failure.
The rendered 512px preview was independently decoded from its canvas pixels with
the repository's QR decoder, yielding exactly the displayed public short URL and
not the destination. The first ES-module import of the CommonJS decoder failed;
loading it with `createRequire` succeeded. Print-media emulation hid the controls
and heading while retaining the loaded QR sheet. Screen media was restored; no
printer dialog, print job or physical scan was performed. Console history also
contained the existing C-07 HTMX swap error around both local sign-ins; neither
prevented the audited navigation or saved actions, and its cause remains open.

No screen-reader, physical iPhone/Safari, browser zoom, actual
clipboard permission-denial or fresh human MFA acceptance is claimed. The
clipboard test injected a rejected promise into the disposable document only.
The native file chooser timed out with both observed file-input activation
methods. Import testing continued through the visible Content field; it is not
counted as file-chooser acceptance. The export download event also timed out,
but the file actually arrived in Downloads: fresh timestamp, JSON schema 1,
1,680 bytes and exactly the two expected synthetic links were verified. Conversely,
PNG/SVG download activations produced no verified new file under the advertised
filenames; their actual browser-download acceptance remains open. A pre-existing
unrelated `qr-code.png` was identified by its old timestamp and left untouched.
DOM names are evidence of semantics, not
proof of complete assistive-technology compatibility. Historical regression tests
do not replace the missing fresh audit steps.

## Workflow Coverage

Additional settled-login and recovery checks used a fresh fixture session. Normal
typing and semantic fill again focused fields without entering text; supported
same-tab control activation submitted the existing synthetic credentials. Waiting
for the delayed login redirect to finish, without an intervening navigation,
reached the populated home page with no captured console errors. This did not
reproduce C-07, but does not establish the cause of its earlier occurrences.
Native Tab focused the unnamed create button, then Advanced options; Space
expanded the latter. This is partial keyboard evidence, not a complete login or
link-creation workflow. The button's missing name remains UX-001; an outline-only
style read is not enough to judge its complete focus appearance.

Campaign draft changes did not alter the destination before Apply. A long value
containing spaces, `&` and `/` applied correctly while retaining encoded path
`/a%2Fb`, unrelated query `keep=a%26b` and fragment `#section%20two`. Clear removed
only campaign parameters and emptied their fields. Both actions explicitly said
`Changes not saved yet.` No link was created. Ordinary click dispatch failed;
the same tab's supported page-control activation completed these rendered checks.

For a real live-activity interruption, only the loopback fixture's SSH tunnel was
terminated. The rendered status changed from `Connected` to `Reconnecting...`
while retaining 21 entries. Reopening that tunnel restored `Connected` without
reloading the page. An independent fixture client saved an unchanged forwarding
policy at a newer revision, producing one fresh event; the browser then contained
22 unique event IDs, with the new event first. No response or EventSource mock
was used. At 390 x 844, the status and wrapped event list fit without horizontal
document overflow. This tests transport recovery, not expired SSO or revocation.

QR image copying was tested with a document-local held/rejected clipboard promise.
Two activations called the clipboard once; the control was disabled and exposed
`aria-busy=true` with `Copying...`. Rejection produced
`Could not copy image. Retry or download PNG.` in a status region, then re-enabled
the control and cleared busy state. The mobile feedback was visible. Reload
removed the audit function/markers and restored the browser's clipboard wrapper;
its normal own-property implementation is not itself evidence of a remaining
override. No clipboard content or browser permission was changed.

Native controls later worked long enough for an uninterrupted keyboard-only link
creation at 390px, followed by desktop Tab/Enter navigation into that link's editor
and typing/Enter to save `Keyboard save verified`. The row and success message
confirmed persistence. The next Tab reached Availability. Reverse-tab navigation
timed out and reset the controller, but inspection of the same tab established
that focus had reached Description. Keyboard select-all/typing then entered a
different draft; Tab reached Close and Enter removed the editor, leaving the
saved description unchanged. No pointer or programmatic field activation was
used in that create/edit/cancel sequence. The timeout and missing action names
are not erased by its successful recovery. This validates these specific paths,
not every keyboard/role/error variant. Captured console errors were empty after
the final cancel. The extra link exists only in the disposable fixture.

| Step | Workflow | Current result | Remaining acceptance |
| --- | --- | --- | --- |
| 1 | Production SSO entry | Desktop and fresh 390px mobile observed; clear Authentik action, misleading sign-up label | Auth error/cancel/expired-session states |
| 2 | Empty home and first link | Mobile/desktop observed; native keyboard entry and Enter created a synthetic link at 390px | 320px reflow, 200/400% zoom and remaining keyboard/error variants |
| 3 | Invalid URL and campaign creation | Invalid input rejected; campaign applied and link created. Separate no-apply draft leaves target unchanged; long encoded Apply/Clear preserves unrelated URL components and explicitly states changes are not saved | Accessible announcements and complete keyboard flow |
| 4 | Recent links and inline editing | Desktop actions and mobile edit observed; native keyboard edit/save and a separate draft/Close passed, with recovery after a tool timeout. Independent target/availability drafts survive. Clearing legacy expiry then saving description silently restores the old expiry (UX-015), verified in the fixture database | Mobile action access, remaining keyboard/error variants, workspace comparison and UX-015 remediation |
| 5 | Library filtering and bulk pause | Pause succeeded; state label contradicts result; mobile heading overlap. Label creation/assignment/filter/rename and saved-filter save/reopen/rename/replace passed. Collection unassignment updates the filtered result without deleting the link. With 51 synthetic links, pages show 50/1, page selection does not carry, and Enter search resets a later page to page 1 | Saved-filter/label deletion paths, fuller keyboard flow and clear success feedback |
| 6 | Import/export | Invalid schema reported; valid dry run and explicit commit created one link. Editing content invalidates preview/confirmation. Conflicting alias aborts; Skip preview and commit report 0 created / 1 skipped. Actual JSON export file verified with two expected synthetic links | Native file chooser blocked by tool timeout; templates and fuller mobile/error/retry coverage remain |
| 7 | Trash and history | Native bulk cancel preserved selection/focus, confirm trashed one synthetic link; custom dialog focus/Escape defective. Later browser Restore cancel/confirm succeeded through supported dialog handling, showed Restored/Paused and retained public 410; refresh confirmed empty Trash. Populated history reflows at 320px | Complete keyboard Restore path, history pagination, remaining dialog variants and reserved-alias recovery |
| 8 | QR | Fresh desktop/mobile preview accepted; keyboard Apply changed 512/M to 256/H and updated download URLs. Fresh rendered 512px preview independently decodes to the public short URL. Print media hides controls and retains the QR sheet. Document-local clipboard rejection reports truthful visible feedback; two pending activations call once and busy state clears | Actual PNG/SVG download not verified after controls activated; print-dialog/PDF and physical scan remain |
| 9 | Workspaces | Owner create/share/invite and role saves passed; native pending-revoke cancel/confirm passed. Invitation accept/decline and viewer UI passed. Outsider/pending/revoked page and API access denied. Stale editor Save after downgrade was rejected with an explicit role error and unchanged data. Mobile error fits. Original memberships restored | Leave/cancel and complete keyboard paths; broader shared-link edit/availability variants |
| 10 | Routing and forwarding | Rule reorder changed first-match preview and persisted. Actual routing revision conflict retained the draft; Reload cancel/confirm and normal Save recovered. Synthetic routing 401 preserved the draft. Forwarding preview retained allowed keys; tablet layout fits. Forwarding 403/409/503/network errors preserved draft; pending duplicate activation sent one request. Actual forwarding conflict/reload/save passed. HTML 200 falsely reports save success | Broader editor fault coverage and UX-014 remediation |
| 11 | Analytics and privacy | Empty mobile and populated desktop report observed; synthetic redirect counted once. Date-range changes passed; invalid range hid old report and correction recovered it. Tables match chart. Tracking save/reload passed and original state restored. Mobile retention preview clearly names cutoff, count and irreversible effect; no purge applied | Browser export/download, pagination and failure/retry states; fresh offline privacy/API coverage passed separately |
| 12 | Monitoring and integrations | Mobile monitoring empty state accepted; live events connected, paused and resumed. Real fixture-tunnel interruption showed Reconnecting, then recovered automatically and delivered one new event without duplicates; mobile list fits. Private webhook target rejected and draft retained, but error off-screen | Pending/failed checks, webhook delivery/retry and remaining faults |
| 13 | Settings, tokens and security | Admin and ordinary-user mobile settings inspected; feature links reachable and Admin absent for ordinary user. Security diagnostics and clipboard behavior observed. Shortcut entry fits at 320px with explicit Settings/Library returns and clearly bounded token scope; no token created | Token lifecycle UI requires credential handoff; OIDC modes and session revocation; fresh offline protocol tests passed separately |
| 14 | Administration and recipient pages | Protected page reflows at 320px. Wrong password rejected, correction reached intended destination. Paused/expired return a bare 410 message; styled 404 has a return link. Admin links/users/empty domains inspected; mobile clipping, tab semantics and stale pagination confirmed | Admin filters/dialog variants/report form, scheduled/capped recipient states and broader keyboard/zoom checks |

### Continuation Evidence

These captures are from the resumed in-app audit, not an earlier release test.
The viewport is 390 x 844 unless the row identifies a desktop, tablet or 320px capture.

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
| 10 | [Forwarding tablet](ui-ux-review/2026-09-15/29-forwarding-tablet.png) | 768 x 1024; saved narrow allowlists and preview dropped `secret=ignored` while retaining `utm_source=audit` |
| 11 | [Retention preview](ui-ux-review/2026-09-15/30-retention-preview-mobile.png) | 390 x 844; cutoff/count and irreversible warning visible; acknowledgement left unchecked and no deletion applied |
| 14 | [Admin links mobile](ui-ux-review/2026-09-15/31b-admin-links-mobile.png), [empty domains desktop](ui-ux-review/2026-09-15/32-admin-domains-empty-desktop.png) | Mobile tabs/actions are clipped. Desktop Next is enabled with zero domains; first doubled mobile capture rejected |
| 10 | [Forwarding false success](ui-ux-review/2026-09-15/33-forwarding-false-save-desktop.png) | 1440 x 1000; intercepted HTML 200 causes saved feedback for a draft that reload proves was not persisted |
| 7 | [History at 320px](ui-ux-review/2026-09-15/34-history-mobile.png) | 320 x 720; organization and earlier edits are readable without horizontal overflow; header is cramped but measured link rectangles do not overlap |
| 4 | [Expiry silently restored](ui-ux-review/2026-09-15/35-expiry-reintroduced-desktop.png) | 1440 x 1000; description-only Update restores a cleared two-day expiry while the later scheduled End and previous lifecycle success remain displayed |
| 10 | [Real forwarding conflict](ui-ux-review/2026-09-15/36-forwarding-real-conflict-desktop.png) | 1440 x 1000; an independent authenticated client's revision change causes the real conflict response while `audit_conflict` remains in the unsaved browser draft |
| 7 | [Browser Restore result](ui-ux-review/2026-09-15/37-restore-desktop.png) | 1280 x 720; successful native confirmation shows Restored/Paused. Subsequent refresh confirms empty Trash; public URL remains 410 |
| 13 | [Shortcut entry at 320px](ui-ux-review/2026-09-15/38-shortcut-mobile.png) | 320 x 720; setup, scope and return navigation fit with reduced-motion emulation active; no credential generated or Shortcuts app opened |
| 10 | [Real routing conflict](ui-ux-review/2026-09-15/39-routing-real-conflict-desktop.png) | 1440 x 1000; stale-write rejection retains the edited rule name. Error text measures only 3.5696:1 contrast |
| 9 | [Workspace downgrade at 390px](ui-ux-review/2026-09-15/40-workspace-downgrade-mobile.png) | 390 x 844; stale editor submission is rejected, role becomes viewer, editing controls disappear and the persisted description remains unchanged |
| 12 | [Live recovery at 390px](ui-ux-review/2026-09-15/41-live-reconnect-mobile.png) | 390 x 844; Connected after an actual fixture-tunnel interruption, with a newly received event and wrapped list. No page reload or EventSource mock |
| 8 | [QR clipboard rejection](ui-ux-review/2026-09-15/42-qr-copy-failure-mobile.png) | 390 x 844; failure and PNG fallback visible, control available again. Document-local injection removed on reload; browser permission untouched |

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
| UX-010 | P2 | Navigation links and routing errors fail minimum text contrast | Rendered computed colors and calculated ratios | Open |
| UX-011 | P2 | Legacy Copy shows success even when the clipboard rejects the write | Controlled rejection, copied CSS state and unhandled error | Open |
| UX-012 | P3 | Unavailable recipient pages are bare messages without a named page or next step | Fresh expired/paused pages and source | Open |
| UX-013 | P2 | Admin tab switches leave Next enabled beyond the last result | Four-user and zero-domain initial tab states; empty-page navigation and recovery | Open |
| UX-014 | P2 | Forwarding treats HTML 200 as a successful save | Document-local login-response simulation; persisted policy unchanged | Open |
| UX-015 | P1 | Saving an unrelated field silently restores an expiry cleared in the sibling form | Rendered sequential saves, screenshot and read-only fixture database checks | Open |

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

Admin scope was confirmed freshly: row actions and filter selects are unnamed,
and the Links/Users/Domains controls are anchors without `href` or explicit
`tabindex`. Calling focus did not move focus onto a tab. No `aria-selected` is
provided despite an active CSS class. Use native focusable controls with a
coherent keyboard/selected-state pattern; do not fix names alone. The admin links
filter also repeats `links-select-anonymous` for two distinct selects; keep labels
and IDs unambiguous. Source: [admin tabs](../server/views/partials/admin/table_tab.hbs).

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

The mobile admin Links/Users/Domains tabs sit at x=582..793 in a 390px viewport;
the same inner-table clipping hides them and the row actions while document
scroll width remains 390px. Include all admin table variants in this fix, rather
than assuming the home-table correction covers their independent templates.

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

### UX-010: Increase Navigation And Error Text Contrast

The enabled Library/Links navigation on the mobile monitoring page renders at
14px, weight 400, foreground `rgb(32,148,243)` over `rgb(241,242,244)` with no
background image. Relative-luminance calculation gives **2.8441:1**, below the
4.5:1 minimum for ordinary text. These are functional text links, not disabled
controls or exempt logotypes. The same link styling is visible in settings and
workspace navigation, but each affected surface and state must be checked.

The actual routing conflict message independently renders at 16px, weight 400,
foreground `rgb(255,0,0)` over the same `rgb(241,242,244)` background, with a
transparent status background. Its measured contrast is **3.5696:1**, also below
4.5:1. It is essential error text, not a disabled control. Keep this in the same
color/contrast finding rather than duplicating the remediation.

Source: [styles](../static/css/styles.css).
Evidence: [monitoring navigation](ui-ux-review/2026-09-15/19-health-mobile.png),
[settings navigation](ui-ux-review/2026-09-15/16c-settings-mobile.png),
[routing error](ui-ux-review/2026-09-15/39-routing-real-conflict-desktop.png).

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

### UX-013: Initialize Admin Pagination After Tab Changes

From Admin Links, switch to Users. All four synthetic users fit under the selected
10-row limit, but both Next buttons remain enabled. Activating Next moves to
`skip=10`, displaying `No users.` while the total still says four. Previous returns
all four and correctly disables Next. Switching to Domains reproduces the
initial enabled Next with zero total domains. This can make existing records
appear absent; it is not data loss.

Sources: [admin navigation](../server/views/partials/admin/table_nav.hbs),
[users table lifecycle](../server/views/partials/admin/users/table.hbs),
[navigation state](../static/scripts/main.js). The shared template initially
enables Next, while client synchronization depends on the HTMX lifecycle.

Acceptance: derive both pagination controls from the newly rendered total, skip
and limit after a tab/table replacement; clamp impossible navigation; preserve
filter/page-size behavior and server authorization. Test 0, 1, exactly one page,
multiple pages, filtering from a later page and links/users/domains switches.
Verify that empty filtered results are distinct from an out-of-range page and
that recovery does not silently reset unrelated filters.

### UX-014: Validate Save Responses Before Reporting Success

On a synthetic forwarding page, edit an allowlist, then intercept its PUT in the
disposable document with HTTP 200, `Content-Type: text/html`, and a minimal login
page. The form says `Allowlists saved.` even though the request never reached the
server. Restoring fetch and using Reload returns the previous saved allowlist.
The response parser catches invalid JSON as `{}` and accepts any successful HTTP
status; the save path also replaces its revision with `undefined`.

Source: [forwarding request/save handling](../static/scripts/forwarding.js).
Evidence: [false success](ui-ux-review/2026-09-15/33-forwarding-false-save-desktop.png).
JSON 403 and 409, HTML 503, network rejection and a held request were separately
tested: their errors/draft retention and pending duplicate-submit lock worked.

Acceptance: require the expected JSON content and response shape, including a
valid revision, before reporting success or replacing local state. Preserve the
draft and explain session/retry recovery for unexpected or redirected login
responses. Validate load/save/preview and inspect sibling request helpers for
the same pattern; do not claim siblings are confirmed without reproduction.
Keep genuine API status codes, concurrency protection and WAF/SSO unchanged.
Test HTML 200, malformed JSON, missing/wrong fields, redirects, ordinary failures,
successful retry and stale revisions. No broad authentication bypass is allowed.

### UX-015: Do Not Resubmit Stale Expiry After Availability Changes

The legacy link editor and the Availability form share persisted expiry state but
update separate HTML fragments. On the personal synthetic link:

1. Save `Expire in: 2 days`, then close/reopen the editor.
2. Select `Remove previous expiry`, set End to `2026-09-20T12:00` UTC and Save
   availability. Read-only database inspection confirms `expire_in: null` and
   `ends_at: 1789905600000`.
3. The sibling legacy form still displays `2 days`. Change only Description and
   select Update. Both forms display success, but database inspection confirms
   expiry was silently restored to `2026-09-17 03:47:27`, earlier than End.

The link remained paused with its 23-redirect cap throughout this isolated test;
no real links were changed. This is a confirmed data-changing defect, not merely
contradictory wording. Creating legacy expiry also leaves the already-open
Availability form without the removal checkbox until the editor is reopened.

Sources: [legacy editor](../server/views/partials/links/edit.hbs),
[availability fragment](../server/views/partials/links/lifecycle.hbs),
[lifecycle parsing](../server/link-lifecycle.js).
Evidence: [rendered result](ui-ux-review/2026-09-15/35-expiry-reintroduced-desktop.png).

Acceptance: synchronize server-owned expiry state across the two forms, or send
only intentionally changed fields with conflict protection. Do not restore the
old broad cross-form replacement that loses unrelated target/availability drafts.
Test clear-expiry then description/target saves, new expiry then lifecycle save,
different end dates, unchanged relative-expiry resubmission and stale concurrent
edits. Preserve legacy API clients, explicit expiry changes, pause/cap settings,
and independent unsaved fields. Compare workspace/admin variants before claiming
those surfaces affected or fixed. Verify the effective public availability using
a synthetic clock; do not wait for or alter real link expiration.

## Source Concerns Requiring Rendered Validation

These are not counted as confirmed UX defects. Validate, merge into an existing
finding, promote to a new UX ID, or reject with evidence. Do not blindly redesign.

| ID | Concern and source | Required validation |
| --- | --- | --- |
| C-01 | Confirmed and promoted to UX-008 | Shared admin/domain variants and Shift+Tab remain in the fix acceptance scope |
| C-02 | Confirmed and promoted to UX-011 through controlled document-level rejection. QR pending/duplicate/rejection behavior separately passed with truthful visible fallback | Browser permission settings untouched; credential/token variants remain in acceptance coverage; retain passing QR behavior |
| C-03 | Not promoted to a separate defect: varied Settings/feature navigation does not by itself justify a redesign | Reviewed feature templates expose named headings and explicit return links; rendered settings/security, monitoring, analytics, workspaces, library, import, history, QR, routing, forwarding and Shortcut entry corroborate context and recovery paths. Ordinary users have no Admin link. The actual mobile navigation failures remain UX-002/003. Full keyboard navigation remains a separate acceptance gap; not every return link was keyboard-activated |
| C-04 | Original target/availability draft-clobber suspicion rejected for the tested fields; legacy expiry synchronization is now confirmed as UX-015 | Preserve the passing independent-draft behavior while fixing UX-015; workspace/admin comparisons remain acceptance work |
| C-05 | Navigation and routing-error contrast confirmed as UX-010 | Reduced-motion emulation verified with no active animations in sampled settled states; hover/focus, keyboard, zoom and animated/loading-state coverage remain incomplete |
| C-06 | Webhook error visibility confirmed as UX-009; forwarding false success confirmed as UX-014. Routing 401 and forwarding 403/409/503/network failures retain drafts. Actual two-client conflicts, retained drafts and reload/save recovery pass for routing and forwarding. Rule ordering/first-match preview and forwarding duplicate prevention pass. Analytics range recovery, live pause/resume and real transport reconnection with a new nonduplicated event passed | Other editor faults remain; document-level simulation and real transport interruption are not an expired-SSO ceremony |
| C-07 | HTMX swap error during earlier local fixture sign-ins (`insertBefore` on null). A subsequent fully settled sign-in, with no intervening navigation, reached the populated home page with no captured console errors | Repeated earlier log signal, not yet an isolated cause or confirmed user-visible defect. Compare navigation during the delayed HTMX redirect; the clean settled case does not prove the earlier cause or a fix |

## Remediation Order And Status Contract

1. **AUDIT-00: finish the coverage matrix** using the approved browser mechanism;
   capture and inspect fresh desktop/mobile evidence, including ordinary-user and
   workspace roles. Resolve C-01 through C-06. Status: **in progress in the
   intermittently failing in-app browser**. Standalone Playwright permission is still pending
   for unsupported/failing browser checks; no alternate browser was used.
2. Fix UX-015 first because it silently changes persisted availability, then
   UX-001, UX-003 and UX-002 in that order; shared components may overlap, but
   document and validate each finding independently.
3. Fix UX-008 before UX-004 through UX-007, then UX-009 through UX-011 and UX-013/014 before UX-012, plus all additional confirmed findings in severity
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
| 2026-09-15 | AUDIT-00, UX-001/002/013 | Resumed synthetic checkpoint; editor shared save, forwarding allowlist preview, tracking persistence and non-destructive retention preview passed. Inspected admin variants and confirmed stale Next controls after tab switches | Thirteen open findings, none fixed. Admin clipping/semantics extend existing findings. CI for documentation commit `fbf23ca3509ed07ec91c56c47d59b697bf8df52b` passed ([run 34921408106](https://github.com/RobinMJD/kutt/actions/runs/34921408106)). Browser pointer/key failures remain tool-limited; no runtime release, deployment or production change. |
| 2026-09-15 | AUDIT-00, UX-014, C-06 | Exercised forwarding 403/409/HTML 503/network/HTML 200/pending states in the disposable document; confirmed false saved feedback for HTML 200 | Fourteen open findings, none fixed. Draft retention, pending lock and one-request duplicate prevention passed. Overrides removed; persisted policy unchanged by injections; normal save passed. Remaining full-audit and release/deployment gates stay open. |
| 2026-09-15 | AUDIT-00, C-06 | Verified import preview invalidation, conflict abort, skip-only confirmation and actual JSON export artifact | Existing links unchanged by skip-only import. Export schema/count/expected aliases verified despite tool download-event timeout. Native file chooser and QR download delivery remain unverified; no application defect inferred solely from tool timeout. |
| 2026-09-15 | AUDIT-00 checkpoint | Preserved an integrity-checked, byte-matched synthetic checkpoint and verified export outside Git; removed the temporary container, seed mount and SSH tunnel; closed active audit tab and reset viewport | Checkpoint has four synthetic users, six links and no trashed links. Production remains `local/kutt:3.2.6-sr94.18`, healthy with zero restarts. No production backup/deployment or completed-audit claim. |
| 2026-09-15 | AUDIT-00, C-03/04, UX-015 | Resumed the verified synthetic checkpoint. Library create/assign/filter/rename and saved-filter reopen/rename passed; inspected populated history at 320px. Confirmed silent expiry restoration after an unrelated description save | Fifteen open findings, none fixed. UX-015 moves ahead of other fixes because it changes saved availability without intent. Exact fixture database values corroborate the rendered result. Ordinary fill/type still fails in the browser tool; supported document control activation is not keyboard acceptance. Full audit and runtime release/deployment gates remain open. |
| 2026-09-15 | AUDIT-00, C-06 | Tested a real independent-client forwarding revision change, stale browser rejection, retained draft and explicit reload/save recovery | No response mocks used. First draft setup expression failed and was corrected before acceptance. Only the synthetic expiry/end used for UX-015 were subsequently cleared by API and verified absent; pause/cap retained. This cleanup is not a fix for UX-015. Documentation commit `79aee34f338c9c9ff2deda52c2250c767c7208d0` CI passed ([run 34924332255](https://github.com/RobinMJD/kutt/actions/runs/34924332255)). |
| 2026-09-15 | AUDIT-00 checkpoint | Retained the expanded synthetic database outside Git after SQLite backup, matching local/remote SHA-256 and integrity checks; removed fixture, seed copy and tunnel; reset viewport and closed tab | Four synthetic users and six links retained. Production `kutt` is still healthy on `local/kutt:3.2.6-sr94.18` with zero restarts. No runtime fix/deployment occurred. The ordinary typing, native chooser/dialog/download and remaining accessibility gates still need the pending browser approval; no substitute mechanism was used. |
| 2026-09-15 | AUDIT-00, C-03/05/06, UX-010 | Browser Restore cancel/confirm succeeded; rule ordering, real routing concurrency, retained draft and reload/save recovery passed. Inspected 320px Shortcut entry under reduced-motion emulation; extended contrast finding to the measured routing error | Fifteen open findings, none fixed. C-03 does not warrant a separate redesign; actual mobile navigation defects remain tracked. Partial keyboard success does not close the keyboard gate. Previous documentation commit `4168c867a99e32e2e525e7bdc3a354044f9a0d2e` passed [CI 34926961192](https://github.com/RobinMJD/kutt/actions/runs/34926961192). No runtime or production change. |
| 2026-09-15 | AUDIT-00 checkpoint | Removed temporary rules and verified paused/public-410 state. Retained a new synthetic SQLite checkpoint outside Git with matching local/remote SHA-256 and integrity `ok`; removed fixture, seed and SSH tunnel, reset emulation/viewport and closed the audit tab | Four synthetic users, six links, no trashed links. Production remains healthy on `local/kutt:3.2.6-sr94.18`, zero restarts. Full audit, runtime fixes and their release/deployment gates remain incomplete. |
| 2026-09-15 | AUDIT-00, C-06/07 | Added rendered outsider/invitation/role-downgrade/revocation coverage, owner invite/role/revoke forms, collection assignment/unassignment, saved-filter replacement and 51-link pagination. Independently decoded rendered QR pixels and checked print-media visibility | Fifteen open findings, none fixed. Original roles and saved filter restored. Read-only/API checks corroborate denial and unchanged shared data. Native Library controls and Enter search passed in this segment; earlier tool failures remain. QR delivery still unverified; repeated login console error remains an unresolved candidate. Previous documentation commit `bac7f8510db5e24d5523a6d73aad3fa4b2593476` passed [CI 34929124611](https://github.com/RobinMJD/kutt/actions/runs/34929124611). No runtime release or production mutation. |
| 2026-09-15 | AUDIT-00 checkpoint | Retained an integrity-checked six-link checkpoint before pagination seeding, with matching local/remote SHA-256. Removed the temporary container including its 51 pagination-only links, seed mount and SSH tunnel; reset network/media/viewport overrides and closed the tab | Four synthetic accounts, six links and no trash retained outside Git. Live `kutt` freshly reports `local/kutt:3.2.6-sr94.18`, running/healthy, zero restarts. No production backup or deployment is claimed. Audit and remediation goal remain incomplete. |
| 2026-09-15 | AUDIT-00, C-06/07 | Added settled-login, partial Tab/Space, campaign no-apply/encoded Apply/Clear and real live-activity tunnel-interruption checks; accepted mobile recovery capture | Fifteen findings remain open, none fixed. Live feed recovered without reload and received one new event with 22 unique IDs. Only the disposable fixture's unchanged forwarding policy revision advanced (4 to 5); production unchanged. Previous documentation commit `294a1a084c31388297d4981fe2b6f28118f6d1e9` passed [CI 34931352598](https://github.com/RobinMJD/kutt/actions/runs/34931352598). Full audit and all runtime remediation/release gates remain open. |
| 2026-09-15 | AUDIT-00, C-02 | QR copy pending/rejection/duplicate handling passed; mobile fallback capture accepted. Native keyboard create, description save and draft cancellation passed after inspecting/recovering a timed-out reverse-tab action | Fifteen findings remain open, none fixed. QR override removed by reload and function inspection. Only one additional synthetic link created; no production data touched. Full keyboard variants, chooser/download/zoom/credential and other coverage gates remain. |
| 2026-09-15 | AUDIT-00 checkpoint | Retained a new SQLite backup outside Git, with four synthetic accounts, seven links, matching local/remote SHA-256 and integrity `ok`; the keyboard-test link retains its saved description, not its cancelled draft. Removed fixture, seed and tunnel; reset viewport and closed the tab | Production freshly remains `local/kutt:3.2.6-sr94.18`, running/healthy with zero restarts. No test override, listening tunnel or required command session remains. This is not a production backup or deployment; audit and remediation remain incomplete. |
