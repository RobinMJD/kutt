# Localization

C11 provides English (`en`, default), French (`fr`) and Spanish (`es`) for the
bundled web UI, email and user-facing server/browser feedback. This slice starts
at `44656a3`; later C03, C12 and C19 strings need the same treatment when integrated.
It does not change the package/release version or deploy anything.

## Catalogs And Loading

- `locales/languages.json` is the allowlisted locale-to-native-name registry.
- `locales/en.json`, `fr.json` and `es.json` contain flat, stable message keys.
- `server/i18n-catalogs.js` loads once at startup and rejects invalid registrations,
  missing keys, placeholder mismatches, HTML, raw interpolation and nested messages.
- `static/scripts/i18n-core.js` is the shared Node/browser adapter for pinned
  i18next 26.4.2 and the platform `Intl` formatters. No remote translation service,
  browser language pack or runtime network dependency is used.
- Each translator has a fixed locale. `AsyncLocalStorage` selects the current
  request translator; there is no process-global `changeLanguage()` call. Template
  block accumulators are also request-scoped. Background work defaults to English.

The validated preference cookie wins over `Accept-Language`; otherwise an
unsupported preference/header falls back to English. Regional language headers
such as `fr-CA` negotiate to the bundled base language. `Content-Language` and
`Vary: Accept-Language, Cookie` identify negotiated responses.

The native header selector posts to `/language`, accepts only registered locales,
requires an exact same-origin `Origin`, and redirects with 303 to a validated
relative path. It rejects missing, opaque `null` and foreign origins. The one-year
`kutt_locale` cookie is HttpOnly, SameSite=Lax, path `/`, and Secure on HTTPS. It is
a browser preference, not an account credential or persisted user-profile field.

Rendered HTML uses `Referrer-Policy: same-origin`: native form submissions retain
a valid same-origin Origin, while external sites receive no referrer. The origin
guard is not relaxed to accept `null`. Public redirects and JSON responses retain
the ordinary Helmet policy unless another existing handler changes it.

## Writing Messages

Keep existing keys stable when wording changes. New features should use semantic
keys such as `moderation.appeal_submitted`, not concatenate fragments or generate
keys from translated text. Existing `ui.*` and `messages.*` keys identify the
initial extraction and must not be regenerated during merges.

```js
const i18n = require("./i18n");
throw new CustomError(i18n.t("messages.link_was_not_found"), 404);
const message = i18n.t("library.selected", { count: 2 });
```

```hbs
<p>{{t "ui.edit_value" value1=address}}</p>
<button title="{{t 'ui.copy'}}">{{> icons/copy}}</button>
<time datetime="{{created_at}}">{{date created_at}}</time>
<span>{{localizedLabel "role" role}}</span>
```

```js
output.textContent = window.KuttI18n.t("ui.edit_value", { value1: address });
output.textContent = window.KuttI18n.failure(error);
```

Messages are **plain text**, not trusted HTML. The adapter deliberately returns
unescaped text so every output boundary escapes exactly once: normal Handlebars
mustaches for HTML, `textContent` for browser nodes, JSON serialization for APIs.
Never use triple mustaches, `SafeString`, `innerHTML`, inline handlers or inline
JSON to insert a translated message. Interpolated values cannot override i18next
language/options and are never recursively interpreted as translation syntax.
Named placeholders must have identical names and multiplicity in all catalogs.

Use i18next plural suffixes (`_one`, `_other`, `_many`) with a numeric `count`.
French and Spanish can select `_many` for millions. Counts returned as strings by
SQL drivers are normalized; an explicitly missing count renders as zero so an
error partial still renders. Use `number()` for display quantities, `date()` for
localized dates, and `utcDate`/an explicit UTC option for UTC-labelled displays.
HTML `datetime`, numeric inputs, datetime-local inputs and other machine fields
remain unformatted. Catalogs can supply a separately formatted number placeholder
when grouping is needed.

Request-dependent messages must be translated inside the request, not when a
module is imported. Express-validator messages use callbacks for this reason.
Mail rendering captures a fixed translator before asynchronous delivery; callers
outside a request can use `i18n.run(locale, callback)` or pass a fixed translator
to `server/mail/render.js`. It does not infer a recipient's language from email.

## Compatibility Boundaries

- IDs, role/scope values, API field names, status codes, event types, URL identity,
  DNS proofs, token values and cryptographic inputs are not translated.
- `lifecycle_status` keeps its historical English API value; `lifecycle_label` is
  the display value. Health target names used in hashes remain unchanged;
  `display_name` and action text are translated on read.
