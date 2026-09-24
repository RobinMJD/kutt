# Upstream Open-Issue Review (25 September 2026)

Snapshot: all 69 open issues at [thedevs-network/kutt](https://github.com/thedevs-network/kutt/issues), compared with the deployed fork baseline `3.2.6-sr94.64`. An upstream-open state does not mean the issue affects this fork. This review distinguishes reproduced defects from requested features and hosted-service problems. The changes below are a `3.2.6-sr94.65` candidate until publication, backup, deployment, and live validation are separately recorded.

## Reproduced and Fixed Here (8)

| Upstream issue | Fork finding and correction | Regression |
| --- | --- | --- |
| [#1033](https://github.com/thedevs-network/kutt/issues/1033) | Link and domain admin filters already used strict numeric matching; the Users list/count still parsed digit-leading emails as IDs. All three now use the same strict filter. | `tests/admin-user-filter.cjs` |
| [#1020](https://github.com/thedevs-network/kutt/issues/1020) | Pinned `ioredis` 5.4.2 predates the upstream DNS-family fix. Updated within major 5 to 5.11.1. | `tests/redis-smoke.sh`; AAAA-only DNS is not emulated by this test |
| [#1008](https://github.com/thedevs-network/kutt/issues/1008) | User deletion cascaded into published links and visit aggregates. Detach their owner IDs in the existing deletion transaction; preserve link, stats, and domain, and show the link count in the confirmation. | `tests/moderation.cjs`, `tests/moderation-database.cjs` on SQLite/MySQL/PostgreSQL |
| [#1000](https://github.com/thedevs-network/kutt/issues/1000) | Annual views used elapsed-month arithmetic and a rolling 12-month lower bound. Use 12 calendar months including the current month, aligned server and browser labels. | `tests/analytics.cjs` |
| [#975](https://github.com/thedevs-network/kutt/issues/975) | Duplicate custom alias returned 400 in this fork (not upstream's 500). It now returns 409 without changing the existing link or retaining a failed idempotency reservation. | `tests/validation.cjs`, idempotency/schedule/dotted-alias tests |
| [#930](https://github.com/thedevs-network/kutt/issues/930) | `expire_in` was a database-style string while other API dates were ISO 8601. API link/list/admin serializers now emit a UTC ISO date; legacy relative-expiry input remains accepted. | `tests/validation.cjs` |
| [#926](https://github.com/thedevs-network/kutt/issues/926) | URL validation accepted only 2-5 digit ports. It now accepts a valid 1-digit port too. | `tests/validation.cjs` |
| [#825](https://github.com/thedevs-network/kutt/issues/825) | Admin-created unverified users lacked the token and expiry that registration provides. Create both transactionally; verified users remain unchanged. | `tests/moderation.cjs`, `tests/moderation-database.cjs` |

## Already Covered in the Fork (31)

- [#1013](https://github.com/thedevs-network/kutt/issues/1013): ordered conditional routing and preview.
- [#991](https://github.com/thedevs-network/kutt/issues/991), [#921](https://github.com/thedevs-network/kutt/issues/921), [#434](https://github.com/thedevs-network/kutt/issues/434): dotted and nested slash aliases, with reserved-path and traversal controls.
- [#984](https://github.com/thedevs-network/kutt/issues/984): authenticated `reuse: true` and idempotency keys. Reuse stays opt-in because separate links to the same destination can have distinct campaigns, ownership and analytics.
- [#979](https://github.com/thedevs-network/kutt/issues/979): private actor-attributed link history and moderation audit, with secrets excluded.
- [#971](https://github.com/thedevs-network/kutt/issues/971): expired links and alias claims are retained rather than periodically deleted.
- [#965](https://github.com/thedevs-network/kutt/issues/965): optional OIDC role mapping with guarded write-time reauthorization.
- [#963](https://github.com/thedevs-network/kutt/issues/963), [#909](https://github.com/thedevs-network/kutt/issues/909), [#869](https://github.com/thedevs-network/kutt/issues/869): QR download in PNG/SVG with correction-level selection and enforced high correction for a logo.
- [#962](https://github.com/thedevs-network/kutt/issues/962): workspace members can manage shared links according to role.
- [#958](https://github.com/thedevs-network/kutt/issues/958): supported secret-file configuration.
- [#947](https://github.com/thedevs-network/kutt/issues/947): deployment requires an explicit PostgreSQL image/major and documents migration/restore. This prevents silent `latest` upgrades; it is not an automatic major-version migration.
- [#945](https://github.com/thedevs-network/kutt/issues/945), [#843](https://github.com/thedevs-network/kutt/issues/843): MySQL search and admin user filters; the remaining Users digit-prefix path was hardened under #1033 above.
- [#916](https://github.com/thedevs-network/kutt/issues/916): password-protected custom-domain routing.
- [#910](https://github.com/thedevs-network/kutt/issues/910), [#717](https://github.com/thedevs-network/kutt/issues/717): verified SQL and Redis TLS configuration.
- [#907](https://github.com/thedevs-network/kutt/issues/907), [#37](https://github.com/thedevs-network/kutt/issues/37): bounded CSV/JSON import and export with dry run and authorization.
- [#874](https://github.com/thedevs-network/kutt/issues/874): explicit audited unban.
- [#868](https://github.com/thedevs-network/kutt/issues/868), [#348](https://github.com/thedevs-network/kutt/issues/348): separate complete English, French and Spanish catalogs.
- [#864](https://github.com/thedevs-network/kutt/issues/864): allowlisted admin link sorting, including views.
- [#861](https://github.com/thedevs-network/kutt/issues/861): explicit cross-user custom-domain grants.
- [#808](https://github.com/thedevs-network/kutt/issues/808): dark, light and system appearance.
- [#551](https://github.com/thedevs-network/kutt/issues/551): private bounded-label Prometheus metrics.
- [#395](https://github.com/thedevs-network/kutt/issues/395): Nodemailer on port 587 with `MAIL_SECURE=false` negotiates STARTTLS when offered; this is not an enforced-TLS setting.
- [#108](https://github.com/thedevs-network/kutt/issues/108): authenticated date-range analytics and report filters.
- [#18](https://github.com/thedevs-network/kutt/issues/18): HTTPS custom domains behind the configured edge/TLS service.

## Not a Reproduced Fork Defect (10)

- Hosted upstream assets: [#1038](https://github.com/thedevs-network/kutt/issues/1038), [#1021](https://github.com/thedevs-network/kutt/issues/1021), [#1011](https://github.com/thedevs-network/kutt/issues/1011), [#990](https://github.com/thedevs-network/kutt/issues/990), [#987](https://github.com/thedevs-network/kutt/issues/987), [#769](https://github.com/thedevs-network/kutt/issues/769). They concern upstream premium/docs/domains or browser extensions, not this self-hosted fork or its Shortcuts integration.
- [#976](https://github.com/thedevs-network/kutt/issues/976): the cited admin link column is explicitly **Created at**, not **Updated at**. Patching a link does not reset its creation age. No timestamp defect was reproduced.
- [#849](https://github.com/thedevs-network/kutt/issues/849): the reported SQLite lock occurs in upstream's periodic `batchRemove` of expired links. This fork's cron no longer invokes that job and retains expired records. General external SQLite contention is not ruled out.
- [#833](https://github.com/thedevs-network/kutt/issues/833): the report concerns Kutt 3.2.2 with an external MySQL outage. This fork deploys SQLite; current MySQL smoke verifies normal SQL behavior, not outage/reconnection. Keep as unverified for external-MySQL users.
- [#915](https://github.com/thedevs-network/kutt/issues/915): the login-loop report has no reproducible configuration or trace. Fork tests cover login cookie, proxy/management origin, OIDC and session paths; it cannot responsibly be marked fixed from that report alone.

## Distinct Feature or Policy Requests (20)

These are not regressions with a demonstrated failure in this deployment. Do not silently implement backend, URL-identity, anonymous access or privacy changes as an issue fix:

| Scope | Issues | Disposition |
| --- | --- | --- |
| Optional databases/runtime | [#1028](https://github.com/thedevs-network/kutt/issues/1028), [#957](https://github.com/thedevs-network/kutt/issues/957), [#853](https://github.com/thedevs-network/kutt/issues/853) | Dragonfly and Oracle are not deployed/tested. Custom CA trust is a deployment/runtime concern; no trust bypass is appropriate. |
| URL identity/routing | [#1023](https://github.com/thedevs-network/kutt/issues/1023), [#956](https://github.com/thedevs-network/kutt/issues/956), [#903](https://github.com/thedevs-network/kutt/issues/903), [#279](https://github.com/thedevs-network/kutt/issues/279), [#950](https://github.com/thedevs-network/kutt/issues/950), [#920](https://github.com/thedevs-network/kutt/issues/920), [#242](https://github.com/thedevs-network/kutt/issues/242) | Management uses a protected hostname rather than a path. A longer destination limit needs coordinated schema, proxy, validation and abuse-bound changes. 404 fallbacks, app URI schemes and case-insensitive aliases alter public-routing/security contracts. |
| Management/product UX | [#1002](https://github.com/thedevs-network/kutt/issues/1002), [#982](https://github.com/thedevs-network/kutt/issues/982), [#981](https://github.com/thedevs-network/kutt/issues/981), [#885](https://github.com/thedevs-network/kutt/issues/885), [#655](https://github.com/thedevs-network/kutt/issues/655), [#446](https://github.com/thedevs-network/kutt/issues/446) | Share cards, richer public info, batch admin actions, hover tooltips, list-date filters and a per-user default domain are separate product work. Existing admin actions are deliberately individual/audited. |
| Auth/privacy policy | [#836](https://github.com/thedevs-network/kutt/issues/836), [#125](https://github.com/thedevs-network/kutt/issues/125), [#100](https://github.com/thedevs-network/kutt/issues/100), [#73](https://github.com/thedevs-network/kutt/issues/73) | Management stays behind Authentik SSO/MFA; anonymous advanced management and public statistics are not enabled by default. Direct LDAP/local MFA would duplicate the deployed identity boundary. |

## Verification and Delivery Boundary

The candidate image passed the full isolated container suite, focused regressions, Redis/Bull smoke, and the targeted MySQL 8.4/PostgreSQL 17 SQL suites for search, moderation, hourly analytics and dotted aliases. Browser/deployment gates must be recorded before claiming a release. `ioredis` production install audit reported zero vulnerabilities; this does not substitute for image scanning. No live deployment, backup/restore, upstream issue closure or GitHub release is implied by this source review.
