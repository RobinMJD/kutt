# Branded QR exports

Open a link's **QR code** page, choose a PNG logo, and export PNG or SVG.
The preview, clipboard image and printed QR use the same rendered PNG. Remove
the logo to return to the previous correction level. Size changes require Apply;
exports are disabled while changes or requests are pending. Keyboard users can
operate the native file chooser, Remove, downloads, Copy and Print.
The separate logo thumbnail uses the sanitized PNG embedded in the server's SVG,
never the original upload or its metadata.

Logos are optional and ephemeral. They are not saved to the link, database,
browser storage or a public URL. Reloading clears the logo. Copy is available
only where secure-context image clipboard APIs are supported; PNG download
remains available. Requests are cancelled on replacement, late results are
discarded, and generated object URLs are revoked on replacement/page exit.

## API

Both `/api/links/{id}/qr` and `/api/v2/links/{id}/qr` accept authenticated POST:

```json
{
  "size": 512,
  "format": "svg",
  "logo": "data:image/png;base64,..."
}
```

Use a session or an `X-API-Key` with `links:read` and the appropriate domain scope.
Only the link owner may export, including administrator sessions. Existing ban,
trash, archived-domain and domain-ownership checks apply. Supplied foreign/null
origins and `Sec-Fetch-Site: cross-site` are denied even for API tokens; non-browser
clients may omit Origin. Responses are private/no-store attachments. Neither
target URLs, passwords nor credentials are encoded; QR creation records no visit.
POST errors retain their status and JSON format even with an HTML Accept header.

GET keeps its existing unbranded PNG/SVG options and byte output. POST accepts
only `size`, `format`, `level` and `logo`; omit `logo` for plain output. Size is an
integer or decimal string from 128 to 1024, format is `png` or `svg`, and level is
L/M/Q/H. With a logo the validated level is always replaced by H. Invalid/null/
empty logos produce 400, never a silent plain-image fallback.

## Input and rendering limits

- PNG data URLs only: no SVG, JPEG, remote URL, raw base64, whitespace or malformed
  base64. Up to 64 KiB decoded bytes and 512 by 512 pixels. The global JSON body
  limit remains unchanged at 100 KiB.
- A POST-only parser wrapper returns sanitized JSON errors directly, keeping
  malformed upload bodies out of the existing global request-error logger.
- Non-interlaced, non-animated PNG. Standard grayscale/RGB/indexed/alpha bit-depth
  combinations are accepted. Chunk count (128), framing, all CRCs, dimensions and
  IHDR methods are validated before decoding. Bounded zlib inflation must match
  the exact raster length, with no trailing compressed stream.
- Only raster chunks reach the pinned `pngjs` decoder. Text, profiles and other
  metadata are discarded. A resized, opaque RGBA raster is newly encoded for SVG,
  with transparency composited onto white. No input metadata or external href is
  copied, and no network fetch occurs.
- `qrcode` generates a correction-H symbol. The white center plate covers at most
  20% of symbol width (4% area), aligned to module edges, with one-module padding
  around an aspect-preserving logo. Finder patterns and the four-module quiet
  zone remain unchanged. Branded images need at least two output pixels per
  module; dense symbols return 400 until a larger size is selected.

PNG/SVG rendering reuses pinned production libraries, not a new QR encoder.
Independent test decoding uses existing test-only `jsqr` 1.4.0 (locked integrity),
whose [primary API documentation](https://github.com/cozmo/jsQR#usage) specifies
RGBA image decoding. See also [pngjs](https://github.com/pngjs/pngjs) and
[node-qrcode](https://github.com/soldair/node-qrcode). No new runtime dependency,
schema migration or deployment configuration is required.

## Validation and integration

`qr-branding.cjs` runs in the full container suite, or with
`KUTT_TEST_ONLY=qr-branding`. It includes the bounded input/raster unit suite,
ownership/scopes/origin/lifecycle checks, plain GET/POST equivalence, zero visits,
metadata/privacy checks and restart/revocation. `qr-logo-unit.cjs --decode`
additionally requires the isolated test decoder and independently reads actual
PNGs across plain/dotted/nested/long-alias and custom-host sizes. One dense 1024px
case requires 512px sampling in jsQR for both the unbranded control and branded
image; this is recorded, not counted as a native-resolution decode.

`tests/browser-qr-branding.sh IMAGE` creates a fresh loopback SQLite fixture and
runs `browser-qr-branding.cjs` at 1440/390/320px using Playwright and the test
decoder. It checks actual downloaded PNG and rasterized SVG, visible logo pixels,
clipboard PNG, print layout, file rejection/retry, keyboard controls, late render
and clipboard results, object-URL cleanup and visit counts. It never uses the
operator's real clipboard or fetches the encoded destination. Physical scanning,
native print dialogs and Safari acceptance remain separate release gates.

C11 catalog integration is intentionally left to the parent: this base has no
localization runtime. New browser messages live in `qr.hbs` data attributes;
labels/attributes and server CustomErrors need catalog entries alongside the
existing QR strings. No C11 worktree files are changed or copied.
