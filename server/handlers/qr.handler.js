const QRCode = require("qrcode");
const query = require("../queries");
const knex = require("../knex");
const { CustomError, getShortURL } = require("../utils");
const { describe } = require("../link-lifecycle");

function options(input) {
  const size = input.size === undefined ? "512" : input.size;
  const level = input.level === undefined ? "M" : input.level;
  const format = input.format === undefined ? "png" : input.format;
  if (typeof size !== "string" || !/^\d{3,4}$/.test(size) || Number(size) < 128 || Number(size) > 1024 ||
      typeof level !== "string" || !["L", "M", "Q", "H"].includes(level) ||
      typeof format !== "string" || !["png", "svg"].includes(format)) {
    throw new CustomError("Choose PNG/SVG, a size from 128 to 1024, and correction L/M/Q/H.", 400);
  }
  return { size: Number(size), level, format };
}

async function load(req, res, input = req.query) {
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) throw new CustomError("Link was not found.", 404);
  const link = await query.link.find({ uuid: req.params.id, user_id: req.user.id }, { fresh: true, includeTrash: true });
  if (!link || link.banned || (req.apiTokenDomain !== undefined && (link.domain_id !== req.apiTokenDomain || link.archived_domain))) {
    throw new CustomError("Link was not found.", 404);
  }
  if (link.deleted_at || link.archived_domain) throw new CustomError("Restore the link and its domain before exporting a QR code.", 410);
  if (link.domain_id && !await knex("domains").where({ id: link.domain_id, user_id: req.user.id, banned: false }).first()) {
    throw new CustomError("The short domain is unavailable.", 410);
  }
  const url = getShortURL(link.address, link.domain).url;
  let parsed;
  try { parsed = new URL(url); } catch {}
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || url.length > 1000) {
    throw new CustomError("This short URL cannot be encoded safely.", 400);
  }
  const settings = options(input);
  let modules;
  try { modules = QRCode.create(url, { errorCorrectionLevel: settings.level }).modules; }
  catch { throw new CustomError("This short URL is too large for the chosen QR correction level.", 400); }
  if (modules.size + 8 > settings.size) {
    throw new CustomError("Choose a larger QR image size.", 400);
  }
  return { link, url, modules, ...settings };
}

async function download(req, res) {
  let input = req.query, logo;
  if (req.method === "POST") {
    require("./link-history.handler").sameOrigin(req);
    if (!req.is("application/json") || !req.body || Array.isArray(req.body)) throw new CustomError("Send QR settings as a JSON object.", 400);
    if (Object.keys(req.body).some(key => !["size", "level", "format", "logo"].includes(key))) throw new CustomError("Unknown QR setting.", 400);
    input = { ...req.body };
    if (typeof input.size === "number" && Number.isInteger(input.size)) input.size = String(input.size);
    if (input.logo !== undefined) { options(input); input.level = "H"; }
  }
  const { link, url, modules, size, level, format } = await load(req, res, input);
  if (req.method === "POST" && input.logo !== undefined) logo = require("../qr-logo").decode(input.logo);
  // Never fetch the destination or encode target/password/session data.
  const renderer = require("../qr-image");
  const bytes = format === "svg" ? await renderer.renderSVG(url, modules, size, level, logo) : renderer.renderPNG(modules, size, logo);
  res.set("Content-Disposition", `attachment; filename="kutt-qr-${link.uuid}.${format}"`);
  if (format === "svg") res.set("Content-Security-Policy", logo ? "default-src 'none'; img-src data:; sandbox" : "default-src 'none'; sandbox");
  res.type(format === "svg" ? "image/svg+xml" : "image/png").send(bytes);
}

async function page(req, res) {
  const { link, url, size, level } = await load(req, res);
  res.render("qr", { title: "QR code", id: link.uuid, short_url: url,
    lifecycle_status: describe(link).lifecycle_status, protected: !!link.password,
    image_url: `/api/links/${link.uuid}/qr?size=${size}&level=${level}`,
    svg_url: `/api/links/${link.uuid}/qr?size=${size}&level=${level}&format=svg`,
    size, levels: ["L", "M", "Q", "H"].map(value => ({ value, selected: value === level })) });
}

module.exports = { download, page };
