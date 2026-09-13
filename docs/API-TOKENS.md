# Scoped API tokens

Create named tokens in Settings using a signed-in browser session. The secret is
shown once. The database stores a SHA-256 digest of a random 256-bit secret. Use
`X-API-Key`; URL/body credentials are rejected for scoped tokens. Never embed a
token in a public client application.

| Scope | Allowed operation |
| --- | --- |
| `links:read` | List the owner's links |
| `links:create` | Create links as the owner |
| `links:update` | Edit the owner's links |
| `links:delete` | Delete the owner's links |
| `stats:read` | Read statistics for the owner's links |

Both `/api` and `/api/v2` are supported. Tokens never confer administrator
privileges. Other routes, account changes, domain administration and token
management are denied. A cookie cannot elevate a scoped request. Public
short-link redirects need no token.

## Management API (session authentication only)

- `GET /api/v2/tokens`: metadata, never secrets/hashes (latest 100).
- `POST /api/v2/tokens`: `{ "name": "Shortcut", "scopes": ["links:create"],
  "expires_in_days": "30" }`; metadata plus `token` once, HTTP 201.
- `DELETE /api/v2/tokens/:id`: revoke an owned token, HTTP 204; idempotent.
  Other users' tokens return 404.

Expiry defaults to 30 days; presets: 7, 30, 90, 365, `never`. Alternatively,
`expires_at` accepts a future ISO 8601 UTC timestamp. Expiry, revocation, bans
and verification are checked per request without caching. Last-use writes are
limited to once per minute. Metadata timestamps are UTC. Domain restrictions
are not implemented yet: permissions cover all links owned by that user.

## Compatibility and rollback

The additive `20260913190000_api_tokens` migration does not modify users, links
or existing `users.apikey` values. Legacy keys retain their prior permissions
and storage format to avoid breaking integrations or image-only rollback.
Move integrations to scoped tokens, then regenerate the legacy key to invalidate
the previous value. Legacy keys remain broad credentials; new-token guarantees
do not apply to them.

An older image ignores the new table and still accepts legacy keys, but cannot
accept new scoped tokens. Schema rollback drops the token table and revokes all
scoped tokens; prefer image-only rollback. Take a consistent database backup
before migration and test restore separately.
