const knex = require("./knex");
const utils = require("./utils");
const geoip = require("geoip-lite");
const useragent = require("express-useragent").default;
const { isbot } = require("isbot");
const history = require("./link-history");
const validators = require("./handlers/validators.handler");
const devices = ["desktop", "mobile", "tablet", "bot", "other"];
const fail = (message, status = 400) => { throw new utils.CustomError(message, status); };
const object = value => value && typeof value === "object" && !Array.isArray(value);
const fields = (value, allowed) => {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail("Unknown or invalid routing field.");
};

function target(value) {
  return require("./link-transfer").normalized({ address: "routing-validation", target: value }).target;
}
function normalize(input) {
  if (!Array.isArray(input) || input.length > 20 || Buffer.byteLength(JSON.stringify(input)) > 32000) fail("Use at most 20 rules and 32 KB per policy.");
  return input.map(rule => {
    fields(rule, ["name", "target", "conditions"]);
    if (typeof rule.name !== "string" || !rule.name.trim() || rule.name.length > 80 || /[\u0000-\u001f\u007f]/.test(rule.name)) fail("Rule names must be 1 to 80 printable characters.");
    fields(rule.conditions, ["devices", "languages", "countries", "query"]);
    const conditions = {};
    for (const kind of ["devices", "languages", "countries"]) {
      if (rule.conditions[kind] === undefined) continue;
      const values = rule.conditions[kind];
      if (!Array.isArray(values) || !values.length || values.length > 20 || values.some(value => typeof value !== "string")) fail("Choose 1 to 20 values per condition.");
      conditions[kind] = [...new Set(values.map(value => {
        if (kind === "devices") { if (!devices.includes(value)) fail("Invalid device."); return value; }
        if (kind === "countries") { if (!/^[A-Z]{2}$/.test(value)) fail("Countries must be uppercase two-letter codes."); return value; }
        if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3}$/i.test(value)) fail("Invalid language tag.");
        return value.toLowerCase();
      }))];
    }
    if (rule.conditions.query !== undefined) {
      if (!Array.isArray(rule.conditions.query) || !rule.conditions.query.length || rule.conditions.query.length > 10) fail("Use 1 to 10 query conditions.");
      conditions.query = rule.conditions.query.map(condition => {
        fields(condition, ["key", "op", "value"]);
        if (typeof condition.key !== "string" || !/^[a-z0-9_.~-]{1,80}$/i.test(condition.key) || !["equals", "present", "absent"].includes(condition.op)) fail("Invalid query condition.");
        if (condition.op === "equals" && (typeof condition.value !== "string" || condition.value.length > 200 || /[\u0000-\u001f\u007f]/.test(condition.value))) fail("Invalid query value.");
        if (condition.op !== "equals" && condition.value !== undefined) fail("Only equals accepts a query value.");
        return { key: condition.key, op: condition.op, ...(condition.op === "equals" && { value: condition.value }) };
      });
    }
    if (!Object.keys(conditions).length) fail("A rule needs at least one condition; the link destination is the fallback.");
    return { name: rule.name.trim(), target: target(rule.target), conditions };
  });
}

