const i18n = require("./i18n");
const knex = require("./knex");
const { CustomError } = require("./utils");
const privacy = require("./analytics-privacy");
const domains = require("./domain-access");

async function reset(req) {
  const body = req.body;
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !["confirm", "revision"].includes(key)) ||
      body.confirm !== true || !Number.isSafeInteger(body.revision) || body.revision < 0) {
    throw new CustomError(i18n.t("stats_reset.invalid"), 400);
  }
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) throw new CustomError(i18n.t("messages.link_was_not_found"), 404);
  return knex.transaction(async db => {
    await domains.lock(db);
    // The same link lock serializes visit workers, resets and ownership changes.
    await db("links").where({ uuid: req.params.id, user_id: req.user.id }).update({ visit_count: db.ref("visit_count") });
    const link = await db("links").where({ uuid: req.params.id, user_id: req.user.id }).first();
    if (!link || link.banned || req.apiTokenDomain !== undefined &&
        (link.domain_id !== req.apiTokenDomain || link.archived_domain)) {
      throw new CustomError(i18n.t("messages.link_was_not_found"), 404);
    }
    if (link.deleted_at || link.archived_domain) throw new CustomError(i18n.t("messages.restore_this_link_and_domain_before_managing_its_settings"), 410);
    await domains.request(db, req, link.domain_id, "stats:reset");
    const tracking = await privacy.tracking(link.id, db);
    if (tracking.revision !== body.revision || tracking.revision === Number.MAX_SAFE_INTEGER) {
      throw new CustomError(i18n.t("stats_reset.conflict"), 409);
    }
    const revision = tracking.revision + 1;
    // Fence delayed pre-reset jobs without changing whether tracking is enabled.
    const next = { enabled: tracking.enabled, revision };
    await db("link_tracking").insert({ link_id: link.id, ...next }).onConflict("link_id").merge(next);
    await db("visits").where({ link_id: link.id }).delete();
    await db("links").where({ id: link.id }).update({ visit_count: 0 });
    await require("./link-history").record(db, link, "statistics_reset", ["visit_count", "visits"], { id: req.user.id, apiToken: req.apiToken });
    return { id: link.uuid, visit_count: 0, reset_revision: revision };
  });
}

async function handler(req, res) {
  res.set({ "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin" });
  require("./management-origin").sameOrigin(req);
  res.json(await reset(req));
}
module.exports = { reset, handler };
