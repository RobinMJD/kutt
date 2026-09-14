# Security maintenance for the final roadmap release

These changes accompany the iOS Shortcut candidate. Publication and deployment
are separate gates recorded in [the roadmap](FEATURE-ROADMAP.md).

## Source-review corrections

- Retention policy operations require a current administrator browser session;
  explicit legacy/scoped keys cannot inherit a cookie or administer retention.
- Partial owner/admin link edits preserve an omitted password. Explicit null
  or empty input removes it; the existing masked placeholder preserves it.
- Protected redirects share a 10-attempt/minute link-and-IP password budget
  across Basic GET/HEAD and both POST aliases, even when optional management
  rate limiting is disabled. Merely displaying the password form is not counted.
- Authentication rate limits share canonical route keys across case and API
  aliases. Invalid/used reset tokens are refused before password hashing. Final
  reset/email-change updates recheck token/expiry predicates atomically.
- Referrer dimensions are bounded for future writes and report rendering.
  Historical detail is preserved, not silently deleted; visit totals remain.
- Abuse-report email is plaintext. The report URL is bounded and validated;
  report submissions have an independent always-on rate limit.
- Password-protected redirects recheck domain/link availability, including
  domain bans, before accepting a password and again before redirecting.
- Local password login refuses cross-site browser origins/form submissions.
  Canonical origins come from configuration, not an untrusted Host header.
  Non-browser clients without Origin retain the existing API login contract.
- All email credential-action buttons, including Outlook/VML fallbacks, use
  HTTPS. Passwords, codes and recovery links must never be logged or published.

No data migration, credential reset, WAF exception, or account remapping is
required for these corrections. Restart the app after deploying. In-memory
rate-limit state resets on process restart; use private shared Redis for
multi-process persistence across app restarts. Never rely on app throttles as
a replacement for perimeter limits or monitoring.

Locked parser dependencies (`body-parser` 1.20.8, `qs` 6.16.0) and Bull's
CommonJS UUID dependency (11.1.1) are patched. UUID is a targeted override,
not a Bull major-version upgrade; Redis/Bull compatibility is tested separately.
Image scanning is a separate gate and does not prove the absence of code flaws.

## Reproducible tests and residual boundaries

`tests/security-regressions.cjs` runs in the isolated full smoke suite and
exercises the boundaries above with dummy credentials/data. The HTTPS
`tests/browser-login-origin.cjs` reproduces a real cross-origin browser form
submission and verifies normal login on desktop/mobile. Its loopback-only
self-signed test certificate does not disable production TLS verification.
`tests/configuration.cjs` covers secret files and the read-only monitoring CLI.

The Shortcut template has no real account/credential embedded. Hash and semantic
verification check the signed container against the deterministic reviewed
action graph. Desktop/mobile setup tests include one-time masking, pagehide,
late-response suppression, error/retry and revocation. A desktop browser test
is not physical iPhone acceptance; native macOS execution and iPhone behavior
must be described separately in the [Shortcut guide](../examples/IOS-SHORTCUT.md).

Remaining deployment risks include shared-IP rate-limit contention, the legacy
application proxy-trust default, nonpersistent Redis examples and database-engine
coverage. Configure them explicitly using [deployment guidance](DEPLOYMENT.md).
The full feature suite targets SQLite; do not infer PostgreSQL/MariaDB parity
from configuration validation alone. OS package advisories without a vendor
fix must be recorded in the release scan rather than suppressed.
