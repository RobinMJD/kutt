# One-Off Manual .69 Deployment

Status verified 10 October 2026: `.69` is live and healthy; focused deployment,
regression and pre/post NAS recovery acceptance passed. No rollback was performed.

The operator explicitly authorized manual deployment on 9 October 2026 after
GitHub refused release workflow dispatch with `Actions has been disabled for
this repository`. This is a one-off exception, not passing remote CI and not
permission to disable WAF, SSO, TLS, CSP, authorization checks or recovery gates.
The available GitHub credential has no container-package publication scope;
no `.69` GHCR publication is claimed.

## Immutable Inputs

- Source: `v3.2.6-sr94.69`, commit `35a9896ecb210032c546d53b96ce3b99e9b5c7f4`.
- `git archive` SHA-256: `aa0e902ca27adeafc9b5f99527a6cac2684097c78a0f70b406ad96d89d60edd6`.
- Native amd64 source image: `sha256:dbb9ebdacd7913b4ec992c6628105309c0f25d75e0dcdeb820b79b0df84e9536`.
- Hardened Debian3 wrapper: `sha256:7a73c66cd801490385fae85d756c6bbbd7dc2b82bb35c80cfb1eaa7113851297`.
- Previous accepted wrapper: `sha256:561cd0e42d6cc11c6ee72058c0cd18a7f600048485623d97e91da5f335354c70` (`.67.2`).

Image IDs identify Docker image indexes, not their platform manifest IDs.
Compare the live image using Docker's Go-template inspection and compare the
configured tag separately. An existing tag is never sufficient provenance.

## Validation Ledger

| Gate | Result |
| --- | --- |
| Full application regression on final source, ARM and native amd64 wrapper | Passed |
| Exact-wrapper browser matrix | 18 workflows passed: EN/FR/ES, three zones, light/dark, 1440/390/320px, seconds, DST, stale saves, clearing, public redirects and enforced CSP |
| Actual-data migration in an isolated copy | Three original links retain effective deadlines; eight other tracked tables unchanged; integrity/FKs and writable probe passed |
| Previous-image recovery of migrated copy | Passed; image-only rollback retains canonical deadlines |
| Image vulnerability scan | Zero Critical/High; three Medium package matches for BusyBox CVE-2025-60876 remain |
| Encrypted pre-change backup and NAS restore | Passed: snapshot `a9cc2637`, all 17 files verified and byte-identical; candidate writable restore passed with one user and three links |
| Guarded live cutover | Passed: only Kutt recreated, zero restarts, migrated original records and three secret-file hashes preserved |
| Live HTTPS/API/browser/monitoring acceptance | 39 public regression checks and 18 live EN/FR/ES light/dark desktop/mobile editor/map layouts passed; all 177 country labels verified; four strict monitoring samples passed |
| Encrypted post-change backup and restore | Passed: snapshot `e8eb34d5`, verified NAS restore, byte comparison and writable database check with one original user and three original links |

Full recovery IDs: pre-change
`a9cc2637306bf9ebe79bc2dab44be3742b66fc09edff5b2a710b7dcbcdea2301`,
post-change `e8eb34d50effc3820704a1ee8a8018e69b76ce3f0a1fca7e81545a8d60366613`.
The post-change archive contains the exact hardened wrapper, immutable source,
configuration, consistent SQLite state, secrets and Authentik dump. Archive
integrity and embedded image identity were checked. All disposable identities
and links were removed before the post-change snapshot; original fingerprints
and three secret hashes passed. The laptop-only connectivity interruption did
not stop the service or invalidate the completed server-side recovery checks.

Publication: [versioned source release](https://github.com/RobinMJD/kutt/releases/tag/v3.2.6-sr94.69)
and [isolated homelab deployment PR #64](https://github.com/RobinMJD/homelab/pull/64).
These do not imply successful Kutt release CI or registry publication.

On 10 October, a new strict monitoring check observed intermittent timeouts
from the independent NAS canary while Debian3 public/internal probes passed.
The canary subsequently reached Kutt normally without a service restart or
configuration change. Separately, the NAS host resolver (`127.0.0.1`, NextDNS)
returned sinkhole addresses `0.0.0.0` / `::` for the apex `shorter-link.com`;
its host HTTPS client therefore reported a certificate-name mismatch. This is
not proof of an invalid Kutt certificate or homelab outage. Do not bypass TLS,
replace the filtered resolver or weaken DNS policy. Review the applicable
NextDNS profile's apex-domain allowlist with authorized policy access; a
wildcard-only allowlist is not evidence that this host's apex is permitted.
NAS Docker/sudo access is not available to the tested noninteractive SSH user.

The rendered-map observer was corrected for legitimate server/browser ICU
territory-name differences. A fixture cleanup hit a SQLite lock upgrade and was
completed with an immediate transaction, then independently verified. The full
public smoke suite passed after updating obsolete UI expectations and comparing
equivalent ISO timestamps as instants. These were test-observer corrections,
not relaxed service security checks. Private failed-attempt logs are retained.

## Recovery And Limits

Private evidence, consistent SQLite snapshots, wrapper inputs, hashes, scan
results and guarded `cutover.sh` / `rollback.sh` are retained under
`/srv/homelab/security-reports/2026-10-09-kutt-manual69` on Debian3. They contain
private recovery material and must not be committed or made publicly accessible.
The NAS mirror uses the same encrypted Restic repository identity; snapshot
IDs are therefore identical locally and on NAS. Mirror copying is serialized
with the existing backup lock, does not delete NAS-only files, and is followed
by restoration from NAS and byte comparison, not merely checking a directory.
This is focused Kutt/Authentik recovery, not a whole-lab or external-SSD backup.

Preserve live data and secrets during rollback. The migration keeps the earliest
old deadline and clears the legacy field; compatible `.67.2` already enforces
the canonical deadline. Never overwrite newer writes with an older snapshot
merely to undo a UI change. Reload old browser editors after upgrade; their
signed snapshots deliberately refuse stale changes.

For exact disaster recovery, restore the encrypted recovery archive and verify
its checksum before `docker load`. Check the loaded wrapper's exact image ID,
restore configuration and secrets privately, then test a writable **copy** of
the recovered database using `restore-check.cjs` before startup. Rebuilding from
the immutable source archive and dependency lockfiles is also possible, but
updated Alpine packages can change the resulting image ID; repeat the full
tests and scan rather than presenting that rebuild as the archived image.

New releases still require the normal remote release workflow. The manual
source receipt is restricted to this exact version and explicit exception.
Do not extend that exception to later tags. Public redirects remain anonymous,
while management remains protected. Browser fixtures authenticate disposable
ordinary users through HTTPS/WAF; a fresh human Authentik ceremony, native
Safari/Firefox and a physical-phone test are not claimed.
