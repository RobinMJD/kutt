# Optional Content Security Policy

`CSP_MODE` accepts exactly `off`, `report-only` or `enforce`. It defaults to `off`
for compatibility with existing custom templates. Unknown, empty, misspelled or
policy-valued settings fail startup; there is no arbitrary policy/origin input.
This feature does not change authentication, authorization, TLS, proxy trust,
WAF rules, OIDC provider configuration or the application version.
This is defense-in-depth hardening, not a claim of a demonstrated exploitable
injection or a comprehensive application audit.

| Mode | Document header | Behavior |
| --- | --- | --- |
| `off` | No application CSP header | Existing browser behavior and HTMX evaluation defaults |
| `report-only` | `Content-Security-Policy-Report-Only` | Browser diagnostics without policy blocking; HTMX evaluation and fragment scripts remain enabled for staging customizations |
| `enforce` | `Content-Security-Policy` | Policy blocks disallowed content; HTMX evaluation and fragment scripts are disabled |

Enable `report-only` in an isolated test deployment first. Exercise your actual
custom templates, authentication, forms and integrations; inspect browser CSP
console messages and `securitypolicyviolation` events. Fix violations, then test
`enforce` before a separately authorized production change. A mode change requires
an application restart. There is no automatic fallback if a customization fails.
An independently configured proxy CSP still applies; multiple policies intersect
rather than replace each other. Do not weaken edge controls to hide conflicts.

## Policy and boundaries

Rendered full HTML documents receive a fresh 192-bit cryptographic nonce and
`Cache-Control: private, no-store`. The response header and trusted template
helpers use the same request-local value, isolated across concurrent requests.
Body, query, request headers and template model fields cannot supply the nonce.
Do not cache these documents at a reverse proxy or reuse a nonce in static HTML.

The fixed policy is:

```text
default-src 'none'; base-uri 'none'; object-src 'none';
frame-ancestors 'self'; frame-src 'none';
script-src 'nonce-<generated>'; script-src-attr 'none';
style-src 'self' 'nonce-<generated>'; style-src-attr 'none';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self';
form-action 'self'; manifest-src 'self'; worker-src 'none'; media-src 'none'
```

There is no script URL allowlist, wildcard, `unsafe-inline`, `unsafe-eval` or
`strict-dynamic`. Each trusted script element needs the server nonce, including
self-hosted scripts. Images allow `data:` and `blob:` for locally generated QR
previews and sanitized logos; this does not permit fetching arbitrary remote
resources. Clipboard permissions and secure-context requirements are unchanged.

HTMX fragments do not receive a replacement document policy. API responses,
static assets and public HTTP redirects retain their existing headers; QR SVG
attachments keep their independent `default-src 'none'; sandbox` policy. CSP
governs browser documents, not API access or validation of link destinations.
OIDC authorization/logout and public targets remain top-level navigations, not
cross-origin forms, frames or script fetches. Protected-link forms still submit
to the same origin before navigating to their validated destination.

No `report-uri`, `report-to` or report receiver is installed. Diagnostics stay in
the browser, so CSP reports cannot disclose document URLs, aliases or tokens to
a third party through this feature. Report-only is a local diagnostic stage,
not a central telemetry service. Avoid forwarding sensitive console output.

## Bundled UI and customizations

Bundled templates no longer contain executable `onclick`, `hx-on:*` or evaluated
`hx-vals` attributes. `static/scripts/ui-events.js` delegates named, inert data
attributes to explicit handlers. Capture-phase handlers preserve the former
target-handler order for dialogs, list drafts, pagination and HTMX requests.
Stats IDs are escaped template data and copied into request parameters without
eval; map handlers receive their event explicitly. Charts, QR downloads/copy/
print, forms, theme scripts and locale assets stay self-hosted.

HTMX's generated indicator style uses `inlineStyleNonce`. With either active CSP
mode, `attributesToSettle` includes only `class`, `width` and `height`, not
`style`: swapping copied style attributes would violate the style policy. Use
class-based transitions; trusted scripts may still set individual CSSOM
properties. `off` retains HTMX's previous settling configuration.

Custom view lookup still prefers `custom/views`; custom `/css` and `/images`
still take precedence, with custom CSS loaded after bundled CSS. There is no
new custom-script search path. Preserve the updated base layout/config and its
script includes when overriding a layout. For additional trusted script tags:

```hbs
<script nonce="{{cspNonce}}" src="/scripts/my-extension.js" defer></script>
```

Serve extensions through your existing controlled static-asset build. The
`cspNonce` helper takes no arguments and must only be used on administrator-
controlled code, never arbitrary user HTML or a user-selected script URL.
Nonce-bearing scripts are trusted capabilities, not a sanitizer. Do not copy
nonces from API requests or fragment responses, add them to every DOM script,
or turn an unsafe customization into a trusted one automatically.
Deploy the templates and scripts together and reload already-open browser tabs;
old layouts without the delegated script cannot operate the new fragment hooks.

