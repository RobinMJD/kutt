const { randomUUID, randomBytes, hkdfSync, createCipheriv, createDecipheriv, createHmac } = require("node:crypto");
const knex = require("./knex");
const env = require("./env");
const safe = require("./safe-http");
const { CustomError } = require("./utils");
const TYPES = Object.freeze(["link.created", "link.updated", "link.trashed", "link.restored", "link.organized", "link.imported", "link.routing_updated", "link.tracking_updated", "link.forwarding_updated", "link.health_configured", "link.health_changed"]);
const fail = (message, status = 400) => { throw new CustomError(message, status); };
const key = () => Buffer.from(hkdfSync("sha256", env.JWT_SECRET, "kutt-webhooks", "signing-secret-v1", 32));
const iso = value => value == null ? null : new Date(Number(value)).toISOString();
const uuid = value => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
function encrypt(secret, id) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(id));
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
function decrypt(value, id) {
  const [version, iv, tag, data, extra] = value.split(".");
  if (version !== "v1" || extra || !data) throw new Error("SECRET_UNAVAILABLE");
  const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  cipher.setAAD(Buffer.from(id)); cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([cipher.update(Buffer.from(data, "base64url")), cipher.final()]).toString("utf8");
}
function signature(secret, timestamp, body) {
  return "v1=" + createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
}
function strict(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k))) fail("Invalid webhook fields.");
}
function revision(value) { if (!Number.isSafeInteger(value) || value < 1 || value >= Number.MAX_SAFE_INTEGER) fail("A valid revision is required."); }
async function authorized(req, db = knex, lock = false) {
  if (!req.user || req.apiTokenDomain !== undefined) fail("Use owner-wide permissions for integrations.", 403);
  const user = await db("users").where({ id: req.user.id }).modify(q => { if (lock) q.forUpdate(); }).first();
  if (!user || user.banned || !user.verified || Number(user.auth_version) !== Number(req.user.auth_version)) fail("Sign in again.", 401);
  return user;
}
async function owned(req, db = knex) {
  if (!uuid(req.params.id)) fail("Webhook was not found.", 404);
  const row = await db("webhooks").where({ id: req.params.id, user_id: req.user.id }).first();
  if (!row) fail("Webhook was not found.", 404);
  return row;
}
function clean(row, user) {
  return { id: row.id, name: row.name, url: row.url, events: JSON.parse(row.events), enabled: !!row.enabled,
    revision: Number(row.revision), authorization_required: Number(row.auth_version) !== Number(user.auth_version),
    created_at: iso(row.created_at), updated_at: iso(row.updated_at) };
}
async function configuration(body) {
  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80 || typeof body.enabled !== "boolean" ||
    !Array.isArray(body.events) || !body.events.length || body.events.length > TYPES.length || body.events.some(e => !TYPES.includes(e))) fail("Provide a name, HTTPS URL, enabled flag and valid events.");
  let url; try { url = await safe.validate(body.url); } catch { fail("Webhook URL must resolve exclusively to public HTTPS addresses on port 443."); }
  return { name: body.name.trim(), url, enabled: body.enabled, events: JSON.stringify([...new Set(body.events)]) };
}
async function list(req) {
  const user = await authorized(req);
  const rows = await knex("webhooks").where({ user_id: user.id }).orderBy("created_at", "desc");
  return { data: rows.map(row => clean(row, user)), event_types: TYPES };
}
async function save(req, create = false) {
  strict(req.body, ["name", "url", "enabled", "events", ...(create ? [] : ["revision"])]);
  await authorized(req);
  if (!create) { revision(req.body.revision); await owned(req); }
  const config = await configuration(req.body);
  return knex.transaction(async db => {
    const user = await authorized(req, db, true), now = Date.now();
    if (create) {
      const { count } = await db("webhooks").where({ user_id: user.id }).count("* as count").first();
      if (Number(count) >= 10) fail("At most ten webhooks may be configured.", 409);
      const id = randomUUID(), secret = "whsec_" + randomBytes(32).toString("base64url");
      const row = { ...config, id, user_id: user.id, secret: encrypt(secret, id), revision: 1, auth_version: user.auth_version, created_at: now, updated_at: now };
      await db("webhooks").insert(row);
      return { ...clean(row, user), secret };
    }
    const row = await owned(req, db);
    if (Number(row.revision) !== req.body.revision) fail("Webhook changed. Reload before saving.", 409);
    const update = { ...config, revision: req.body.revision + 1, auth_version: user.auth_version, updated_at: now };
    const changed = await db("webhooks").where({ id: row.id, revision: req.body.revision }).update(update);
    if (!changed) fail("Webhook changed. Reload before saving.", 409);
    await cancel(db, row.id);
    return clean({ ...row, ...update }, user);
  });
}
async function cancel(db, id) {
  await db("webhook_deliveries").where({ webhook_id: id }).whereIn("state", ["pending", "delivering", "failed"])
    .update({ state: "cancelled", lease: null, lease_until: null, completed_at: Date.now(), error: "CONFIGURATION_CHANGED" });
}
async function rotate(req) {
  strict(req.body, ["revision"]); revision(req.body.revision);
  return knex.transaction(async db => {
    const user = await authorized(req, db, true), row = await owned(req, db);
    if (Number(row.revision) !== req.body.revision) fail("Webhook changed. Reload before rotating.", 409);
    const secret = "whsec_" + randomBytes(32).toString("base64url"), update = { revision: req.body.revision + 1,
      secret: encrypt(secret, row.id), auth_version: user.auth_version, updated_at: Date.now() };
    const changed = await db("webhooks").where({ id: row.id, revision: req.body.revision }).update(update);
    if (!changed) fail("Webhook changed. Reload before rotating.", 409);
    await cancel(db, row.id);
    return { ...clean({ ...row, ...update }, user), secret };
  });
}
async function remove(req) {
  strict(req.body, ["revision"]); revision(req.body.revision);
  await knex.transaction(async db => {
    await authorized(req, db, true); const row = await owned(req, db);
    if (Number(row.revision) !== req.body.revision) fail("Webhook changed. Reload before deleting.", 409);
    const changed = await db("webhooks").where({ id: row.id, revision: req.body.revision }).delete();
    if (!changed) fail("Webhook changed. Reload before deleting.", 409);
  });
}
function eventValue(row) { return { sequence: String(row.sequence), ...JSON.parse(row.payload) }; }
function cursor(value) {
  if (value === undefined || value === "") return 0;
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,15})$/.test(value) || !Number.isSafeInteger(Number(value))) fail("Invalid event cursor.");
  return Number(value);
}
async function events(req, after) {
  await authorized(req);
  const base = knex("management_events").where({ user_id: req.user.id });
  const latest = await base.clone().max("sequence as value").first();
  const data = after == null ? await base.clone().orderBy("sequence", "desc").limit(50).then(rows => rows.reverse()) :
    await base.clone().where("sequence", ">", cursor(after)).orderBy("sequence").limit(50);
  return { data: data.map(eventValue), cursor: String(data.at(-1)?.sequence || latest.value || 0) };
}
async function deliveries(req) {
  await authorized(req); await owned(req);
  const before = cursor(req.query.before);
  const rows = await knex("webhook_deliveries as d").join("management_events as e", "d.event_id", "e.id")
    .where("d.webhook_id", req.params.id).modify(q => { if (before) q.where("e.sequence", "<", before); })
    .select("d.*", "e.sequence", "e.type").orderBy("e.sequence", "desc").limit(50);
  return { data: rows.map(row => ({ id: row.id, event_id: row.event_id, sequence: String(row.sequence), type: row.type,
    revision: Number(row.revision), state: row.state, attempts: row.attempts, total_attempts: row.total_attempts,
    http_status: row.http_status, error: row.error, next_at: row.state === "pending" ? iso(row.next_at) : null,
    created_at: iso(row.created_at), completed_at: iso(row.completed_at) })), next: rows.length === 50 ? String(rows.at(-1).sequence) : null };
}
async function retry(req) {
  strict(req.body, ["delivery_id", "revision"]); revision(req.body.revision);
  if (!uuid(req.body.delivery_id)) fail("Invalid delivery identifier.");
  await knex.transaction(async db => {
    const user = await authorized(req, db, true), hook = await owned(req, db);
    if (!hook.enabled || Number(hook.auth_version) !== Number(user.auth_version) || Number(hook.revision) !== req.body.revision) fail("Reload and enable the current webhook before retrying.", 409);
    const changed = await db("webhook_deliveries").where({ id: req.body.delivery_id, webhook_id: hook.id, revision: hook.revision, state: "failed" })
      .update({ state: "pending", attempts: 0, next_at: Date.now(), completed_at: null, error: null, http_status: null });
    if (!changed) fail("Only failed deliveries of the current configuration can be retried.", 409);
  });
}
async function test(req) {
  strict(req.body, ["revision"]); revision(req.body.revision);
  return knex.transaction(async db => {
    const user = await authorized(req, db, true), hook = await owned(req, db);
    if (!hook.enabled || Number(hook.auth_version) !== Number(user.auth_version) || Number(hook.revision) !== req.body.revision) fail("Reload and enable the current webhook before testing.", 409);
    const id = randomUUID(), delivery = randomUUID(), now = Date.now(), type = "webhook.test";
    const payload = JSON.stringify({ id, type, occurred_at: new Date(now).toISOString(), data: {} });
    await db("management_events").insert({ id, user_id: user.id, type, payload, created_at: now });
    await db("webhook_deliveries").insert({ id: delivery, webhook_id: hook.id, event_id: id, revision: hook.revision, state: "pending", next_at: now, created_at: now });
    return { delivery_id: delivery, event_id: id };
  });
}
async function record(db, link, action, fields) {
  if (!link.user_id || !TYPES.includes("link." + action)) return;
  const user = await db("users").where({ id: link.user_id }).first();
  if (!user) return;
  const id = randomUUID(), now = Date.now(), type = "link." + action;
  const payload = JSON.stringify({ id, type, occurred_at: new Date(now).toISOString(), data: { link_id: link.uuid, fields } });
  await db("management_events").insert({ id, user_id: user.id, type, payload, created_at: now });
  const hooks = await db("webhooks").where({ user_id: user.id, enabled: true, auth_version: user.auth_version });
  if (!user.banned && user.verified) for (const hook of hooks) {
    if (JSON.parse(hook.events).includes(type)) await db("webhook_deliveries").insert({
      id: randomUUID(), webhook_id: hook.id, event_id: id, revision: hook.revision, state: "pending", next_at: now, created_at: now
    });
  }
}

