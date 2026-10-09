// Compatibility entry point: the canonical local-time editor supersedes the
// old UTC/relative-expiry controls. Legacy API behavior has server coverage.
process.env.KUTT_EVIDENCE_DIR ||= require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "kutt-local-schedule-"));
require("./browser-local-schedule.cjs");
