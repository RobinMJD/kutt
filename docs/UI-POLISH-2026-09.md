# September UI Polish Review

Scope: Kutt's existing management workflows, not a new visual identity. Review
requested after screenshots showed misaligned search controls, disappearing
dark-mode action icons and excessive empty space above recent links.

## Findings

| ID | Finding | Remedy | Status |
| --- | --- | --- | --- |
| P01 | Search is unlabelled visually and centred beside taller sort controls | Visible localized label, common 40px input height, bottom-aligned toolbar; input events reset pagination for typing, paste and native clear | Verified; deployed .64 |
| P02 | Dark action SVGs inherit `#444` because a more specific currentColor rule defeats the stroke override | Semantic foreground/background tokens on controls; measure actual SVG paint | Verified; deployed .64 |
| P03 | Homepage flex growth and 7rem table margin create a large dead zone | Compact, aligned create form and bounded section spacing; surplus space below content | Verified; deployed .64 |
| P04 | Desktop row actions are 24px targets with 14px icons, uneven gaps and pale light-mode colours | Stable 36px desktop / 40px compact targets and contrasting semantic colours | Verified; deployed .64 |
| P05 | Dark Library selects show native and custom arrows together | One painted arrow with native selection behavior retained | Verified; deployed .64 |
| P06 | Mobile sorting and bulk labels have inconsistent widths | Full-width mobile sort controls and bulk fields keep translated selections readable | Verified; deployed .64 |
| P07 | Settings navigation is a tight unstructured stack | Labelled responsive navigation grid, readable account heading | Verified; deployed .64 |
| P08 | Dark focus rings, empty-library text and some filled icons lack contrast | Theme-aware focus, text and filled-icon colours | Verified; deployed .64 |
| P09 | Mixed pill inputs, heavy shadows and button motion make controls inconsistent | Shared modest corners, clear borders, no hover displacement; preserve operator overrides | Verified; deployed .64 |
| P10 | Desktop Library actions stack vertically and inflate every row | Wrapped compact action strip with stable targets | Verified; deployed .64 |
| P11 | Zero-visit analytics render a blank chart/map and long zero-only tables | Compact empty state retains totals, filters and exports; populated reports return normally | Verified; deployed .64 |
| P12 | Admin filter/sort controls form uneven rows; account email is oversized | Shared responsive filter grid and smaller account identity text | Verified; deployed .64 |

## Evidence And Limits

Fresh local baseline: isolated `.59` runtime, disposable account/link, enforced
CSP. Captures cover 18 routes at 1440/390/320px in light/dark mode. Raw evidence
is outside Git; no credentials or private browsing state are committed.
Browser plugin not available; the existing bundled Chromium regression harness
and Codex in-app preview are used. Native Safari/Firefox and physical mobile
acceptance are separate from responsive Chromium checks.

No API, database, authorization, redirect, WAF or SSO policy changes were needed.
The `.59` UTC start/end picker and existing edit-expiry behavior remain
functional. Release `.64` passed publication, recovery and live acceptance.

The `.60` source tag was created before the final visual Admin review. It is
superseded by `.61`, which includes P12. Its sorting screenshot helper tried to
scroll the Admin `display: contents` wrapper, which has no layout box. The failure
was reproduced locally; `.62` scrolls the visible select instead. All functional,
geometry and selected-label assertions remain. The broader locale suite then
caught a cramped French workspace sort label at 390px. `.63` restores full-width
mobile sort fields and checks selected-label fit across all captured management
pages, not only the homepage. The corrected 198-layout locale suite passed.
Linux CI then found a tight Spanish Admin selection in the intrinsic-width grid.
`.64` makes the filter rows fill the available width, uses responsive 150px
minimum tracks and waits for font readiness before text measurements. The
198-layout locale suite passes on both macOS and an isolated Ubuntu Playwright
container. None of `.60` through `.63` was deployed; immutable tags are not
moved. `.59` remains the verified rollback image; `.64` is the accepted running
release.

## Accepted Release Evidence

- Published [release .64](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.64),
  source `418a37f5ab4fcbc96c991b106a5499056dd931cc`; [main CI](https://github.com/RobinMJD/kutt/actions/runs/35857368501)
  and [tag CI](https://github.com/RobinMJD/kutt/actions/runs/35857368520) passed.
- Curated contribution `af19f0fc14669d2415d3a667dc4273fbdc50592b`,
  [CI](https://github.com/RobinMJD/kutt/actions/runs/35857469610) passed and
  runtime/tests/manifests/workflow match. Upstream PR #1046 remains subject to
  maintainer review.
- Immutable source image:
  `sha256:39e919ce8bb1bf7aa6591fa06b81e3ba9e835a114dc7ab49adae6a35fa5142a1`.
  Hardened live image:
  `sha256:05c370d7e32b233c6efa9bedcbca4bcb987cd24993d686642481a163a88daf24`.
  Exact-source reconciliation and full hardened-image regression passed.
- New interface suite: 260 captures and 240 actual SVG paint checks per locale,
  780/720 total. Minimum measured action paint contrast was 5.89:1 against a
  3:1 floor. The 198-page locale suite passed on macOS and isolated Ubuntu;
  CI repeats all three interface locales plus existing theme/community suites.
- Public browser verification: home, Library, analytics and Settings at
  1440/390/320 in EN/FR/ES and light/dark (72 pages, 18 combinations), plus
  three native creation-picker workflows. 2,106 browser requests, no recorded
  JavaScript/CSP/network errors. Live Admin was not impersonated; its rendered
  coverage is in the isolated exact-source/CI matrix.
- Full public API, unchanged/stale edit expiry, public active/scheduled/expired
  redirects, protected management and real Authentik-signed logout/replay passed.
  Fixtures were removed; original records, integrity and foreign keys remained
  unchanged.
- Pre/post local and NAS snapshots each restored 75 files with byte verification
  and writable database checks. The candidate also opened/wrote the pre-backup
  in isolation. Image/config-only rollback to `.59` preserves current data.
- Repeated health samples 65 seconds apart and whole-lab validation passed:
  healthy, zero restarts, three required probes, no failed units, unhealthy
  containers or Kutt alerts. Fresh image scan: zero Critical/High; three existing
  Medium BusyBox-package findings, not suppressed. Native Safari/Firefox,
  physical devices and exhaustive accessibility certification are not claimed.

## Reproduce The Checks

Build the image, install the repository's documented Playwright runtime, and run:

```sh
docker build -t kutt-interface .
for locale in en fr es; do
  KUTT_TEST_LOCALE="$locale" KUTT_EVIDENCE_DIR="/tmp/kutt-interface-$locale" \
    sh tests/browser-csp.sh kutt-interface interface
done
sh tests/browser-theme.sh kutt-interface
KUTT_TEST_CSP_MODE=enforce sh tests/browser-geography.sh kutt-interface
sh tests/browser-community.sh kutt-interface
```

The interface suite covers 1440/1024/768/390/320px in both themes, all three
languages, 22 management pages and creation/list/empty/edit/confirmation states.
It measures visible SVG strokes/fills against opaque action backgrounds (minimum
3:1), stable control geometry, keyboard focus, alignment, dead-space bounds,
search reset, compact Library rows and zero-visit analytics. Existing theme and
geography suites retain populated reports, exports, error recovery and text
contrast coverage. Full release CI runs the new suite for all three locales.

The first new empty-report regression correctly exposed an outdated screenshot
helper attempting to capture the intentionally hidden map. The helper now
captures the complete empty page; visibility assertions still prove populated
reports return after filtering. This was a test-contract correction, not a
disabled functional assertion.
