# Country Label Fix (.68)

## Cause

The legacy Statistics map stores ISO country IDs in lowercase (`fr`), whereas
the shared locale helper accepted only uppercase (`FR`). Visit totals and map
coloring were correct, but server-rendered accessible names and tooltips fell
back to the translated "Unknown" label. This is not a GeoIP lookup failure.

The shared server/browser helper now accepts two ASCII letters, normalizes
their case and uses `Intl.DisplayNames` for the selected language. Malformed,
missing or non-string values still use the translated Unknown label. There is
no migration, analytics rewrite, recount, reset or change to GeoIP collection.
Genuinely unavailable visitor locations remain unknown; do not invent countries.

## Acceptance Tracker

| Gate | Status |
| --- | --- |
| Reproduce regression | Passed: old image returns Unknown for map ID `mt`, instead of Malta. |
| Shared helper fix | Passed: focused i18n and HTTP negotiation/authorization tests. |
| Automated coverage | Passed: server/browser/template tests for all 177 map countries in EN/FR/ES, uppercase/lowercase/mixed case, malformed inputs; rendered map names and France tooltips across 18 light/dark 1440/390/320px layouts under enforced CSP. |
| Publication and release CI | Pending. |
| Recoverable backup, exact wrapper and image scan | Pending. |
| Deployed desktop/mobile UI and existing-service acceptance | Pending. |
| Post-change recovery, monitoring and documentation | Pending. |

The existing accepted deployment remains `.67.2` until release/deployment gates
pass. WAF, Authentik SSO, public redirects, links, users, secrets and real visit
statistics must remain unchanged. Browser plugin unavailable; rendered checks
use existing Playwright fixtures with enforced CSP.
