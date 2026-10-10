# Country Label Fix (.68)

Current status (2026-10-10): included in the manually deployed `.69` image.
All 177 live map labels and France tooltips passed 18 EN/FR/ES light/dark
desktop/mobile layouts, with unchanged synthetic counts and verified cleanup.
The [manual deployment receipt](MANUAL-DEPLOYMENT-2026-10-09.md) supersedes the
historical blocked-publication tracker below. Pre/post NAS writable recovery,
39 public regression checks and repeated monitoring passed; remote CI and `.69`
GHCR publication are not claimed.

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

## Historical .68 Attempt (Superseded By Manual .69 Acceptance)

| Gate | Status |
| --- | --- |
| Reproduce regression | Passed: old image returns Unknown for map ID `mt`, instead of Malta. |
| Shared helper fix | Passed: focused i18n, HTTP negotiation/authorization and the full isolated application regression. |
| Automated coverage | Passed: server/browser/template tests for all 177 map countries in EN/FR/ES, uppercase/lowercase/mixed case, malformed inputs; rendered map names and France tooltips across 18 light/dark 1440/390/320px layouts under enforced CSP. |
| Publication and release CI | Blocked: source/tag pushed; GitHub stopped main/tag release runs with `repository invocation blocked`. Both retries remain queued without jobs; not accepted as passing CI. |
| Recoverable backup, exact wrapper and image scan | Pre-change local/NAS backup and byte-identical writable restore passed; exact published wrapper/scan pending publication. |
| Deployed desktop/mobile UI and existing-service acceptance | Pending. |
| Post-change recovery, monitoring and documentation | Pending. |

That initial attempt retained `.67.2` while release/deployment gates were blocked.
The subsequent authorized manual deployment is tracked above. WAF, Authentik
SSO, public redirects, links, users, secrets and real visit
statistics must remain unchanged. Browser plugin unavailable; rendered checks
use existing Playwright fixtures with enforced CSP.

## Historical Blocked Deployment Receipt (2026-10-09)

Source `256ef326be72a6dfff41468f3b1209cbdb504877` and immutable tag
`v3.2.6-sr94.68` are pushed. Main release run
[37871500005](https://github.com/RobinMJD/kutt/actions/runs/37871500005)
and tag run
[37871499891](https://github.com/RobinMJD/kutt/actions/runs/37871499891)
were cancelled by GitHub with the failure annotation `repository invocation
blocked`, not a failing assertion. Unchanged retries were requested once and
were still queued with no runner jobs at 02:12 UTC. Actions/workflow settings
are enabled and the repository is neither disabled nor archived. The cause of
the external invocation block is not established; operator review is required.
Do not change required checks, pay for a fallback or claim publication/deployment
from a queued run.

The old live image reproduced the supplied symptom on a disposable ordinary
user's link: stored `fr: 9`, two genuinely unknown visits and total 11, with
France highlighted but labelled `Unknown: 9`. Day/year switching and before/after
database comparisons passed; the disposable identity/link were removed. No real
link was reset or modified. The local corrected image passed the full existing
isolated application regression and the rendered country-label checks above.
At that checkpoint, live corrected-image acceptance was pending. The subsequent
manual `.69` deployment passed the live acceptance recorded at the top of this file.

Pre-change local/NAS snapshots `a22e2c08` / `e43af037` were restored from the NAS
in isolation; the consistent SQLite backup and three secret files matched and
the database passed integrity, foreign-key and writable restore checks. The live
`.67.2` wrapper files and original records remain unchanged. Private complete IDs,
guarded preparation/candidate/cutover/rollback scripts and evidence are under
`/srv/homelab/security-reports/2026-10-09-kutt-country-label68/`. Before resuming,
verify CI success for the exact source, obtain the published digest, refresh any
pre-change backup older than one hour, test/scan the exact hardened wrapper,
then deploy and complete localized desktop/mobile, recovery and monitoring gates.
