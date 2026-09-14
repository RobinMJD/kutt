const knex = require("./knex");
const { CustomError, dateToUTC, parseDatetime } = require("./utils");
const { stringify } = require("csv-stringify/sync");

const fail = (message, status = 400) => { throw new CustomError(message, status); };
const DAY = 86400000;
const UUID = /^[a-f0-9-]{36}$/i;
const dimensions = {
  browser: ["chrome", "edge", "firefox", "ie", "opera", "other", "safari"],
  os: ["android", "ios", "linux", "macos", "other", "windows"]
};

function filters(input = {}) {
  const allowed = ["start", "end", "link", "domain", "tag", "q", "format"];
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.entries(input).some(([key, value]) => !allowed.includes(key) || typeof value !== "string")) fail("Invalid analytics filters.");
  const date = value => {
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) || value > "9999-12-30" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail("Use valid YYYY-MM-DD dates between 1000-01-01 and 9999-12-30.");
    return value;
  };
  const end = date(input.end || new Date().toISOString().slice(0, 10));
  const start = date(input.start || new Date(Date.parse(end) - 29 * DAY).toISOString().slice(0, 10));
  if (Date.parse(end) < Date.parse(start) || Date.parse(end) - Date.parse(start) >= 366 * DAY) fail("Select an inclusive range of 1 to 366 days.");
  const result = { start, end, link: input.link || "", domain: input.domain || "", tag: input.tag || "", q: (input.q || "").trim() };
  if ((result.link && !UUID.test(result.link)) || (result.tag && !UUID.test(result.tag)) ||
      (result.domain && result.domain !== "default" && !UUID.test(result.domain))) fail("Invalid link, tag or domain identifier.");
  if (result.q.length > 200 || /[\u0000-\u001f\u007f]/.test(result.q)) fail("Search must be at most 200 printable characters.");
  if (input.format && !["json", "csv"].includes(input.format)) fail("Choose JSON or CSV.");
  return result;
}

async function access(req, db = knex) {
  const user = await db("users").where({ id: req.user.id, verified: true, banned: false }).first();
  if (!user || Number(user.auth_version || 0) !== Number(req.user.auth_version || 0)) fail("Sign in again.", 401);
  if (req.apiToken) {
    const token = await db("api_tokens").where({ id: req.apiToken, user_id: user.id }).first();
    if (!token || token.revoked_at != null || (token.expires_at != null && Number(token.expires_at) <= Date.now()) ||
        !JSON.parse(token.scopes).includes("stats:read")) fail("API token is no longer authorized.", 403);
    if (req.apiTokenDomain != null && !await db("domains").where({ id: req.apiTokenDomain, user_id: user.id, banned: false }).first()) fail("Token domain is no longer available.", 403);
  }
}

function owned(req, db = knex) {
  const query = db("links").where("links.user_id", req.user.id);
  if (req.apiTokenDomain !== undefined) query.where("links.domain_id", req.apiTokenDomain).whereNull("links.archived_domain");
  return query;
}

async function selection(req, input) {
  const query = owned(req);
  if (input.link) {
    if (!await query.clone().where("links.uuid", input.link).first()) fail("Link was not found.", 404);
    query.where("links.uuid", input.link);
  }
  if (input.domain) {
    const domain = input.domain === "default" ? null : await knex("domains").where({ uuid: input.domain, user_id: req.user.id, banned: false }).first();
    if (input.domain !== "default" && !domain) fail("Domain was not found.", 404);
    const id = domain?.id || null;
    if (req.apiTokenDomain !== undefined && req.apiTokenDomain !== id) fail("Domain was not found.", 404);
    query.where("links.domain_id", id).whereNull("links.archived_domain");
  }
  if (input.tag) {
    if (!await knex("library_labels").where({ id: input.tag, user_id: req.user.id, kind: "tag" }).first()) fail("Tag was not found.", 404);
    const tagged = knex("library_link_labels").select("link_id").where("label_id", input.tag);
    if (req.apiTokenDomain !== undefined && !await owned(req).whereIn("links.id", tagged.clone()).first()) fail("Tag was not found.", 404);
    query.whereIn("links.id", tagged);
  }
  if (input.q) {
    const pattern = "%" + input.q.toLowerCase().replace(/[!%_]/g, "!$&") + "%";
    query.where(function () {
      this.whereRaw("LOWER(links.address) LIKE ? ESCAPE '!'", [pattern])
        .orWhereRaw("LOWER(links.description) LIKE ? ESCAPE '!'", [pattern]);
    });
  }
  return query.select("links.id", "links.address", "links.uuid").limit(10001);
}

function increment(map, name, count) {
  if (!Number.isSafeInteger(Number(count)) || Number(count) < 0) fail("Stored analytics contain invalid counts.", 503);
  const total = (map.get(name) || 0) + Number(count);
  if (!Number.isSafeInteger(total)) fail("Analytics count exceeds the supported range.", 422);
  map.set(name, total);
  if (map.size > 10000) fail("Report is too large. Narrow the date or link filters.", 422);
}