Move custom inline event handlers, `hx-on`, `js:` values, expression-based
`hx-trigger` filters and eval-dependent libraries into explicit event listeners
in trusted scripts. Keep dynamic text as escaped data/textContent. Load scripts
in the full layout and delegate events for later fragments: enforcement does
not execute scripts inserted by HTMX. Put inline styles in self-hosted CSS and
replace external fonts/images/fetches with reviewed same-origin assets. Trusted
custom `<style>` elements can use `nonce="{{cspNonce}}"`; style attributes cannot.
New third-party integration requirements require a separately reviewed policy
change, not a catch-all escape or automatic disabling of protection.

## Verification

`tests/csp.cjs` covers strict configuration, concurrent nonce isolation, hostile
nonce/policy inputs, bundled source contracts, localized HTML, no-store and the
API/fragment/redirect/SVG boundaries. It runs in the full container suite;
`KUTT_TEST_ONLY=csp` selects only its focused development fixture.

```sh
sh tests/browser-csp.sh IMAGE
KUTT_TEST_CSP_MODE=report-only sh tests/browser-csp.sh IMAGE
sh tests/browser-csp.sh IMAGE dialogs
sh tests/browser-csp.sh IMAGE list-sorting
sh tests/browser-csp.sh IMAGE logout-navigation
sh tests/browser-csp.sh IMAGE validation
sh tests/browser-csp.sh IMAGE domain-proof
sh tests/browser-csp-oidc.sh IMAGE
KUTT_TEST_CSP_MODE=enforce sh tests/browser-qr-branding-locales.sh IMAGE
```

These runners create and remove fresh loopback-only SQLite containers with
synthetic credentials and no production mounts. Set `NODE_BINARY` and
`PLAYWRIGHT_MODULE` for local tooling; QR decoding also uses the existing
`QR_DECODER_MODULE`. Enforced UI coverage uses EN/FR/ES, light/dark and
1440/390/320px, plus the existing dialog and delayed list/editor race suites.
Injection probes cover inline scripts, wrong nonces, same-origin scripts without
a nonce, inline handlers and network-loaded eval, with report-only controls.
Real QR exports are independently decoded. Headless Chromium proof is not
physical-device, Safari, native printing or custom-deployment acceptance.

The OIDC browser runner uses an isolated synthetic HTTP provider with development
mode explicitly enabled. It exercises outage/retry, cross-origin top-level
authorization and cancellation back to the local app, without password fallback.
It never changes the production HTTPS-only provider requirement. The ordinary
logout runner covers both revoked full pages and revoked HTMX requests.

Primary references: [CSP specification](https://www.w3.org/TR/CSP/),
[HTMX configuration and scripting](https://htmx.org/docs/), and
[HTMX indicator styles and nonces](https://htmx.org/attributes/hx-indicator/).

## Candidate verification (2026-09-22)

- Full offline `tests/container-smoke.cjs`: passed through the final RS256 OIDC
  protocol/session checks and migration rollback/reapply. The later strengthened
  CSP-only assertions were rerun separately and passed, including 24 concurrent
  helper contexts and concurrent real full-page/layout-block nonce checks.
- Source/template/catalog compilation, changed JavaScript/shell syntax and diff
  checks passed. No new human-facing messages or catalog keys were needed.
- Enforced main UI: all 18 EN/FR/ES, light/dark, 1440/390/320 combinations passed
  with zero ordinary CSP violations or runtime errors. Malicious inline, wrong-
  nonce, unapproved script, event-handler and eval probes were blocked; the
  nonced control ran. Report-only permitted the controls and emitted reports.
- Enforced branded QR: all 18 combinations passed with independently decoded
  PNG/SVG, clipboard/print, late-response/error paths and object-URL cleanup.
- Enforced dialog/sorting races, logout/revoked-session recovery, validation
  failures/drafts and DNS ownership passed. Default-off dialog/sorting suites
  also passed. Enforced SSO-only outage/retry/cancellation passed at 390/1440px.
- French/Spanish light/dark desktop/mobile settings and chart screenshots were
  reviewed for clipping, overlap and contrast. No appearance redesign was made.

Local synthetic evidence: main UI `/var/folders/fd/hv8hnh4x4k3b8__jg5d6v2k40000gn/T/kutt-csp.tX9qXT/`;
QR `/var/folders/fd/hv8hnh4x4k3b8__jg5d6v2k40000gn/T/kutt-qr-locales.NoiyGw/`;
OIDC `/var/folders/fd/hv8hnh4x4k3b8__jg5d6v2k40000gn/T/kutt-csp-oidc.cjsJtN/`.
All containers used fresh synthetic data and were removed by their runners.
No parent checkout, live WAF/SSO, release version, dependency lock, schema or
catalog was changed. Publication/deployment and custom/Safari/native acceptance
remain separate gates; the unrelated full theme matrix was not rerun.
