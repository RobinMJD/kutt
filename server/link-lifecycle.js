const knex = require("./knex");

function parse(body, current = {}, html = false) {
  const { CustomError } = require("./utils");
  const fail = message => { throw new CustomError(message, 400); };
  const result = {};
  if (body.paused !== undefined || html) {
    if (html) result.paused = body.paused === "on" || body.paused === "true";
    else if (typeof body.paused === "boolean") result.paused = body.paused;
    else fail("paused must be a boolean.");
  }
  for (const field of ["starts_at", "ends_at"]) {
    if (body[field] === undefined) continue;
    if (body[field] === null || (html && body[field] === "")) { result[field] = null; continue; }
    let value = body[field];
    if (html && typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?$/.test(value)) value += "Z";
    if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d{1,3})?)?(Z|[+-]\d\d:\d\d)$/.test(value)) {
      fail(`${field} must be an ISO 8601 timestamp with a timezone, or null.`);
    }
    const time = Date.parse(value);
    const day = value.slice(0, 10);
    if (!Number.isFinite(time) || time < 0 || new Date(day + "T00:00:00Z").toISOString().slice(0, 10) !== day) {
      fail(`${field} is not a valid date.`);
    }
    result[field] = time;
  }
  if (body.max_visits !== undefined) {
    let value = body.max_visits;
    if (value === null || (html && value === "")) result.max_visits = null;
    else {
      if (html && typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
      if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) fail("max_visits must be an integer from 1 to 2147483647, or null.");
      result.max_visits = value;
    }
  }
  if (body.expire_in === null || (html && body.clear_expiry === "on")) result.expire_in = null;
  const combined = { ...current, ...result };
  if (combined.starts_at != null && combined.ends_at != null && Number(combined.ends_at) <= Number(combined.starts_at)) {
    fail("End must be after start.");
  }
  return result;
}

function describe(link, now = Date.now()) {
  const iso = value => value == null ? null : new Date(Number(value)).toISOString();
  const expires = link.expire_in ? require("./utils").parseDatetime(link.expire_in).getTime() : null;
  let state = "Active";
  if (link.banned) state = "Banned";
  else if (link.paused) state = "Paused";
  else if ((expires != null && expires <= now) || (link.ends_at != null && Number(link.ends_at) <= now)) state = "Expired";
  else if (link.starts_at != null && Number(link.starts_at) > now) state = "Scheduled";
  else if (link.max_visits != null && Number(link.redirect_count) >= Number(link.max_visits)) state = "Visit limit reached";
  return {
    paused: !!link.paused, starts_at: iso(link.starts_at), ends_at: iso(link.ends_at),
    max_visits: link.max_visits == null ? null : Number(link.max_visits),
    redirect_count: Number(link.redirect_count || 0), lifecycle_status: state,
    starts_at_input: iso(link.starts_at)?.slice(0, 19), ends_at_input: iso(link.ends_at)?.slice(0, 19)
  };
}

async function allow(link, consume = false) {
  const now = Date.now();
  const query = knex("links").where({ id: link.id, uuid: link.uuid, banned: false, paused: false,
    target: link.target, password: link.password || null })
    .where(builder => builder.whereNull("starts_at").orWhere("starts_at", "<=", now))
    .where(builder => builder.whereNull("ends_at").orWhere("ends_at", ">", now))
    .where(builder => builder.whereNull("expire_in").orWhere("expire_in", ">", require("./utils").dateToUTC(new Date(now))))
    .where(builder => builder.whereNull("max_visits").orWhereColumn("redirect_count", "<", "max_visits"));
  // The predicate and counter update are one database statement: simultaneous
  // redirects cannot overshoot the limit, and cached link data cannot bypass it.
  return consume ? (await query.increment("redirect_count", 1)) > 0 : !!(await query.first("id"));
}

module.exports = { parse, describe, allow };
