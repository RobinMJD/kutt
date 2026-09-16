# Native Zoom And QR Print Evidence

Date: 2026-09-16. Exact deployed image tested in a loopback-only disposable fixture:
`sha256:17639101731d1f741b6e596c0f975ad46ee46a87455394a4759965a847116114`.
No production data, credentials or configuration were changed.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Genuine browser zoom | 100/200/400% yields 1440/720/360 CSS-pixel layouts and DPR 1/2/4 | [Structured measurements](zoom-print-results.json) |
| Home at 400% | Main entry fits; measured recent-link controls remain horizontally clipped, extending UX-002 | [Home](home-zoom-400.png); use structured geometry for the lower table |
| Library at 400% | Heading links hidden beneath filters, extending UX-003 | [Library](library-zoom-400.png) |
| Settings/routing | Inspected zoomed states and no measured horizontally clipped controls; not universal workflow acceptance | [Settings](settings-zoom-400.png), [routing](routing-zoom-400.png) |
| QR PDF | One A4 page; visually intact QR/caption; independent decoding matches caption exactly | [PDF](qr-native-output.pdf), [Poppler render](qr-pdf-render.png) |
| Native print preview | Opens and Cancel succeeds; preview rendering fails and Save is disabled | [Kutt preview](qr-print-preview.png), [results](print-preview-results.json) |
| Plain-page print control | Same preview failure without Kutt layout or QR; not enough evidence for an application defect | [Control preview](plain-control-print-preview.png), [results](plain-control-print-preview-results.json) |

All linked images were opened and inspected. The blank scrolled Recent-links
capture is intentionally excluded. Initial API-login-cookie and strict floating-point
zoom assertions were corrected in the helper; neither was a product defect.
The first print target was visible through CDP but not Playwright's page event;
the follow-up attached to that observed target. Removing the automation profile's
extension-disable flag did not resolve preview rendering.

The PDF filename identifies the native Chromium print engine, **not** completion
of native Save-as-PDF. It was generated through Playwright `page.pdf`, then rendered
using Poppler and decoded from its pixels using `jsqr` 1.4.0. Decoded payload:
`https://127.0.0.1:31076/audit-paused`, exactly the printed caption. This fixture URL
is not a usable phone link or TLS test. No physical scan or printer job occurred.

Browser: bundled Chromium 151.0.7922.34; Playwright 1.62.1. Native zoom used a
temporary fixture-only extension and Chromium's `tabs.setZoom`, not CSS or pinch
emulation. Temporary scripts/profiles were outside Git. All test containers,
seed copies, tunnels and profiles were removed. The production container stayed
healthy with zero restarts on `local/kutt:3.2.6-sr94.18`.
