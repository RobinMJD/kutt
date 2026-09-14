# OIDC identity and session security

Candidate release: `3.2.6-sr94.5`. Deployment is not complete until recorded in
the feature roadmap. This feature does not make short-link redirects private.

## Identity and configuration

Configure `OIDC_ENABLED`, an exact HTTPS `OIDC_ISSUER`, confidential client ID
and secret, and `openid profile email` scopes. The callback remains
`https://YOUR_DOMAIN/login/oidc`. Use authorization code with PKCE S256. Provider
discovery failures fail login closed and retry after ten seconds; public links
remain usable. Development fixtures alone allow HTTP on 127.0.0.1.

Accounts bind to the exact `(issuer, sub)` pair, never to an email or display
name. Configure a stable, non-reassigned provider subject, such as Authentik's
user UUID. A bound user keeps the same Kutt account if their email changes.
Kutt does not automatically update their stored email or grant administrator
rights from provider claims. A new identity needs an explicitly verified email
and creates an ordinary USER account. Matching an existing email is refused.

`OIDC_ALLOW_REGISTRATION=true` preserves delegated OIDC provisioning; it is
separate from `DISALLOW_REGISTRATION`, which disables local signup. Set it false
to admit only administratively pre-bound identities. Restrict eligible users
in the provider's application policy in either case.

## Existing-account migration

Back up and restore-test the database before upgrading. Preserve all secrets.
Migrate the schema, then an administrator must verify each existing Kutt user
against the identity provider and supply an explicit mapping. Never infer
ownership solely from an untrusted login's email claim.

```sh
node scripts/bind-oidc.cjs < /protected/verified-identity-map.json
```

The JSON is an array of `{ "issuer": "https://idp.example/application/o/kutt/",
"subject": "provider-stable-user-id", "user_id": 123 }` objects. Run with the
same database and issuer configuration as the app. Treat mappings as private
identity data, not Git content. The command is atomic, idempotent, refuses
conflicting ownership or subject replacement, and reports counts only. Newly
bound accounts have all old cookies invalidated and must sign in again. Links,
password hashes, API tokens and account IDs are unchanged.

An issuer or subject-mode change after binding needs a separately audited
migration. Do not delete bindings to make login pass. Existing unbound local
sessions retain their original expiry until revoked, changed password, or ban.

## Revocation and API

- `GET /api/auth/security`: current user's connected issuers and session limit;
  administrators also see sanitized provider readiness/error codes and times.
- `POST /api/auth/revoke-sessions`: immediately invalidates all of the current
  user's browser cookies, including copied cookies; JSON returns 204. The UI is
  **Settings > Account security > Sign out all sessions**.
- Both routes also work under `/api/v2`. They require a browser session, reject
  API keys even when a valid cookie accompanies them, and enforce origin checks
  on mutations. API tokens are intentionally independent: revoke those in the
  API token settings. Account bans deny both browser and API access.
- Password changes and bans increment the persistent session version. A
  password change requires a new login. Unbanning does not restore old cookies.

OIDC sessions have an absolute lifetime, default one hour. Set
`OIDC_SESSION_MAX_SECONDS` to 300, 900, 1800, 3600, 14400 or 86400. Cookie renewal
cannot extend that lifetime. Fresh authorization then re-evaluates provider
application policy, although a still-active provider session may not prompt
the user again. Kutt does not poll provider groups or independently implement
SCIM. Removing an application group is not necessarily a logout event: for
immediate termination, also revoke the provider session or ban the Kutt user.

## Signed back-channel logout

Configure the provider's back-channel logout URL as
`https://YOUR_DOMAIN/api/auth/oidc/backchannel`. In Authentik select **Back-channel**
as Logout Method. Keep the WAF in place. This endpoint has no browser/SSO
challenge because its authentication is the signed `logout_token` POST body.
It does not grant access to management or create sessions.

Tokens must validate against the configured provider's JWKS and exact issuer
and client audience. Only RS256, PS256, ES256 and EdDSA are accepted, never
unsigned or shared-secret algorithms. The logout event, recent iat, unique jti,
subject and/or session ID are validated; nonce is forbidden. Invalid messages
return a generic 400; successful and replayed notifications return 200. Replay
does not extend revocation. Subject-only logout invalidates current sessions
for that identity; a session ID narrows it to that provider session. Revocation
survives process restart and expired notifications are pruned on ingestion.

Provider outages can delay notifications. The absolute lifetime bounds existing
OIDC cookies; a local administrator can revoke sessions or ban a user sooner.
Transport success is not proof that a human MFA ceremony was completed.

## Recovery and validation

The migration adds `users.auth_version`, `oidc_identities` and
`oidc_logout_events`. It does not rewrite links or existing identity data.
Downgrade refuses to discard bindings or any revocation state. An older image
does not enforce these controls and is not a safe code-only rollback. Prefer
fix-forward or the same compatible version. Restoring a pre-upgrade snapshot
requires coordinating provider settings, reconciling later writes, and revoking
old cookies (including rotating the session signing secret if necessary).

The offline suite uses a disposable OIDC provider with real RSA signatures,
authorization-code/PKCE exchange, subject/email collision cases, logout and
replay checks, expired sessions, bans, provider outage recovery, CLI mapping
rollback and guarded downgrade. Desktop/mobile rendered tests exercise the
security page and sign-out/re-login. Tests never use real provider credentials.
Production additionally needs signed-provider delivery through the WAF, existing
account binding checks, unchanged public redirects and a verified backup restore.

Standards: [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html),
[Back-channel logout](https://openid.net/specs/openid-connect-backchannel-1_0.html).
