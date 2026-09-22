# Localization

C11 provides English (`en`, default), French (`fr`) and Spanish (`es`) for the
bundled web UI, email and user-facing server/browser feedback. The isolated C11
branch incorporates release `.46` (`f85ce35`), including C03 moderation,
C12 sorting and C19 dotted aliases, and release `.47` (`741cece`) with C14 theme
preferences. Its package version remains `.47`. No publication or deployment
is part of this work.

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

The bundled layout also retains C14's early theme script before styles and loads
`theme.css` after `i18n.css`, before custom styles. The footer's `theme_picker`
partial uses `theme.appearance`, `theme.system`, `theme.light` and `theme.dark`.
The `system`/`light`/`dark` radio values, root attributes and `kutt.theme` storage
values remain literal. See [Appearance](THEMES.md) for custom-layout theme setup.

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
It also checks translated theme labels and unchanged machine values, and verifies
that a dark preference survives native language-form submissions on login,
settings and library pages without changing the strict Origin guard.

Unit/HTTP tests cover key/placeholder parity, fail-closed loading, template
compilation, escaping, custom precedence, 90 concurrent locale contexts,
Node/browser formatter parity, plural categories, mail rendering, concurrent
localized requests, cookie negotiation, null/foreign-origin rejection,
open-redirect rejection, allowlisted assets and locale-independent edit signatures.
SMTP delivery, physical mobile devices, native Safari/Firefox, production custom
layouts and live parent integration/release acceptance remain separate gates.

## Release 46 Integration

The merge retains transactional moderation, independent unban, revoked-credential
invalidation, last-administrator protection, exact sort profiles and pagination,
workspace candidate-search state, pre-trim alias validation and concurrent alias
claim handling. Only display text is localized: moderation API/audit `entity` and
`action` values, IDs, timestamps, sorting parameters and alias bytes stay literal.
New messages use `moderation.*`, `sorting.*`, `aliases.*` and
`enum.moderation_entity.*` / `enum.moderation_action.*` keys. Existing stable keys
are retained. The subsequent C14 merge adds four `theme.*` keys without
regenerating existing keys.

`tests/i18n-community.cjs` runs with the localization HTTP gate and checks French
and Spanish errors, strict origins, unchanged audit payloads, sort ordering,
dotted redirects and invalid imports. `tests/browser-i18n.cjs` now covers 22
routes at three widths in three languages (198 layouts), including moderation.
The three feature browser suites accept `KUTT_TEST_LOCALE=en|fr|es` and default
to English, preserving the existing default regression. For example:

```sh
KUTT_TEST_LOCALE=fr sh tests/browser-moderation.sh kutt-i18n-test:c11-46
KUTT_TEST_LOCALE=es sh tests/browser-list-sorting.sh kutt-i18n-test:c11-46
KUTT_TEST_LOCALE=fr sh tests/browser-dotted-aliases.sh kutt-i18n-test:c11-46
```

Set `NODE_BINARY` / `PLAYWRIGHT_MODULE` when needed, `KUTT_BROWSER_PORT` to a free
loopback port and `KUTT_EVIDENCE_DIR` outside the repository. Each wrapper creates
and removes its own fresh container and refuses initialized application data.
These browser runs use regular Playwright because the Browser plugin is not
available. Catalog-only changes now trigger the Docker smoke workflow too.

### Release 46 Validation (2026-09-22)

- Image `kutt-i18n-test:c11-46`: build/hardening and full container regression
  passed, including C03/C12/C19, localization HTTP tests, OIDC and rollback/reapply.
- Catalog parity/placeholders, hostile interpolation, all template compilation,
  custom precedence and 90 concurrent locale contexts passed: 1,438 keys each.
- `browser-i18n.cjs` passed 198 layouts at 1440/390/320px. All nine feature browser
  runs passed: moderation, list sorting and dotted aliases in English, French
  and Spanish. Page rendering, runtime/console checks, mobile bounds, selected
  label fit, actual native Origin, drafts, delayed requests, persistence and
  literal redirects passed. Screenshots were inspected outside the repository
  under `/tmp/kutt-c11-46-*`.
- Real SQLite/MySQL/PostgreSQL sorting and moderation concurrency/token-ban
  races passed; MySQL/PostgreSQL dotted-alias HTTP races, stale snapshots,
  imports, scopes, lifecycle and rollback passed. Redis/Bull processing,
  persistent limiting and fresh authentication after revocation passed.
