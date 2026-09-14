const useragent = require("express-useragent").default;
const geoip = require("geoip-lite");
const URL = require("node:url");

const { removeWww, getUseragentBrowser, getUseragentOS } = require("../utils");
const query = require("../queries");
const classification = require("../visit-classification");
const knex = require("../knex");

module.exports = async function({ data }) {
  // the following line is for backward compatibility
  // used to send the whole header to get the user agent
  const userAgent = classification.userAgent(data.userAgent || data.headers?.["user-agent"]);
  if (!classification.human(userAgent)) return;
  const link = await knex("links").where({ id: data.link.id, user_id: data.link.user_id }).first();
  if (!link || link.deleted_at || link.banned || !link.user_id) return;
  const owner = await knex("users").where({ id: link.user_id, banned: false, verified: true }).first();
  if (!owner) return;
  const agent = useragent.parse(userAgent);
  const browser = getUseragentBrowser(agent);
  const os = getUseragentOS(agent);
  let referrer;
  try { referrer = typeof data.referrer === "string" && removeWww(new URL.URL(data.referrer).hostname); } catch {}
  const country = geoip.lookup(data.ip || "")?.country || "Unknown";

  return query.visit.add({
      browser,
      country,
      os,
      link_id: link.id,
      user_id: link.user_id,
      referrer: (referrer && referrer.replace(/\./gi, "[dot]")) || "Direct"
    });
}
