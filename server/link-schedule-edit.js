const { createHmac, timingSafeEqual } = require("node:crypto");
const env = require("./env");
const i18n = require("./i18n");
const { legacyTimestamp } = require("./link-deadline");

const policy = link => ({ expiry: legacyTimestamp(link.expire_in),
  start: link.starts_at == null ? null : Number(link.starts_at),
  end: link.ends_at == null ? null : Number(link.ends_at), paused: !!link.paused,
  limit: link.max_visits == null ? null : Number(link.max_visits) });
const sign = data => createHmac("sha256", env.JWT_SECRET).update("link-schedule-edit-v1\0" + data).digest("hex");
const conflict = () => { throw new (require("./utils").CustomError)(i18n.t("schedule.conflict"), 409); };

function snapshot(link) {
  const data = Buffer.from(JSON.stringify({ id: link.uuid, policy: policy(link) })).toString("base64url");
  return data + "." + sign(data);
}

function read(value, id) {
  if (typeof value !== "string" || value.length > 2048) return conflict();
  const [data, signature, extra] = value.split(".");
  if (extra !== undefined || !/^[a-zA-Z0-9_-]+$/.test(data) || !/^[a-f0-9]{64}$/.test(signature || "") ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(data)))) return conflict();
  let state;
  try { state = JSON.parse(Buffer.from(data, "base64url").toString()); } catch { return conflict(); }
  if (state.id !== id || !state.policy || typeof state.policy !== "object") return conflict();
  return state.policy;
}

function check(link, expected) {
  if (expected !== undefined && JSON.stringify(policy(link)) !== JSON.stringify(expected)) conflict();
}

module.exports = { snapshot, read, check };
