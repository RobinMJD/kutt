# September UI Polish Review

Scope: Kutt's existing management workflows, not a new visual identity. Review
requested after screenshots showed misaligned search controls, disappearing
dark-mode action icons and excessive empty space above recent links.

## Findings

| ID | Finding | Remedy | Status |
| --- | --- | --- | --- |
| P01 | Search is unlabelled visually and centred beside taller sort controls | Visible localized label, common 40px input height, bottom-aligned toolbar; input events reset pagination for typing, paste and native clear | Implemented; verification pending |
| P02 | Dark action SVGs inherit `#444` because a more specific currentColor rule defeats the stroke override | Semantic foreground/background tokens on controls; measure actual SVG paint | Implemented; verification pending |
| P03 | Homepage flex growth and 7rem table margin create a large dead zone | Compact, aligned create form and bounded section spacing; surplus space below content | Implemented; verification pending |
| P04 | Desktop row actions are 24px targets with 14px icons, uneven gaps and pale light-mode colours | Stable 36px desktop / 40px compact targets and contrasting semantic colours | Implemented; verification pending |
| P05 | Dark Library selects show native and custom arrows together | One painted arrow with native selection behavior retained | Implemented; verification pending |
| P06 | Mobile sorting and bulk labels have inconsistent widths | Full-width mobile sort controls and bulk fields keep translated selections readable | Implemented; verification pending |
| P07 | Settings navigation is a tight unstructured stack | Labelled responsive navigation grid, readable account heading | Implemented; verification pending |
| P08 | Dark focus rings, empty-library text and some filled icons lack contrast | Theme-aware focus, text and filled-icon colours | Implemented; verification pending |
| P09 | Mixed pill inputs, heavy shadows and button motion make controls inconsistent | Shared modest corners, clear borders, no hover displacement; preserve operator overrides | Implemented; verification pending |
| P10 | Desktop Library actions stack vertically and inflate every row | Wrapped compact action strip with stable targets | Implemented; verification pending |
| P11 | Zero-visit analytics render a blank chart/map and long zero-only tables | Compact empty state retains totals, filters and exports; populated reports return normally | Implemented; verification pending |
| P12 | Admin filter/sort controls form uneven rows; account email is oversized | Shared responsive filter grid and smaller account identity text | Implemented; verification pending |

## Evidence And Limits

Fresh local baseline: isolated `.59` runtime, disposable account/link, enforced
CSP. Captures cover 18 routes at 1440/390/320px in light/dark mode. Raw evidence
is outside Git; no credentials or private browsing state are committed.
Browser plugin not available; the existing bundled Chromium regression harness
and Codex in-app preview are used. Native Safari/Firefox and physical mobile
acceptance are separate from responsive Chromium checks.

No API, database, authorization, redirect, WAF or SSO policy changes are intended.
The `.59` UTC start/end picker and existing edit-expiry behavior must remain
functional. Publication, recovery and live acceptance are pending.

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
moved. `.59` remains the accepted running baseline pending `.64` gates.

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