- Relative expiry editor values keep the original `ms` grammar and signed input
  snapshot. Only the read-only expiry label is localized. Input examples such as
  `2 days` are syntax examples, not localized duration parsers.
- User-entered names, destinations, descriptions and operator-customized OIDC
  button text remain user content. Browser-native date pickers/validation chrome
  follow the browser/OS locale, not application catalogs.
- The signed Apple Shortcut remains byte-for-byte unchanged, including its
  embedded English prompts. Translating that artifact requires a separate
  credential-free signing/native acceptance cycle; do not edit signed bytes.

## Custom Templates

`custom/views` still precedes bundled views. Bundled partials now finish loading
before custom partials, and the server waits for both before listening, making
override precedence deterministic. Custom content is never rewritten.

Custom templates can use the same helpers and `locale`, `languages` and
`locale_return` locals. The `localizedLabel` name intentionally does not shadow
ordinary `label` fields. A custom layout must add these **external** scripts,
in order, before page-specific and bundled UI scripts:

```hbs
<script src="/locales/i18next.js"></script>
<script src="/scripts/i18n-core.js"></script>
<script src="/locales/{{locale}}.js"></script>
```

Also use `<html lang="{{locale}}">`, the bundled header selector (or its native
form equivalent), `/css/i18n.css`, and optionally
`/locales/{{locale}}.webmanifest`. Existing customized layouts do not automatically
gain these assets; review them during integration. Custom CSS remains later in
the stylesheet order. Only bundled, validated catalogs are served, as external
JavaScript with HTML-sensitive characters escaped; no raw catalog JSON is
injected into HTML. Locale-specific manifests retain the existing install identity.

## Adding A Language

1. Register its native name and a valid locale code in `locales/languages.json`.
2. Copy the English catalog and translate every value, retaining stable keys and
   placeholders. Keep diagnostic codes and examples of API syntax literal.
3. Include all plural categories needed by the new locale; add corresponding
   keys to every catalog to preserve exact parity. Verify `Intl` support in the
   supported Node and browser runtimes.
4. Translate the downloadable Shortcut guide when adding a supported language.
5. Run the unit/HTTP/browser gates below, including long text, quotes, accents,
   errors, native forms, HTMX fragments, mail, and hostile interpolated values.

## Verification

Use disposable instances only, never a deployed database or a real `.env`.

```sh
docker build -t kutt-i18n-test:c11 .
docker run --rm --network none --read-only --tmpfs /tmp \
  kutt-i18n-test:c11 node tests/i18n.cjs
docker run --rm --network none --read-only --tmpfs /tmp \
  -e KUTT_TEST_ONLY=i18n kutt-i18n-test:c11 node tests/container-smoke.cjs
docker run --rm --network none --read-only --tmpfs /tmp \
  kutt-i18n-test:c11 node tests/container-smoke.cjs
```

`tests/browser-i18n.cjs` requires a **fresh loopback-only** app, Playwright Chromium,
`KUTT_BROWSER_DISPOSABLE=1`, `KUTT_TEST_URL=http://127.0.0.1:<port>` and an external
`KUTT_EVIDENCE_DIR`. Set `PLAYWRIGHT_MODULE` if Playwright is not on Node's module
path. It refuses initialized instances, uses synthetic credentials and writes
screenshots outside the repository. It covers three languages at 1440, 390 and
320 pixels, native selector submissions, login validation, populated management
pages, hostile content, HTMX edits, machine expiry values and plural bulk notices.

Unit/HTTP tests cover key/placeholder parity, fail-closed loading, template
compilation, escaping, custom precedence, 90 concurrent locale contexts,
Node/browser formatter parity, plural categories, mail rendering, concurrent
localized requests, cookie negotiation, null/foreign-origin rejection,
open-redirect rejection, allowlisted assets and locale-independent edit signatures.
SMTP delivery, physical mobile devices, native Safari/Firefox, production custom
layouts and live parent integration/release acceptance remain separate gates.

Verified on 2026-09-22 in the isolated worktree: image build/hardening, the full
SQLite container smoke suite (including OIDC and guarded migration rollback),
the localization unit/HTTP checks, and Chromium browser checks for 180 page
layouts across all three languages and widths. Native selector clicks on login,
settings and library returned 303 with the actual same-origin Origin header;
null and foreign origins remained denied. Final screenshot inspection corrected
clipped Spanish mobile filter labels and the browser rerun passed. There are
1,385 keys per catalog. PostgreSQL/MySQL/Redis transport acceptance was not rerun
for this localization slice. No package version bump, push or deployment was made.