async function claim(now) {
  return knex.transaction(async db => {
    // A conditional lease claim is portable across SQLite and row-locking engines.
    const row = await db("webhook_deliveries").where(q => q.where({ state: "pending" }).where("next_at", "<=", now)
      .orWhere(q => q.where({ state: "delivering" }).where("lease_until", "<=", now))).orderBy("next_at").first();
    if (!row) return null;
    if (row.attempts >= 6) {
      await db("webhook_deliveries").where({ id: row.id, state: row.state }).modify(q => {
        if (row.state === "delivering") q.where("lease", row.lease).where("lease_until", "<=", now);
      }).update({ state: "failed", error: "ATTEMPTS_EXHAUSTED", lease: null, lease_until: null, completed_at: now });
      return null;
    }
    const lease = randomUUID();
    const changed = await db("webhook_deliveries").where({ id: row.id, state: row.state }).modify(q => {
      if (row.state === "delivering") q.where("lease", row.lease).where("lease_until", "<=", now);
    }).update({ state: "delivering", lease, lease_until: now + 60000, attempts: row.attempts + 1, total_attempts: row.total_attempts + 1 });
    return changed ? { ...row, state: "delivering", lease, attempts: row.attempts + 1 } : null;
  });
}
async function deliver(row, now = Date.now()) {
  const hook = await knex("webhooks").where({ id: row.webhook_id }).first();
  const event = await knex("management_events").where({ id: row.event_id }).first();
  const user = hook && await knex("users").where({ id: hook.user_id }).first();
  const match = { id: row.id, state: "delivering", lease: row.lease };
  if (!hook || !event || !hook.enabled || !user || user.banned || !user.verified ||
    Number(hook.revision) !== Number(row.revision) || Number(hook.auth_version) !== Number(user.auth_version)) {
    await knex("webhook_deliveries").where(match).update({ state: "cancelled", completed_at: now, lease: null, lease_until: null, error: "AUTHORIZATION_OR_CONFIGURATION_CHANGED" });
    return;
  }
  let status = null, error = null;
  try {
    const timestamp = String(Math.floor(Date.now() / 1000)), body = event.payload;
    const signed = signature(decrypt(hook.secret, hook.id), timestamp, body);
    const result = await safe.send(hook.url, { body, headers: {
      "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(body)),
      "User-Agent": "Kutt-Webhooks/1", "X-Kutt-Event-Id": event.id, "X-Kutt-Delivery-Id": row.id,
      "X-Kutt-Timestamp": timestamp, "X-Kutt-Signature": signed
    } });
    status = result.status;
    if (status < 200 || status >= 300) error = status >= 300 && status < 400 ? "REDIRECT_DENIED" : "HTTP_ERROR";
  } catch (e) {
    error = ["URL_DENIED", "DNS_FAILED", "ADDRESS_DENIED", "TIMEOUT", "CONNECTION_FAILED"].includes(e.code) ? e.code : "DELIVERY_FAILED";
  }
  const retryable = error && !["URL_DENIED", "ADDRESS_DENIED", "REDIRECT_DENIED"].includes(error) && (status == null || status === 408 || status === 429 || status >= 500);
  const state = !error ? "delivered" : retryable && row.attempts < 6 ? "pending" : "failed";
  await knex("webhook_deliveries").where(match).update({ state, http_status: status, error, lease: null, lease_until: null,
    next_at: now + Math.min(30 * 2 ** (row.attempts - 1), 900) * 1000, completed_at: state === "pending" ? null : now });
}
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 5; i++) { const row = await claim(Date.now()); if (!row) break; await deliver(row); }
    const expired = await knex("management_events").where("created_at", "<", Date.now() - 30 * 86400000).orderBy("sequence").limit(500).pluck("id");
    if (expired.length) await knex("management_events").whereIn("id", expired).delete();
  } catch { console.error("Webhook worker failed; retrying on next interval."); }
  finally { running = false; }
}
function start() { const timer = setInterval(tick, 10000); timer.unref(); void tick(); }
module.exports = { TYPES, authorized, list, save, rotate, remove, events, deliveries, retry, test, record, claim, deliver, tick, start, cursor, signature, encrypt, decrypt };
