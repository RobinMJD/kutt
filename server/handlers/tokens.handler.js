const tokens = require("../api-tokens");
const knex = require("../knex");
const env = require("../env");
const { CustomError } = require("../utils");

// New API routes are unavailable to scoped tokens unless explicitly allowlisted.
const routes = [
  ["GET", /^\/links\/health\/?$/i, "links:read"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/health\/?$/i, "links:read"],
  ["PUT", /^\/links\/([a-f0-9-]{36})\/health\/?$/i, "links:update"],
  ["POST", /^\/links\/([a-f0-9-]{36})\/health\/check\/?$/i, "links:update"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/forwarding\/?$/i, "links:read"],
  ["PUT", /^\/links\/([a-f0-9-]{36})\/forwarding\/?$/i, "links:update"],
  ["POST", /^\/links\/([a-f0-9-]{36})\/forwarding\/preview\/?$/i, "links:read"],
  ["GET", /^\/webhooks(?:\/[a-f0-9-]{36}\/deliveries)?\/?$/i, "webhooks:read"],
  ["POST", /^\/webhooks(?:\/[a-f0-9-]{36}\/(?:rotate|retry|test))?\/?$/i, "webhooks:write"],
  ["PUT", /^\/webhooks\/[a-f0-9-]{36}\/?$/i, "webhooks:write"],
  ["DELETE", /^\/webhooks\/[a-f0-9-]{36}\/?$/i, "webhooks:write"],
  ["GET", /^\/events\/?$/i, "events:read"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/tracking\/?$/i, "links:read"],
  ["PUT", /^\/links\/([a-f0-9-]{36})\/tracking\/?$/i, "links:update"],
  ["GET", /^\/analytics\/?$/i, "stats:read"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/routing\/?$/i, "links:read"],
  ["PUT", /^\/links\/([a-f0-9-]{36})\/routing\/?$/i, "links:update"],
  ["POST", /^\/links\/([a-f0-9-]{36})\/routing\/preview\/?$/i, "links:read"],
  ["GET", /^\/workspaces(?:\/[a-f0-9-]{36})?\/?$/i, "workspaces:read"],
  ["POST", /^\/workspaces\/[a-f0-9-]{36}\/links(?:\/[a-f0-9-]{36}\/restore)?\/?$/i, "workspaces:write"],
  ["PATCH", /^\/workspaces\/[a-f0-9-]{36}\/links\/[a-f0-9-]{36}\/?$/i, "workspaces:write"],
  ["DELETE", /^\/workspaces\/[a-f0-9-]{36}\/links\/[a-f0-9-]{36}\/?$/i, "workspaces:write"],
  ["GET", /^\/transfer\/export\/?$/i, "links:read"],
  ["GET", /^\/transfer\/template\/?$/i, "links:create"],
  ["POST", /^\/transfer\/(?:preview|commit)\/?$/i, "links:create"],
  ["GET", /^\/library\/?$/i, "links:read"],
  ["POST", /^\/library\/bulk\/?$/i, "links:update"],
  ["POST", /^\/library\/(?:labels|filters)\/?$/i, "links:update"],
  ["PATCH", /^\/library\/(?:labels|filters)\/[a-f0-9-]{36}\/?$/i, "links:update"],
  ["DELETE", /^\/library\/(?:labels|filters)\/[a-f0-9-]{36}\/?$/i, "links:update"],
  ["GET", /^\/links\/?$/i, "links:read"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/qr\/?$/i, "links:read"],
  ["GET", /^\/links\/trash\/?$/i, "links:read"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/history\/?$/i, "links:read"],
  ["POST", /^\/links\/([a-f0-9-]{36})\/restore\/?$/i, "links:update"],
  ["POST", /^\/links\/?$/i, "links:create"],
  ["PATCH", /^\/links\/([a-f0-9-]{36})\/?$/i, "links:update"],
  ["PATCH", /^\/links\/([a-f0-9-]{36})\/lifecycle\/?$/i, "links:update"],
  ["DELETE", /^\/links\/([a-f0-9-]{36})\/?$/i, "links:delete"],
  ["GET", /^\/links\/([a-f0-9-]{36})\/stats\/?$/i, "stats:read"]
];

