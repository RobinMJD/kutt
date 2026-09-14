const knex = require("./knex");
const { CustomError } = require("./utils");
const routing = require("./link-routing");
const history = require("./link-history");
const fail = (message, status = 400) => { throw new CustomError(message, status); };
const sensitive = /^(?:access_token|refresh_token|id_token|token|api[_-]?key|password|secret|authorization|cookie|code|state)$/i;
const object = value => value && typeof value === "object" && !Array.isArray(value);
function fields(value, keys) {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) fail("Unknown or invalid forwarding field.");
}
function path(value) {
  if (value === "") return "";
  if (typeof value !== "string" || value.length > 256) fail("Path suffix must be at most 256 characters.");
  const parts = value.split("/");
  if (parts.length > 8 || parts.some(part => !/^[A-Za-z0-9_~.-]+$/.test(part) || part === "." || part === "..")) {
    fail("Use 1 to 8 literal path segments without encoding or traversal.");
  }
  return value;
}
function normalize(value = {}) {
  fields(value, ["query_keys", "path_prefixes"]);
  const result = {};
  for (const key of ["query_keys", "path_prefixes"]) {
    const list = value[key] === undefined ? [] : value[key];
    if (!Array.isArray(list) || list.length > 20 || list.some(item => typeof item !== "string")) fail("Use at most 20 explicit entries per allowlist.");
    result[key] = [...new Set(list.map(item => {
      if (key === "path_prefixes") { if (!item) fail("An empty path prefix is not allowed."); return path(item); }
      if (!/^[A-Za-z0-9_.~-]{1,80}$/.test(item) || sensitive.test(item)) fail("Invalid or credential-like query key.");
      return item;
    }))];
  }
  return result;
}
function stored(row) {
  try { return { ...normalize(row ? JSON.parse(row.policy) : {}), revision: Number(row?.revision || 0) }; }
  catch { fail("Forwarding policy is unavailable. Ask the link owner to repair it.", 503); }
}
async function policy(id, db = knex) { return stored(await db("link_forwarding").where({ link_id: id }).first()); }
function allows(config, suffix) {
  path(suffix);
  return !suffix || config.path_prefixes.some(prefix => suffix === prefix || suffix.startsWith(prefix + "/"));
}
function apply(config, destination, query = "", suffix = "") {
  if (!allows(config, suffix)) fail("This path is not enabled for this short link.", 404);
  if (!config.query_keys.length && !suffix) return destination;
  // URL is only manipulated locally. No headers, cookies or HTTP requests are forwarded.
  const target = new URL(routing.target(destination));
  if (suffix) target.pathname = target.pathname.replace(/\/$/, "") + "/" + suffix;
  if (config.query_keys.length) {
    const incoming = new URLSearchParams(routing.queryString(query));
    if ([...incoming].length > 50) fail("Use at most 50 incoming query parameters.");
    for (const key of config.query_keys) {
      if (target.searchParams.has(key)) continue;
      const values = incoming.getAll(key);
      if (values.length > 10 || values.some(value => value.length > 500 || /[\u0000-\u001f\u007f]/.test(value))) fail("Forwarded values exceed their limits.");
      for (const value of values) target.searchParams.append(key, value);
    }
  }
  if (target.href.length > 2040) fail("The forwarded destination is too long.");
  return target.href;
}
function submittedPath(body) {
  // Keep .14 clients compatible; new clients use a name without CRS's .forward match.
  if (body.suffix_path !== undefined && body.forwarding_path !== undefined && body.suffix_path !== body.forwarding_path) fail("Conflicting short paths.");
  return body.suffix_path === undefined ? body.forwarding_path : body.suffix_path;
}
async function resolve(req, link, suppliedQuery, suppliedPath) {
  const config = await policy(link.id);
  if (suppliedPath) {
    path(suppliedPath);
    const match = await lookup(link.address + "/" + suppliedPath, link.domain_id);
    if (!match || match.link.uuid !== link.uuid) fail("The short path belongs to another link.", 404);
  }
  return apply(config, await routing.resolve(req, link, suppliedQuery),
    suppliedQuery === undefined ? new URL(req.originalUrl, "http://local.invalid").search : suppliedQuery,
    suppliedPath === undefined ? req.forwardPath || "" : suppliedPath);
}
async function protectedQuery(req, link) {
  const config = await policy(link.id);
  return config.query_keys.length ? routing.queryString(new URL(req.originalUrl, "http://local.invalid").search) : routing.protectedQuery(req, link);
}
async function save(req) {
  await routing.owned(req);
  fields(req.body, ["query_keys", "path_prefixes", "revision"]);
  const { revision, ...input } = req.body, config = normalize(input);
  if (!Number.isSafeInteger(revision) || revision < 0) fail("A current integer revision is required.");
  return knex.transaction(async db => {
    const link = await routing.owned(req, db, true);
    if (config.query_keys.length || config.path_prefixes.length) {
      routing.target(link.target);
      for (const rule of (await routing.policy(link.id, db)).rules) routing.target(rule.target);
    }
    const old = await db("link_forwarding").where({ link_id: link.id }).first();
    if (Number(old?.revision || 0) !== revision) fail("Forwarding changed elsewhere. Reload before saving.", 409);
    const next = { policy: JSON.stringify(config), revision: revision + 1 };
    if (old) await db("link_forwarding").where({ link_id: link.id }).update(next);
    else await db("link_forwarding").insert({ link_id: link.id, ...next });
    await history.record(db, link, "forwarding_updated", ["forwarding"], { id: req.user.id, apiToken: req.apiToken });
    return { ...config, revision: next.revision };
  });
}
// Exact aliases (including unavailable ones) win. A tombstone or existing child
// also prevents a broader parent policy from taking over that retired URL.
async function lookup(address, domainId) {
  const query = require("./queries");
  const parts = address.split("/");
  if (parts.length > 16 || address.length > 512) fail("Short path is too long.");
  for (let count = parts.length; count > 0; count--) {
    const candidate = parts.slice(0, count).join("/");
    const link = await query.link.find({ address: candidate, domain_id: domainId }, { fresh: true, includeTrash: true });
    if (link) {
      const suffix = parts.slice(count).join("/");
      if (suffix && !allows(await policy(link.id), suffix)) fail("This path is not enabled for this short link.", 404);
      return { link, suffix };
    }
    if (parts.length > 1 && await history.reserved(candidate, domainId)) fail("This alias is permanently reserved.", 410);
  }
  return null;
}
module.exports = { normalize, stored, path, policy, allows, apply, resolve, protectedQuery, save, lookup, submittedPath };
