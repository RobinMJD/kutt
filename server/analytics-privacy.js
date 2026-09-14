const { createHmac, timingSafeEqual } = require("node:crypto");
const knex = require("./knex");
const env = require("./env");
const { CustomError, dateToUTC } = require("./utils");
const history = require("./link-history");
const routing = require("./link-routing");
const fail = (message, status = 400) => { throw new CustomError(message, status); };
const DAY = 86400000;
const object = value => value && typeof value === "object" && !Array.isArray(value);
function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail("Invalid privacy settings.");
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail("A current integer revision is required.");
}
function days(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 36500) fail("Retention must be 0 (disabled) or 1 to 36500 days.");
  return value;
}
function trackingValue(row) {
  if (!row) return { enabled: true, revision: 0 };
  if (![true, false, 0, 1].includes(row.enabled) || !Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 1) fail("Tracking configuration is unavailable.", 503);
  return { enabled: !!row.enabled, revision: Number(row.revision) };
}
async function tracking(linkId, db = knex) {
  return trackingValue(await db("link_tracking").where({ link_id: linkId }).first().timeout(1000));
}
async function saveTracking(req) {
  fields(req.body, ["enabled", "revision"]); revision(req.body.revision);
  if (typeof req.body.enabled !== "boolean") fail("enabled must be a boolean.");
  return knex.transaction(async db => {
    const link = await routing.owned(req, db, true), old = await tracking(link.id, db);
    if (old.revision !== req.body.revision) fail("Tracking changed elsewhere. Reload before saving.", 409);
    if (old.revision === Number.MAX_SAFE_INTEGER) fail("Tracking revision limit reached.", 409);
    const value = { enabled: req.body.enabled, revision: old.revision + 1 };
    await db("link_tracking").insert({ link_id: link.id, ...value }).onConflict("link_id").merge(value);
    await history.record(db, link, "tracking_updated", ["tracking_enabled"], { id: req.user.id, apiToken: req.apiToken });
    return value;
  });
}
async function administrator(req, db = knex) {
  if (req.get("X-API-Key") || req.apiToken || req.query?.apikey !== undefined || req.body?.apikey !== undefined ||
      !req.user || req.authInfo?.sub !== req.user.id || !Number.isFinite(req.authInfo?.exp) ||
      req.authInfo.exp * 1000 <= Date.now()) fail("An administrator browser session is required.", 403);
  const user = await db("users").where({ id: req.user.id, role: "ADMIN", verified: true, banned: false }).first();
  if (!user || Number(user.auth_version || 0) !== Number(req.user.auth_version || 0)) fail("Administrator access is no longer available.", 403);
}
async function retention(db = knex) {
  const row = await db("analytics_retention").where({ id: 1 }).first();
  if (!row || !Number.isSafeInteger(Number(row.days)) || Number(row.days) < 0 || Number(row.days) > 36500 ||
      !Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 0 ||
      !Number.isSafeInteger(Number(row.deleted_buckets)) || Number(row.deleted_buckets) < 0) fail("Retention configuration is unavailable.", 503);
  return { days: Number(row.days), revision: Number(row.revision),
    last_run: row.last_run == null ? null : new Date(Number(row.last_run)).toISOString(),
    deleted_buckets: Number(row.deleted_buckets), last_error: row.last_error };
}
function cutoff(value, now = Date.now()) {
  return dateToUTC(new Date(Math.floor(now / DAY) * DAY - value * DAY));
}
const sign = payload => createHmac("sha256", env.JWT_SECRET).update("analytics-retention-v1\0" + payload).digest("hex");
async function previewRetention(req) {
  await administrator(req); fields(req.body, ["days", "revision"]);
  const value = days(req.body.days); revision(req.body.revision);
  const old = await retention();
  if (old.revision !== req.body.revision) fail("Retention changed elsewhere. Reload before saving.", 409);
  const before = value ? cutoff(value) : null;
  const count = before ? Number((await knex("visits").where("created_at", "<", before).count("* as n").first()).n) : 0;
  const payload = Buffer.from(JSON.stringify({ user: req.user.id, auth: Number(req.user.auth_version || 0),
    days: value, revision: old.revision, expires: Date.now() + 300000 })).toString("base64url");
  return { days: value, revision: old.revision, cutoff: before, eligible_buckets: count,
    confirmation: payload + "." + sign(payload) };
}
async function saveRetention(req) {
  await administrator(req); fields(req.body, ["confirmation", "acknowledge_deletion"]);
  if (typeof req.body.confirmation !== "string" || req.body.confirmation.length > 1000) fail("Preview retention first.");
  const [payload, signature, extra] = req.body.confirmation.split(".");
  const expected = sign(payload);
  if (extra || !/^[a-f0-9]{64}$/.test(signature || "") || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail("Preview confirmation is invalid.");
  let value;
  try { value = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { fail("Preview confirmation is invalid."); }
  if (!object(value) || value.user !== req.user.id || value.auth !== Number(req.user.auth_version || 0) || !Number.isSafeInteger(value.expires) || value.expires <= Date.now()) fail("Preview confirmation has expired or belongs to another session.", 409);
  days(value.days); revision(value.revision);
  if (value.days && req.body.acknowledge_deletion !== true) fail("Explicitly acknowledge permanent deletion of expired analytics.");
  return knex.transaction(async db => {
    await db("analytics_retention").where({ id: 1 }).update({ days: db.ref("days") });
    await administrator(req, db);
    const old = await retention(db);
    if (old.revision !== value.revision) fail("Retention changed elsewhere. Preview again before saving.", 409);
    if (old.revision === Number.MAX_SAFE_INTEGER) fail("Retention revision limit reached.", 409);
    await db("analytics_retention").where({ id: 1 }).update({ days: value.days, revision: old.revision + 1, last_error: null });
    return retention(db);
  });
}
let running = false;
async function purge(now = Date.now()) {
  if (running) return;
  running = true;
  try {
    // Lock the singleton before each bounded batch. Policy changes, other app
    // processes and retention workers cannot race a stale deletion policy.
    for (let batch = 0; batch < 10; batch++) {
      const count = await knex.transaction(async db => {
        await db("analytics_retention").where({ id: 1 }).update({ days: db.ref("days") });
        const policy = await retention(db);
        if (!policy.days) return 0;
        const ids = await db("visits").where("created_at", "<", cutoff(policy.days, now)).orderBy("id").limit(500).pluck("id");
        if (ids.length) await db("visits").whereIn("id", ids).delete();
        await db("analytics_retention").where({ id: 1 }).update({ last_run: now, last_error: null,
          deleted_buckets: db.raw("deleted_buckets + ?", [ids.length]) });
        return ids.length;
      });
      if (count < 500) break;
    }
  } catch (error) {
    // No database messages, URLs or credentials are published in status/logs.
    await knex("analytics_retention").where({ id: 1 }).update({ last_error: "Analytics retention failed; inspect database availability." }).catch(() => {});
    console.error("Analytics retention failed; inspect database availability.");
    throw new CustomError("Analytics retention failed; inspect database availability.", 503);
  } finally { running = false; }
}
function start() {
  const run = () => purge().catch(() => {});
  const timer = setInterval(run, 60000); timer.unref(); run();
  return timer;
}
module.exports = { trackingValue, tracking, saveTracking, administrator, retention, previewRetention, saveRetention, purge, start };
