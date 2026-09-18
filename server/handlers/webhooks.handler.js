const hooks = require("../webhooks");
const knex = require("../knex");
const { validSession } = require("../oidc-security");
const { CustomError } = require("../utils");
const { boundary } = require("./privacy.handler");
const connections = new Map();
const assetVersion = encodeURIComponent(require("../../package.json").version);
async function page(req, res) {
  await hooks.authorized(req);
  res.render("webhooks", { title: "Integrations", event_types: hooks.TYPES, asset_version: assetVersion,
    custom_styles: [...(res.locals.custom_styles || []), `webhooks.css?v=${assetVersion}`] });
}
async function stream(req, res) {
  if (req.method !== "GET") throw new CustomError("Live updates require GET.", 405);
  await hooks.authorized(req);
  if (req.get("Sec-Fetch-Site") === "cross-site") throw new CustomError("Invalid request origin.", 403);
  const userId = req.user.id;
  let total = 0; for (const count of connections.values()) total += count;
  if ((connections.get(userId) || 0) >= 4 || total >= 100) throw new CustomError("Too many live connections.", 429);
  let after = String(hooks.cursor(req.get("Last-Event-ID") || req.query.after));
  const auth = req.authInfo;
  if (!auth?.exp || auth.exp * 1000 <= Date.now()) throw new CustomError("Sign in again.", 401);
  let active = true, pending = false, interval, deadline;
  const close = () => {
    if (!active) return; active = false;
    clearInterval(interval); clearTimeout(deadline);
    const count = (connections.get(userId) || 1) - 1;
    if (count) connections.set(userId, count); else connections.delete(userId);
    res.end();
  };
  connections.set(userId, (connections.get(userId) || 0) + 1);
  res.once("close", close);
  res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "private, no-store, no-transform",
    "X-Accel-Buffering": "no", Connection: "keep-alive" });
  res.flushHeaders(); res.write("retry: 5000\n\n");
  const poll = async () => {
    if (pending || !active) return; pending = true;
    try {
      const user = await knex("users").where({ id: userId }).first();
      if (!user || user.banned || !user.verified || auth.exp * 1000 <= Date.now() || !await validSession(user, auth)) {
        res.write("event: revoked\ndata: {}\n\n"); close(); return;
      }
      const result = await hooks.events(req, after);
      if (!active) return;
      for (const event of result.data) {
        after = event.sequence;
        if (!res.write(`id: ${event.sequence}\nevent: management\ndata: ${JSON.stringify(event)}\n\n`)) { close(); return; }
      }
      if (!result.data.length && !res.write(": heartbeat\n\n")) close();
    } catch { if (active) { res.write("event: unavailable\ndata: {}\n\n"); close(); } }
    finally { pending = false; }
  };
  interval = setInterval(poll, 2000); interval.unref();
  deadline = setTimeout(close, 5 * 60000); deadline.unref();
  await poll();
}
const handlers = {
  boundary, page, stream,
  list: async (req, res) => res.json(await hooks.list(req)),
  create: async (req, res) => res.status(201).json(await hooks.save(req, true)),
  save: async (req, res) => res.json(await hooks.save(req)),
  rotate: async (req, res) => res.json(await hooks.rotate(req)),
  remove: async (req, res) => { await hooks.remove(req); res.sendStatus(204); },
  events: async (req, res) => res.json(await hooks.events(req, req.query.after)),
  deliveries: async (req, res) => res.json(await hooks.deliveries(req)),
  test: async (req, res) => res.status(202).json(await hooks.test(req)),
  retry: async (req, res) => { await hooks.retry(req); res.sendStatus(202); }
};
// Driver errors can contain bound receiver URLs. Never pass those into the
// generic application logger, response body, or a live event frame.
module.exports = Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name,
  name === "boundary" ? handler : async (...args) => {
    try { return await handler(...args); }
    catch (error) {
      if (error instanceof CustomError) throw error;
      console.error("Integration operation failed.");
      throw new CustomError("Integrations are temporarily unavailable. Retry shortly.", 503);
    }
  }
]));