async function authenticate(req, res, next) {
  const supplied = [req.get("X-API-Key"), req.body?.apikey, req.query.apikey]
    .filter(value => value !== undefined);
  if (!supplied.length) return next();
  res.set("Cache-Control", "no-store");
  if (supplied.some(value => typeof value !== "string" || !value || value.length > 256)) {
    return res.status(401).json({ error: "Invalid API credential." });
  }
  if (!supplied.some(value => value.startsWith("kutt_") && value.length !== 40)) {
    // Invalid explicit credentials must not fall back to an unrelated cookie.
    const legacy = supplied.length === 1 && await knex("users").where({ apikey: supplied[0] }).first();
    if (!legacy || legacy.banned || !legacy.verified) {
      return res.status(401).json({ error: "Invalid API credential." });
    }
    return next();
  }
  if (supplied.length !== 1 || supplied[0] !== req.get("X-API-Key")) {
    return res.status(401).json({ error: "Use a scoped token only in the X-API-Key header." });
  }
  const resolved = await tokens.resolve(supplied[0]);
  if (!resolved) return res.status(401).json({ error: "Invalid or expired API token." });
  const route = routes.find(([method, pattern]) => method === req.method && pattern.test(req.path));
  const scopes = JSON.parse(resolved.row.scopes);
  const requiredScope = route && req.method === "POST" && /^\/library\/bulk\/?$/i.test(req.path) && req.body.action === "trash"
    ? "links:delete" : route?.[2];
  if (!route || !scopes.includes(requiredScope)) {
    return res.status(403).json({ error: "API token does not permit this operation." });
  }
  const id = req.path.match(route[1])[1];
  if (id) {
    const owned = await knex("links").where({ uuid: id, user_id: resolved.user.id }).first();
    if (!owned || (resolved.domainId !== undefined && (owned.domain_id !== resolved.domainId || owned.archived_domain))) {
      return res.status(404).json({ error: "Link was not found." });
    }
  }
  // Never inherit administrator privileges or elevate using a browser cookie.
  req.user = { ...resolved.user, admin: false };
  req.apiToken = resolved.row.id;
  req.apiTokenDomain = resolved.domainId;
  res.locals.isAdmin = false;
  if (resolved.row.last_used_at == null || Number(resolved.row.last_used_at) < Date.now() - 60000) {
    await knex("api_tokens").where({ id: resolved.row.id }).update({ last_used_at: Date.now() });
  }
  return next();
}

function sessionOnly(req, res, next) {
  res.set("Cache-Control", "no-store");
  if (req.apiToken || req.get("X-API-Key") !== undefined ||
      req.body?.apikey !== undefined || req.query.apikey !== undefined) {
    throw new CustomError("Use your signed-in session for this operation.", 403);
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.get("Sec-Fetch-Site") === "cross-site") throw new CustomError("Invalid request origin.", 403);
    const origin = req.get("Origin");
    if (origin) {
      let host;
      try { host = new URL(origin).host; } catch {}
      if (host !== env.DEFAULT_DOMAIN) throw new CustomError("Invalid request origin.", 403);
    }
  }
  return next();
}

async function load(req, res, next) {
  const domains = await knex("domains").where({ user_id: req.user.id, banned: false });
  res.locals.tokenDomains = domains;
  res.locals.apiTokens = (await tokens.list(req.user.id)).map(token => ({
    ...token, active: token.status === "Active", scopesLabel: token.scopes.join(", "),
    domainLabel: token.domain_scope === "all" ? "All owned domains" :
      token.domain_scope === "default" ? env.DEFAULT_DOMAIN :
        domains.find(domain => domain.uuid === token.domain_scope)?.address || "Unavailable domain (access denied)"
  }));
  res.locals.tokenScopes = Object.entries(tokens.SCOPES).map(([value, label]) => ({ value, label }));
  next();
}

async function list(req, res) {
  res.json({ data: await tokens.list(req.user.id) });
}

async function create(req, res) {
  const result = await tokens.create(req.user.id, req.body);
  if (!req.isHTML) return res.status(201).json(result);
  await load(req, res, () => {});
  res.render("partials/settings/tokens", { newToken: result.token });
}

async function revoke(req, res) {
  await tokens.revoke(req.user.id, req.params.id);
  if (!req.isHTML) return res.sendStatus(204);
  await load(req, res, () => {});
  res.render("partials/settings/tokens");
}

module.exports = { authenticate, sessionOnly, load, list, create, revoke };