function queryString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u001f\u007f#]/.test(value)) fail("Query must be at most 2048 characters without a fragment.");
  return value.replace(/^\?/, "");
}
function previewContext(value) {
  fields(value, ["device", "language", "country", "query"]);
  const result = { device: value.device || "other", language: value.language || "", country: value.country || "", query: queryString(value.query) };
  if (!devices.includes(result.device) || typeof result.language !== "string" ||
      (result.language && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3}$/i.test(result.language)) ||
      typeof result.country !== "string" || (result.country && !/^[A-Z]{2}$/.test(result.country))) fail("Invalid preview context.");
  result.language = result.language.toLowerCase();
  return result;
}
function context(req, suppliedQuery) {
  const ua = (req.get("User-Agent") || "").slice(0, 1000), parsed = useragent.parse(ua);
  const device = isbot(ua) ? "bot" : parsed.isTablet ? "tablet" : parsed.isMobile ? "mobile" : parsed.isDesktop ? "desktop" : "other";
  const language = (req.acceptsLanguages()[0] || "").toLowerCase();
  return { device, language: /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3}$/.test(language) ? language : "",
    // Country headers supplied by a client are not trusted. The proxy trust
    // boundary controls req.ip; geography is a hint, never authorization.
    country: geoip.lookup(req.ip)?.country || "",
    query: queryString(suppliedQuery === undefined ? new URL(req.originalUrl, "http://local.invalid").search : suppliedQuery) };
}
function choose(rules, input, fallback) {
  const query = new URLSearchParams(input.query);
  const index = rules.findIndex(({ conditions: c }) =>
    (!c.devices || c.devices.includes(input.device)) &&
    (!c.languages || c.languages.some(tag => input.language === tag || input.language.startsWith(tag + "-"))) &&
    (!c.countries || c.countries.includes(input.country)) &&
    (!c.query || c.query.every(item => item.op === "absent" ? !query.has(item.key) : item.op === "present" ? query.has(item.key) : query.getAll(item.key).includes(item.value))));
  return { target: index < 0 ? fallback : rules[index].target, rule_index: index < 0 ? null : index,
    rule_name: index < 0 ? null : rules[index].name };
}
function storedPolicy(row) {
  try { return { revision: Number(row?.revision || 0), rules: normalize(row ? JSON.parse(row.rules) : []) }; }
  catch { fail("Routing policy is unavailable. Ask the link owner to repair it.", 503); }
}
async function policy(linkId, db = knex) {
  return storedPolicy(await db("link_routing").where({ link_id: linkId }).first());
}
async function owned(req, db = knex, write = false) {
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) fail("Link was not found.", 404);
  if (write) await db("links").where({ uuid: req.params.id, user_id: req.user.id }).update({ target: db.ref("target") });
  const link = await db("links").where({ uuid: req.params.id, user_id: req.user.id }).first();
  if (!link || link.banned || (req.apiTokenDomain !== undefined && (link.domain_id !== req.apiTokenDomain || link.archived_domain))) fail("Link was not found.", 404);
  if (link.deleted_at || link.archived_domain) fail("Restore this link and domain before managing routing.", 410);
  const user = await db("users").where({ id: req.user.id, verified: true, banned: false }).first();
  if (!user || Number(user.auth_version || 0) !== Number(req.user.auth_version || 0)) fail("Sign in again.", 401);
  if (link.domain_id && !await db("domains").where({ id: link.domain_id, user_id: user.id, banned: false }).first()) fail("Short domain is unavailable.", 410);
  if (req.apiToken) {
    const token = await db("api_tokens").where({ id: req.apiToken, user_id: user.id }).first();
    if (!token || token.revoked_at != null || (token.expires_at != null && Number(token.expires_at) <= Date.now()) ||
        !JSON.parse(token.scopes).includes(req.method === "PUT" ? "links:update" : "links:read")) fail("API token is no longer authorized.", 403);
  }
  return link;
}
async function checkTargets(rules) {
  for (const host of new Set(rules.map(rule => utils.removeWww(new URL(rule.target).hostname)))) {
    await validators.bannedDomain(host);
    await validators.bannedHost(host);
  }
}
async function save(req) {
  await owned(req);
  fields(req.body, ["rules", "revision"]);
  const rules = normalize(req.body.rules), revision = req.body.revision;
  if (!Number.isSafeInteger(revision) || revision < 0) fail("A current integer revision is required.");
  await checkTargets(rules);
  return knex.transaction(async db => {
    const link = await owned(req, db, true), old = await db("link_routing").where({ link_id: link.id }).first();
    if (Number(old?.revision || 0) !== revision) fail("Routing changed elsewhere. Reload before saving.", 409);
    const next = { rules: JSON.stringify(rules), revision: revision + 1 };
    if (old) await db("link_routing").where({ link_id: link.id }).update(next);
    else await db("link_routing").insert({ link_id: link.id, ...next });
    await history.record(db, link, "routing_updated", ["routing_rules"], { id: req.user.id, apiToken: req.apiToken });
    return { rules, revision: next.revision };
  });
}
async function resolve(req, link, suppliedQuery) {
  const { rules } = await policy(link.id);
  if (!rules.length) return link.target;
  const result = choose(rules, context(req, suppliedQuery), link.target);
  if (result.rule_index !== null) {
    const host = utils.removeWww(new URL(result.target).hostname);
    if (await knex("domains").where({ address: host, banned: true }).first()) fail("Destination is unavailable.", 410);
  }
  return result.target;
}
module.exports = { normalize, queryString, previewContext, context, choose, storedPolicy, policy, owned, checkTargets, save, resolve };