function objectCounts(value) {
  try {
    if (typeof value === "string") {
      if (Buffer.byteLength(value) > 1000000) throw new Error();
      value = JSON.parse(value);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return Object.entries(value);
  } catch { fail("Stored analytics dimensions are unavailable.", 503); }
}

async function report(req) {
  await access(req);
  const input = filters(req.query), links = await selection(req, input);
  if (links.length > 10000) fail("Report is too large. Narrow the date or link filters.", 422);
  const byDay = new Map(), perLink = new Map();
  for (let t = Date.parse(input.start); t <= Date.parse(input.end); t += DAY) byDay.set(new Date(t).toISOString().slice(0, 10), 0);
  const stats = { browser: new Map(), os: new Map(), country: new Map(), referrer: new Map() };
  let buckets = 0;
  if (links.length) {
    // Bound reads and aggregate without retaining individual hourly rows. Both
    // visit ownership and current link ownership are required, even for admins.
    const visits = knex("visits").where("user_id", req.user.id).whereIn("link_id", links.map(row => row.id))
      .where("created_at", ">=", dateToUTC(new Date(input.start)))
      .where("created_at", "<", dateToUTC(new Date(Date.parse(input.end) + DAY)))
      .orderBy("id").limit(100001).stream();
    for await (const visit of visits) {
      if (++buckets > 100000) fail("Report is too large. Narrow the date or link filters.", 422);
      const day = parseDatetime(visit.created_at).toISOString().slice(0, 10);
      if (!byDay.has(day)) fail("Stored analytics timestamp is inconsistent.", 503);
      increment(byDay, day, visit.total); increment(perLink, visit.link_id, visit.total);
      for (const [kind, names] of Object.entries(dimensions)) for (const name of names) increment(stats[kind], name, visit[(kind === "browser" ? "br_" : "os_") + name]);
      for (const [kind, column] of [["country", "countries"], ["referrer", "referrers"]]) {
        for (const [name, count] of objectCounts(visit[column])) increment(stats[kind], kind === "referrer" ? name.replace(/\[dot\]/g, ".") : name.toUpperCase(), count);
      }
    }
  }
  const tags = new Map();
  const assigned = links.length ? await knex("library_link_labels as rel").join("library_labels as label", "label.id", "rel.label_id")
    .where("label.user_id", req.user.id).where("label.kind", "tag").whereIn("rel.link_id", links.map(row => row.id))
    .select("label.id", "label.name", "rel.link_id").limit(20001) : [];
  if (assigned.length > 20000) fail("Report has too many tag assignments. Narrow the link filters.", 422);
  for (const row of assigned) {
    if (!tags.has(row.id)) tags.set(row.id, { id: row.id, name: row.name, visits: 0, links: 0 });
    const tag = tags.get(row.id); tag.visits += perLink.get(row.link_id) || 0; tag.links++;
  }
  const labelsQuery = knex("library_labels").where({ user_id: req.user.id, kind: "tag" });
  if (req.apiTokenDomain !== undefined) labelsQuery.whereIn("id", knex("library_link_labels").select("label_id").whereIn("link_id", owned(req).select("links.id")));
  const labels = await labelsQuery.select("id", "name").orderBy("name_key");
  const domainsQuery = knex("domains").where({ user_id: req.user.id, banned: false });
  if (req.apiTokenDomain !== undefined) domainsQuery.where("id", req.apiTokenDomain);
  const domains = await domainsQuery.select("uuid as id", "address as name").orderBy("address");
  if (req.apiTokenDomain === undefined || req.apiTokenDomain === null) domains.unshift({ id: "default", name: require("./env").DEFAULT_DOMAIN });
  await access(req);
  const sort = map => [...map].filter(([, count]) => count).map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
  const total = [...byDay.values()].reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) fail("Analytics count exceeds the supported range.", 422);
  return { filters: input, timezone: "UTC", total, matched_links: links.length, visited_links: perLink.size,
    selected_link: input.link ? links[0]?.address || null : null,
    by_day: [...byDay].map(([date, visits]) => ({ date, visits })),
    stats: Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, sort(value)])),
    tags: [...tags.values()].sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name)),
    available_filters: { tags: labels, domains }, generated_at: new Date().toISOString(),
    bot_filter: "Known bots excluded at ingestion; historical aggregates cannot be reclassified.",
    tag_basis: "Current assignments; totals overlap when a link has multiple tags." };
}

function csv(data) {
  const rows = [["section", "name", "id", "visits", "links"]];
  rows.push(["total", data.filters.start + "/" + data.filters.end + " UTC", "", data.total, data.matched_links]);
  for (const row of data.by_day) rows.push(["day", row.date, "", row.visits, ""]);
  for (const [kind, values] of Object.entries(data.stats)) for (const row of values) rows.push([kind, row.name, "", row.visits, ""]);
  for (const row of data.tags) rows.push(["tag", row.name, row.id, row.visits, row.links]);
  return stringify(rows.map(row => row.map(value => typeof value === "string" && /^[\s]*[=+@\-\t\r\n']/.test(value) ? "'" + value : value)), { record_delimiter: "\r\n" });
}

module.exports = { filters, access, report, csv };
