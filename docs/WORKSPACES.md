# Shared workspaces

Release `.9` implementation. Publication/deployment gates are pending; consult
the feature roadmap for verified deployment status.

## Authorization model

- A workspace has one owner and explicitly invited editors/viewers. Invitations
  target existing verified accounts and require the recipient's acceptance.
  Joining does not create an account or bypass the identity provider's policy.
- Owners manage the workspace, invitations, roles and sharing. Editors can
  create/edit/trash/restore shared links. Viewers can inspect shared links.
  Site administrator status does not confer workspace membership.
- Personal link ownership is retained. Sharing does not expose other personal
  links, tags, collections, saved filters, tokens or account diagnostics.
  New workspace links belong to the workspace owner, not the creating editor.
- Existing personal-link APIs retain their authorization rules. Workspace APIs
  use a separate membership check on every request; removal/role changes apply
  without a new login. Scoped-token access requires explicit workspace scopes,
  and domain-restricted tokens cannot use account-wide collaboration routes.
  Membership changes require a signed-in session, not an API credential.
- Removing a share or closing a workspace does not delete links or stop public
  redirects. The owner retains the links in the personal library. Workspace
  owners must close their workspaces before deleting their account.

An editor changes the shared link itself, including its destination/password and
public redirect policy; this also affects other workspaces sharing that same
link. Only the owner can share/unshare existing personal links. A role change
does not silently accept an outstanding invitation. The owner is fixed: there
is no implicit transfer of accounts, domains or personal links. To reorganize,
close the workspace without deleting its links and create a replacement.

## Interface

Open **Links > Workspaces** or **Settings > Workspaces**. Create/rename a workspace,
invite an existing account as editor/viewer, and accept invitations from the
recipient's Workspaces page. The owner can change roles or revoke pending/active
memberships; members can leave themselves.

Workspace and members contains a searchable personal-link selector. It returns
up to 50 matching unshared links; narrow the search for older links. This selector
is owner-session-only, never part of workspace API responses. Shared links have
search, active/trash filters and 50-row pagination. Editors can create and edit
links, set lifecycle controls, and trash/restore. Empty edit password preserves
protection; **Remove password** explicitly clears it. Dates are UTC.

Personal tags/collections, imports/exports, QR pages and analytics retain their
existing personal authorization. They do not inherit workspace permissions.
Shared link metadata never includes password hashes, personal labels or audit
history from before sharing. Pending invitations and the membership directory
are not returned to scoped tokens.

## API

Endpoints are available under `/api/workspaces` and `/api/v2/workspaces`:

| Method/path | Permission | Input |
| --- | --- | --- |
| `GET /` | Session or `workspaces:read` | Joined/owned workspaces; session-only invitations |
| `POST /` | Session | `name` |
| `GET /{id}` | Member; session or `workspaces:read` | `q`, `state=active|trash`, `page` |
| `PATCH /{id}` | Owner session | `name` |
| `DELETE /{id}` | Owner session | `confirm` equal to workspace UUID |
| `POST /{id}/members` | Owner session | `email`, `role=editor|viewer` |
| `PATCH /{id}/members/{membershipId}` | Owner session | `role=editor|viewer` |
| `DELETE /{id}/members/{membershipId}` | Owner or that member's session | None |
| `POST /invitations/{invitationId}/accept` | Recipient session | None |
| `POST /invitations/{invitationId}/decline` | Recipient session | None |
| `POST /{id}/shares` | Owner session | Personal `link_id` UUID |
| `DELETE /{id}/shares/{linkId}` | Owner session | None |
| `POST /{id}/links` | Owner/editor; session or `workspaces:write` | Link fields below |
| `PATCH /{id}/links/{linkId}` | Owner/editor; session or `workspaces:write` | Link fields below |
| `DELETE /{id}/links/{linkId}` | Owner/editor; session or `workspaces:write` | Trash, not permanent deletion |
| `POST /{id}/links/{linkId}/restore` | Owner/editor; session or `workspaces:write` | None |

Link fields: absolute HTTP(S) `target`, optional `address` (generated if absent
on create), `description`, `password`, `paused`, ISO `starts_at`/`ends_at`, and
`max_visits`. Creation also accepts an owner-controlled `domain`; domain moves
stay with the personal owner. Unknown fields are rejected. `password: null`
clears protection. Redirect quotas/history/alias reservations are preserved.
Create returns `201` and `{id, action}`; edits return `200`; membership/sharing
removal and workspace closure return `204`. No membership/nonexistent workspace
is `404`; insufficient role/scope is `403`; state conflicts are `409`.

Existing `links:*` scopes do not grant any workspace API access. New scopes do
not override membership, viewer restrictions, bans, revocation or custom-domain
ownership. Domain-restricted tokens are refused even if paired with an owner
cookie. Account/role/membership administration remains session-only.

Limits: 20 workspaces per owner, 100 members/invitations per workspace, 1,000
links per workspace, and 200 memberships/100 pending invitations per recipient.
Names are 1..80 printable characters. Application rate limits cap workspace
requests at 60 per minute per path/client when enabled; WAF remains enabled.

## Storage and Recovery

Migration `20260914020000_workspaces.js` adds workspaces, memberships and explicit
link-share relations. Existing users/links are unchanged; membership/link edits
run in transactions and serialize with role/revocation updates on the workspace.
Account deletion is refused while it owns a workspace (also enforced by the
foreign key). Closing a workspace deletes only its membership/share metadata.

The down migration refuses populated workspaces. Keep a compatible `.9` or later
image after creating collaboration data; an older image cannot manage it. Do not
drop tables to make a downgrade pass. Preserve current data and reconcile later
writes before restoring a pre-upgrade database. No new deployment secret, IdP
policy, public listener or external collaboration service is required.

## Release gates

Before publication: populated migration/guarded downgrade, owner/editor/viewer
matrix, invitation acceptance/revocation, banned users/owners, cross-workspace
and personal isolation, API-token/cookie boundaries, CSRF, concurrent writes,
restart persistence and desktop/mobile workflows must pass. Deployment also
requires a verified recoverable backup and exact-image validation through WAF
and Authentik, with existing public redirects unaffected.
