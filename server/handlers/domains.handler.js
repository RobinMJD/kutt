const { Handler } = require("express");

const { CustomError, sanitize } = require("../utils");
const query = require("../queries");
const redis = require("../redis");
const utils = require("../utils");
const env = require("../env");

async function add(req, res) {
  const address = req.body.address.toLowerCase(), homepage = req.body.homepage;
  const verification = require("../domain-verification");
  if (!await verification.verify(address, req.user, req.body.proof)) {
    const proof = verification.pending(address, req.user, req.body.proof) || verification.challenge(address, req.user);
    const message = "Publish this DNS TXT record, then verify ownership. Existing domains are unchanged.";
    if (req.isHTML) return res.render("partials/settings/domain/add_form", { domain_verification: proof, verification_notice: message });
    return res.status(409).json({ error: message, verification: proof });
  }

  const domain = await query.domain.claim({
    address,
    homepage,
    user: req.user
  });

  if (req.isHTML) {
    const domains = (await query.domain.get({ user_id: req.user.id })).map(sanitize.domain);
    res.setHeader("HX-Reswap", "none");
    res.render("partials/settings/domain/table", {
      domains
    });
    return;
  }
  
  return res.status(200).send(sanitize.domain(domain));
};

async function addAdmin(req, res) {
  const { address, banned, homepage } = req.body;

  const domain = await require("../moderation").addDomain({ address, homepage, banned }, req.user);

  if (req.isHTML) {
    res.setHeader("HX-Trigger", "reloadMainTable");
    res.render("partials/admin/dialog/add_domain_success", {
      address: domain.address,
    });
    return;
  }
  
  return res.status(200).send({ message: "The domain has been added successfully." });
};

async function remove(req, res) {
  const domain = await query.domain.find({
    uuid: req.params.id,
    user_id: req.user.id
  });

  if (!domain) {
    throw new CustomError("Could not delete the domain.", 400);
  }
  
  const updatedDomain = await query.domain.release(domain.id, req.user.id);

  if (!updatedDomain) {
    throw new CustomError("Could not delete the domain.", 500);
  }

  if (env.REDIS_ENABLED) {
    redis.remove.domain(updatedDomain);
  }

  if (req.isHTML) {
    const domains = (await query.domain.get({ user_id: req.user.id })).map(sanitize.domain);
    res.setHeader("HX-Reswap", "outerHTML");
    res.render("partials/settings/domain/delete_success", {
      domains,
      address: domain.address,
    });
    return;
  }

  return res.status(200).send({ message: "Domain deleted successfully" });
};

async function removeAdmin(req, res) {
  const id = req.params.id;
  const links = req.query.links;

  const domain = await query.domain.find({ id });

  if (!domain) {
    throw new CustomError("Could not find the domain.", 400);
  }

  await query.domain.remove(domain, { trashLinks: links === true, actor: { id: req.user.id } });

  if (req.isHTML) {
    res.setHeader("HX-Reswap", "outerHTML");
    res.setHeader("HX-Trigger", "reloadMainTable");
    res.render("partials/admin/dialog/delete_domain_success", {
      address: domain.address,
    });
    return;
  }

  return res.status(200).send({ message: "Domain deleted successfully" });
}

async function getAdmin(req, res) {
  const { limit, skip } = req.context;
  const search = req.query.search;
  const user = req.query.user;
  const banned = utils.parseBooleanQuery(req.query.banned);
  const owner = utils.parseBooleanQuery(req.query.owner);
  const links = utils.parseBooleanQuery(req.query.links);

  const match = {
    ...(banned !== undefined && { banned }),
    ...(owner !== undefined && { user_id: [owner ? "is not" : "is", null] }),
  };

  const [data, total] = await Promise.all([
    query.domain.getAdmin(match, { limit, search, user, links, skip, ...require("../list-sort").parse(req.query, "domains") }),
    query.domain.totalAdmin(match, { search, user, links })
  ]);

  const domains = data.map(utils.sanitize.domain_admin);

  if (req.isHTML) {
    res.render("partials/admin/domains/table", {
      total,
      total_formatted: total.toLocaleString("en-US"),
      limit,
      skip,
      table_domains: domains,
    })
    return;
  }

  return res.send({
    total,
    limit,
    skip,
    data: domains,
  });
}

async function ban(req, res) {
  const moderation = require("../moderation");
  const domain = await moderation.moderate("domain", req.params.id, true, req.user, moderation.options(req));

  // Send the response only after the complete transaction commits.
  if (req.isHTML) {
    res.setHeader("HX-Reswap", "outerHTML");
    res.setHeader("HX-Trigger", "reloadMainTable");
    res.render("partials/admin/dialog/ban_domain_success", {
      address: domain.address,
    });
    return;
  }

  return res.status(200).send({ message: "Banned domain successfully." });
}

module.exports = {
  add,
  addAdmin,
  ban,
  getAdmin,
  remove,
  removeAdmin,
}
