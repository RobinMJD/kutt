const { createHmac, timingSafeEqual } = require("node:crypto");
const env = require("./env");
const { CustomError } = require("./utils");

// Opaque edit state, not a counter: personal edits must invalidate workspace
// drafts too. Visit counts and worker timestamps deliberately do not.
function revision(link) {
  const fields = ["uuid", "user_id", "domain_id", "archived_domain", "address", "target",
    "description", "password", "paused", "starts_at", "ends_at", "max_visits", "expire_in", "deleted_at", "banned"];
  const value = fields.map(field => [field, link[field] ?? null]);
  return createHmac("sha256", env.JWT_SECRET).update("workspace-link-edit-v1\0" + JSON.stringify(value)).digest("hex");
}

function check(link, expected) {
  if (expected === undefined) return; // Legacy partial-update API compatibility.
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    throw new CustomError("Reload the editor before saving this link.", 409);
  }
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(revision(link)))) {
    const error = new CustomError("This link changed elsewhere. Review the saved values and your draft before saving again.", 409);
    error.workspaceEditConflict = true;
    throw error;
  }
}

function draft(body) {
  const result = {};
  for (const key of ["target", "address", "description", "starts_at", "ends_at", "max_visits"]) {
    if (typeof body[key] === "string") result[key] = body[key].slice(0, 2040);
  }
  result.paused = body.paused === "on" || body.paused === "true";
  result.clear_password = body.clear_password === "on";
  result.password_reentry = typeof body.password === "string" && body.password.length > 0;
  return result;
}

module.exports = { revision, check, draft };
