const grants = require("../domain-access");
const knex = require("../knex");
const i18n = require("../i18n");
const { CustomError } = require("../utils");

function boundary(req, res, next) {
  res.set("Cache-Control", "private, no-store").set("Referrer-Policy", "same-origin");
  next();
}
async function available(req, res) {
  let query = grants.available(knex, req.user.id).orderBy("d.address");
  if (req.apiTokenDomain !== undefined) query = query.where("d.id", req.apiTokenDomain ?? -1);
  res.json({ data: (await query).map(row => ({ id: row.uuid, address: row.address, owned: row.user_id === req.user.id })) });
}
async function list(req, res) { res.json(await grants.list(req, req.params.id)); }
async function grant(req, res) {
  res.status(201).json(await grants.grant(req, req.params.id, require("../moderation").options(req)));
}
async function revoke(req, res) { await grants.revoke(req, req.params.id, req.params.grantId); res.sendStatus(204); }
async function page(req, res, error, email = "") {
  const selected = req.params.id ? await grants.list(req, req.params.id) : null;
  const owned = await knex("domains").where({ user_id: req.user.id }).orderBy("address");
  const shared = (await grants.available(knex, req.user.id).orderBy("d.address")).filter(row => row.user_id !== req.user.id);
  res.render("domain_grants", { title: i18n.t("domain_grants.title"), selected, owned, shared, error, email,
    custom_styles: [...(res.locals.custom_styles || []), "domain-grants.css"] });
}
async function submit(req, res) {
  try {
    if (req.body.operation === "grant") await grants.grant(req, req.params.id, { email: req.body.email });
    else if (req.body.operation === "revoke") await grants.revoke(req, req.params.id, req.body.grant_id);
    else throw new CustomError(i18n.t("domain_grants.invalid_action"), 400);
    res.redirect(303, "/settings/domain-sharing/" + req.params.id);
  } catch (error) {
    if (!(error instanceof CustomError)) throw error;
    res.status(error.statusCode || 400);
    return page(req, res, error.message, typeof req.body.email === "string" ? req.body.email.slice(0, 255) : "");
  }
}
function pageError(error, req, res, next) {
  if (!req.isHTML) return next(error);
  res.status(error.statusCode || 500).render("error", { message: error instanceof CustomError ? error.message : i18n.t("messages.an_error_occurred") });
}
module.exports = { boundary, available, list, grant, revoke, page, submit, pageError };
