const { createHash, randomBytes, randomUUID } = require("node:crypto");
const knex = require("./knex");
const { CustomError } = require("./utils");

const SCOPES = Object.freeze({
  "links:read": "List links",
  "links:create": "Create links",
  "links:update": "Edit links",
  "links:delete": "Delete links",
  "stats:read": "Read statistics"
});

const hash = value => createHash("sha256").update(value).digest("hex");
const timestamp = value => value == null ? null : new Date(Number(value)).toISOString();

function sanitize(row) {
  return {
    id: row.id, name: row.name, prefix: row.prefix,
    scopes: JSON.parse(row.scopes),
    domain_scope: row.domain_scope,
    created_at: timestamp(row.created_at), expires_at: timestamp(row.expires_at),
    revoked_at: timestamp(row.revoked_at), last_used_at: timestamp(row.last_used_at),
    status: row.revoked_at != null ? "Revoked" :
      row.expires_at != null && Number(row.expires_at) <= Date.now() ? "Expired" : "Active"
  };
}

async function list(userId) {
  const rows = await knex("api_tokens").where({ user_id: userId })
    .orderBy("created_at", "desc").limit(100);
  return rows.map(sanitize);
}

async function create(userId, input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const scopes = typeof input.scopes === "string" ? [input.scopes] : input.scopes;
  if (!name || name.length > 80) throw new CustomError("Name must be 1 to 80 characters.", 400);
  if (!Array.isArray(scopes) || !scopes.length || scopes.length > 5 ||
      scopes.some(scope => typeof scope !== "string" || !Object.hasOwn(SCOPES, scope))) {
    throw new CustomError("Select at least one valid permission.", 400);
  }
  const domainScope = input.domain_scope === undefined ? "all" : input.domain_scope;
  if (typeof domainScope !== "string" || !/^(all|default|[a-f0-9-]{36})$/.test(domainScope)) {
    throw new CustomError("Select a valid domain restriction.", 400);
  }
  if (domainScope !== "all" && domainScope !== "default") {
    const domain = await knex("domains").where({ uuid: domainScope, user_id: userId, banned: false }).first();
    if (!domain) throw new CustomError("Domain was not found.", 400);
  }
  let expires = null;
  if (input.expires_at != null) {
    if (typeof input.expires_at !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.expires_at)) {
      throw new CustomError("Expiry must be an ISO 8601 UTC date.", 400);
    }
    expires = Date.parse(input.expires_at);
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      throw new CustomError("Expiry must be in the future.", 400);
    }
  } else if (input.expires_in_days !== undefined) {
    if (!["7", "30", "90", "365", "never"].includes(String(input.expires_in_days))) {
      throw new CustomError("Select a valid expiry.", 400);
    }
    if (input.expires_in_days !== "never") expires = Date.now() + Number(input.expires_in_days) * 86400000;
  } else {
    expires = Date.now() + 30 * 86400000;
  }
  // Older releases reject this prefix instead of ignoring the restriction.
  const token = (domainScope === "all" ? "kutt_" : "kutt_d_") + randomBytes(32).toString("base64url");
  const row = {
    id: randomUUID(), user_id: userId, name,
    token_hash: hash(token), prefix: token.slice(0, 13),
    scopes: JSON.stringify([...new Set(scopes)]),
    domain_scope: domainScope,
    created_at: Date.now(), expires_at: expires, revoked_at: null, last_used_at: null
  };
  await knex("api_tokens").insert(row);
  return { ...sanitize(row), token };
}

async function revoke(userId, id) {
  const row = await knex("api_tokens").where({ id, user_id: userId }).first();
  if (!row) throw new CustomError("Token was not found.", 404);
  if (row.revoked_at == null) {
    await knex("api_tokens").where({ id, user_id: userId }).update({ revoked_at: Date.now() });
  }
}

async function resolve(value) {
  if (!/^kutt_(?:d_)?[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const row = await knex("api_tokens").where({ token_hash: hash(value) }).first();
  if (!row || row.revoked_at != null ||
      (row.expires_at != null && Number(row.expires_at) <= Date.now())) return null;
  if (value.length === 50 && row.domain_scope === "all") return null;
  // Bypass the user cache so bans and verification changes apply immediately.
  const user = await knex("users").where({ id: row.user_id }).first();
  if (!user || user.banned || !user.verified) return null;
  let domainId;
  if (row.domain_scope === "default") domainId = null;
  else if (row.domain_scope !== "all") {
    const domain = await knex("domains").where({ uuid: row.domain_scope, user_id: user.id, banned: false }).first();
    if (!domain) return null;
    domainId = domain.id;
  }
  return { row, user, domainId };
}

module.exports = { SCOPES, create, list, revoke, resolve };