- A translation-normalized AST comparison with `f85ce35` passed for moderation,
  its handler/routes, list sorting, aliases, alias claims/history, user queries
  and the sorting browser script. Release behavior in those modules is unchanged.
- Syntax checks for 94 changed JavaScript files and `git diff --check` passed.
  Both package manifests retain `3.2.6-sr94.46`. No parent files were modified.

No production/provider/SMTP acceptance, physical-device or Safari/Firefox runs,
new TLS handshake runs, remote CI, publication or deployment were performed.
Custom-layout review and release acceptance remain the parent's responsibility.

## Release 47 Integration

C14 (`741cece`) is merged after the release 46 integration. Its runtime
`theme.js`, `chart-theme.js` and `theme.css` are unchanged. Both localization and
theme styles/test selectors are retained when resolving the two merge conflicts.
English, French and Spanish catalogs now have 1,442 keys each, including all four
appearance labels. Choosing a language does not translate or reset the selected
theme's machine value.

The theme browser suite accepts `KUTT_TEST_LOCALE=en|fr|es`, defaulting to English.
For example:

```sh
KUTT_TEST_LOCALE=fr sh tests/browser-theme.sh kutt-i18n-test:c11-47
```

Each run checks 90 layouts: 15 routes at 1440/390/320px in both explicit themes,
plus System mode, keyboard selection, cross-tab/media changes, storage denial,
rendered contrast, chart pixels and QR print preservation. These checks complement
the 198 localized page layouts and native locale/theme interaction gate.

### Release 47 Validation (2026-09-22)

- Image `kutt-i18n-test:c11-47`: build/hardening and the full combined container
  regression passed, including localization/theme HTTP checks, C03/C12/C19,
  security boundaries, OIDC and guarded migration rollback/reapply.
- Catalog/key/placeholder parity, all template compilation, hostile escaping,
  Node/browser format parity, plural categories, mail rendering and 90 concurrent
  locale contexts passed with 1,442 keys in each catalog.
- `browser-i18n.cjs` passed 198 localized layouts. Native login/settings/library
  language-form clicks sent same-origin Origin and returned 303; dark preferences
  survived. Translated controls, unchanged theme values and dark-mode language
  label fit passed, alongside hostile content, HTMX and plural-feedback checks.
- All three theme browser runs passed: 270 layouts total, with the default
  English baseline and French/Spanish labels. System/media/storage/keyboard
  controls, cross-tab propagation, denied storage, contrast, charts and QR/print
  passed. Desktop/mobile screenshot samples were inspected under
  `/tmp/kutt-c11-47-theme-{en,fr,es}` and `/tmp/kutt-c11-47-browser-i18n`.
- English moderation, list-sorting and dotted-alias browser workflows were rerun
  against `.47` and passed at 1440/390/320px. The nine feature browser runs in
  three languages and SQLite/MySQL/PostgreSQL/Redis gates above belong to the earlier
  `.46` integration; those database-specific scripts were not rerun for C14.
- The three C14 runtime assets match `741cece` byte-for-byte. Both package
  manifests retain `3.2.6-sr94.47`; changed JavaScript syntax and diff checks pass.
  No parent checkout files were edited. All disposable browser fixtures were
  removed after their runs.

Coverage limits remain: signed Apple Shortcut prompts are still English; custom
layouts/content and browser/OS-native chrome are outside catalog rewriting.
No new SMTP delivery, physical-device, Safari/Firefox, TLS handshake, live
provider/production, remote CI, publication or deployment acceptance was run.

### Initial C11 Slice Evidence

Verified on 2026-09-22 in the isolated worktree: image build/hardening, the full
SQLite container smoke suite (including OIDC and guarded migration rollback),
the localization unit/HTTP checks, and Chromium browser checks for 180 page
layouts across all three languages and widths. Native selector clicks on login,
settings and library returned 303 with the actual same-origin Origin header;
null and foreign origins remained denied. Final screenshot inspection corrected
clipped Spanish mobile filter labels and the browser rerun passed. There are
1,385 keys per catalog. PostgreSQL/MySQL/Redis transport acceptance was not rerun
for this localization slice. No package version bump, push or deployment was made.
