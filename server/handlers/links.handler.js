const { differenceInSeconds } = require("date-fns");
const promisify = require("node:util").promisify;
const bcrypt = require("bcryptjs");
const { isbot } = require("isbot");
const URL = require("node:url");
const dns = require("node:dns");

const validators = require("./validators.handler");
const map = require("../utils/map.json");
const transporter = require("../mail");
const query = require("../queries");
const queue = require("../queues");
const utils = require("../utils");
const env = require("../env");

const CustomError = utils.CustomError;
const dnsLookup = promisify(dns.lookup);

async function get(req, res) {
  const { limit, skip } = req.context;
  const search = req.query.search;
  const userId = req.user.id;

  const match = {
    user_id: userId,
    ...(req.apiTokenDomain !== undefined && { domain_id: req.apiTokenDomain })
  };

  const [data, total] = await Promise.all([
    query.link.get(match, { limit, search, skip }),
    query.link.total(match, { search })
  ]);

  if (req.isHTML) {
    res.render("partials/links/table", {
      total,
      limit,
      skip,
      links: data.map(utils.sanitize.link_html),
    })
    return;
  }

  return res.send({
    total,
    limit,
    skip,
    data: data.map(utils.sanitize.link),
  });
};

async function getAdmin(req, res) {
  const { limit, skip } = req.context;
  const search = req.query.search;
  const user = req.query.user;
  let domain = req.query.domain;
  const banned = utils.parseBooleanQuery(req.query.banned);
  const anonymous = utils.parseBooleanQuery(req.query.anonymous);
  const has_domain = utils.parseBooleanQuery(req.query.has_domain);
  
  const match = {
    ...(banned !== undefined && { banned }),
    ...(anonymous !== undefined && { user_id: [anonymous ? "is" : "is not", null] }),
    ...(has_domain !== undefined && { domain_id: [has_domain ? "is not" : "is", null] }),
  };
  
  // if domain is equal to the defualt domain,
  // it means admins is looking for links with the defualt domain (no custom user domain)
  if (domain === env.DEFAULT_DOMAIN) {
    domain = undefined;
    match.domain_id = null;
  }
  
  const [data, total] = await Promise.all([
    query.link.getAdmin(match, { limit, search, user, domain, skip }),
    query.link.totalAdmin(match, { search, user, domain })
  ]);

  const links = data.map(utils.sanitize.link_admin);

  if (req.isHTML) {
    res.render("partials/admin/links/table", {
      total,
      total_formatted: total.toLocaleString("en-US"),
      limit,
      skip,
      links,
    })
    return;
  }

  return res.send({
    total,
    limit,
    skip,
    data: links,
  });
};

async function create(req, res) {
  const { reuse, password, customurl, description, target, fetched_domain, expire_in } = req.body;
  const domain_id = fetched_domain ? fetched_domain.id : null;
  if (req.apiTokenDomain !== undefined && domain_id !== req.apiTokenDomain) {
    throw new CustomError("API token does not permit this domain.", 403);
  }
  
  const targetDomain = utils.removeWww(URL.parse(target).hostname);
  
  const [generatedAddress] = await Promise.all([
    !customurl && utils.generateId(query, domain_id),
    validators.bannedDomain(targetDomain),
    validators.bannedHost(targetDomain)
  ]);
  const result = await require("../link-creation").run(req, async db => {
    if (reuse === true || reuse === "true") {
      const existing = await db("links").where({ target, user_id: req.user.id, domain_id }).first();
      if (existing) return { status: 200, data: utils.sanitize.link({ ...existing, domain: fetched_domain?.address }) };
    }
    if (customurl && await db("links").where({ address: customurl, domain_id }).first()) {
      const error = "Custom URL is already in use.";
      res.locals.errors = { customurl: error };
      throw new CustomError(error, 400);
    }
    const link = await query.link.create({
      password, address: customurl || generatedAddress, domain_id, description,
      target, expire_in, user_id: req.user && req.user.id
    }, db);
    return { status: 201, data: utils.sanitize.link({ ...link, domain: fetched_domain?.address }) };
  });
  if (req.get("Idempotency-Key") !== undefined) {
    res.set("Idempotency-Replayed", result.replayed ? "true" : "false");
    res.set("Cache-Control", "no-store");
  }
  
  if (req.isHTML) {
    res.setHeader("HX-Trigger", "reloadMainTable");
    const shortURL = utils.getShortURL(result.data.address, result.data.domain);
    return res.render("partials/shortener", {
      link: shortURL.link, 
      url: shortURL.url,
    });
  }
  
  return res
    .status(result.status)
    .send(result.data);
}

async function edit(req, res) {
  const link = await query.link.find({
    uuid: req.params.id,
    ...(!req.user.admin && { user_id: req.user.id })
  });

  if (!link) {
    throw new CustomError("Link was not found.");
  }

  let isChanged = false;
  [
    [req.body.address, "address"], 
    [req.body.target, "target"], 
    [req.body.description, "description"], 
    [req.body.expire_in, "expire_in"], 
    [req.body.password, "password"]
  ].forEach(([value, name]) => {
    if (!value) {
      if (name === "password" && link.password) 
        req.body.password = null;
      else {
        delete req.body[name];
        return;
      }
    }
    if (value === link[name] && name !== "password") {
      delete req.body[name];
      return;
    }
    if (name === "expire_in" && link.expire_in)
      if (Math.abs(differenceInSeconds(utils.parseDatetime(value), utils.parseDatetime(link.expire_in))) < 60)
          return;
    if (name === "password")
      if (value && value.replace(/•/ig, "").length === 0) {
        delete req.body.password;
        return;
      }
    isChanged = true;
  });

  if (!isChanged) {
    throw new CustomError("Should at least update one field.");
  }

  const { address, target, description, expire_in, password } = req.body;
  
  const targetDomain = target && utils.removeWww(URL.parse(target).hostname);
  const domain_id = link.domain_id || null;

  const tasks = await Promise.all([
    address &&
      query.link.find({
        address,
        domain_id
      }),
    target && validators.bannedDomain(targetDomain),
    target && validators.bannedHost(targetDomain)
  ]);

  // Check if custom link already exists
  if (tasks[0]) {
    const error = "Custom URL is already in use.";
    res.locals.errors = { address: error };
    throw new CustomError("Custom URL is already in use.");
  }

  // Update link
  const [updatedLink] = await query.link.update(
    {
      id: link.id
    },
    {
      ...(address && { address }),
      ...(description && { description }),
      ...(target && { target }),
      ...(expire_in && { expire_in }),
      ...((password || password === null) && { password })
    }
  );

  if (req.isHTML) {
    res.render("partials/links/edit", {
      swap_oob: true,
      success: "Link has been updated.",
      ...utils.sanitize.link_html({ ...updatedLink }),
    });
    return;
  }

  return res.status(200).send(utils.sanitize.link({ ...updatedLink }));
};

async function editAdmin(req, res) {
  const link = await query.link.find({
    uuid: req.params.id,
    ...(!req.user.admin && { user_id: req.user.id })
  });

  if (!link) {
    throw new CustomError("Link was not found.");
  }

  let isChanged = false;
  [
    [req.body.address, "address"], 
    [req.body.target, "target"], 
    [req.body.description, "description"], 
    [req.body.expire_in, "expire_in"], 
    [req.body.password, "password"]
  ].forEach(([value, name]) => {
    if (!value) {
      if (name === "password" && link.password) 
        req.body.password = null;
      else {
        delete req.body[name];
        return;
      }
    }
    if (value === link[name] && name !== "password") {
      delete req.body[name];
      return;
    }
    if (name === "expire_in" && link.expire_in)
      if (Math.abs(differenceInSeconds(utils.parseDatetime(value), utils.parseDatetime(link.expire_in))) < 60)
          return;
    if (name === "password")
      if (value && value.replace(/•/ig, "").length === 0) {
        delete req.body.password;
        return;
      }
    isChanged = true;
  });

  if (!isChanged) {
    throw new CustomError("Should at least update one field.");
  }

  const { address, target, description, expire_in, password } = req.body;
  
  const targetDomain = target && utils.removeWww(URL.parse(target).hostname);
  const domain_id = link.domain_id || null;

  const tasks = await Promise.all([
    address &&
      query.link.find({
        address,
        domain_id
      }),
    target && validators.bannedDomain(targetDomain),
    target && validators.bannedHost(targetDomain)
  ]);

  // Check if custom link already exists
  if (tasks[0]) {
    const error = "Custom URL is already in use.";
    res.locals.errors = { address: error };
    throw new CustomError("Custom URL is already in use.");
  }

  // Update link
  const [updatedLink] = await query.link.update(
    {
      id: link.id
    },
    {
      ...(address && { address }),
      ...(description && { description }),
      ...(target && { target }),
      ...(expire_in && { expire_in }),
      ...((password || password === null) && { password })
    }
  );

  if (req.isHTML) {
    res.render("partials/admin/links/edit", {
      swap_oob: true,
      success: "Link has been updated.",
      ...utils.sanitize.link_admin({ ...updatedLink }),
    });
    return;
  }

  return res.status(200).send(utils.sanitize.link({ ...updatedLink }));
};

async function remove(req, res) {
  const { error, isRemoved, link } = await query.link.remove({
    uuid: req.params.id,
    ...(!req.user.admin && { user_id: req.user.id })
  });

  if (!isRemoved) {
    const messsage = error || "Could not delete the link.";
    throw new CustomError(messsage);
  }

  if (req.isHTML) {
    res.setHeader("HX-Reswap", "outerHTML");
    res.setHeader("HX-Trigger", "reloadMainTable");
    res.render("partials/links/dialog/delete_success", {
      link: utils.getShortURL(link.address, link.domain).link,
    });
    return;
  }

  return res
    .status(200)
    .send({ message: "Link has been deleted successfully." });
};

async function report(req, res) {
  const { link } = req.body;

  await transporter.sendReportEmail(link);

  if (req.isHTML) {
    res.render("partials/report/form", {
      message: "Report was received. We'll take actions shortly."
    });
    return;
  }
  
  return res
    .status(200)
    .send({ message: "Thanks for the report, we'll take actions shortly." });
};

async function ban(req, res) {
  const { id } = req.params;

  const update = {
    banned_by_id: req.user.id,
    banned: true
  };

  // 1. check if link exists
  const link = await query.link.find({ uuid: id });

  if (!link) {
    throw new CustomError("No link has been found.", 400);
  }

  if (link.banned) {
    throw new CustomError("Link has been banned already.", 400);
  }

  const tasks = [];

  // 2. ban link
  tasks.push(query.link.update({ uuid: id }, update));

  const domain = utils.removeWww(URL.parse(link.target).hostname);

  // 3. ban target's domain
  if (req.body.domain) {
    tasks.push(query.domain.add({ ...update, address: domain }));
  }

  // 4. ban target's host
  if (req.body.host) {
    const dnsRes = await dnsLookup(domain).catch(() => {
      throw new CustomError("Couldn't fetch DNS info.");
    });
    const host = dnsRes?.address;
    tasks.push(query.host.add({ ...update, address: host }));
  }

  // 5. ban link owner
  if (req.body.user && link.user_id) {
    tasks.push(query.user.update({ id: link.user_id }, update));
  }

  // 6. ban all of owner's links
  if (req.body.userLinks && link.user_id) {
    tasks.push(query.link.update({ user_id: link.user_id }, update));
  }

  // 7. wait for all tasks to finish
  await Promise.all(tasks).catch((err) => {
    throw new CustomError("Couldn't ban entries.");
  });

  // 8. send response
  if (req.isHTML) {
    res.setHeader("HX-Reswap", "outerHTML");
    res.setHeader("HX-Trigger", "reloadMainTable");
    res.render("partials/links/dialog/ban_success", {
      link: utils.getShortURL(link.address, link.domain).link,
    });
    return;
  }

  return res.status(200).send({ message: "Banned link successfully." });
};

async function redirect(req, res, next) {
  const isPreservedUrl = utils.preservedURLs.some(
    item => item === req.path.replace("/", "")
  );

  if (isPreservedUrl) return next();

  // 1. If custom domain, get domain info
  const host = utils.removeWww(req.headers.host);
  const domain =
    host !== env.DEFAULT_DOMAIN
      ? await query.domain.find({ address: host })
      : null;

  // 2. Get link
  const address = req.params.id.replace("+", "");
  const link = await query.link.find({
    address,
    domain_id: domain ? domain.id : null
  });

  // 3. When no link, if has domain redirect to domain's homepage
  // otherwise redirect to 404
  if (!link) {
    return res.redirect(domain?.homepage || "/404");
  }

  // 4. If link is banned, redirect to banned page.
  if (link.banned) {
    return res.redirect("/banned");
  }

  // 5. If wants to see link info, then redirect
  const isRequestingInfo = /.*\+$/gi.test(req.params.id);
  if (isRequestingInfo && !link.password) {
    if (req.isHTML) {
      res.render("url_info", { 
        title: "Short link information",
        target: link.target,
        link: utils.getShortURL(link.address, link.domain).link
      });
      return;
    }
    return res.send({ target: link.target });
  }

  // 6. If link is protected, redirect to password page
  if (link.password) {
    if ("authorization" in req.headers) {
      const auth = req.headers.authorization;
      const firstSpace = auth.indexOf(" ");
      if (firstSpace !== -1) {
        const method = auth.slice(0, firstSpace);
        const payload = auth.slice(firstSpace + 1);
        if (method === "Basic") {
          const decoded = Buffer.from(payload, "base64").toString("utf8");
          const colon = decoded.indexOf(":");
          if (colon !== -1) {
            const password = decoded.slice(colon + 1);
            const matches = await bcrypt.compare(password, link.password);
            if (matches) return res.redirect(link.target);
          }
        }
      }
    }
    res.render("protected", {
      title: "Protected short link",
      id: link.uuid
    });
    return;
  }

  // 7. Create link visit
  const isBot = isbot(req.headers["user-agent"]);
  if (link.user_id && !isBot) {
    queue.visit.add({
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      country: req.get("cf-ipcountry"),
      referrer: req.get("Referrer"),
      link
    });
  }

  // 8. Redirect to target
  return res.redirect(link.target);
};

async function redirectProtected(req, res) {
  // 1. Get link
  const uuid = req.params.id;
  const link = await query.link.find({ uuid });

  // 2. Throw error if no link
  if (!link || !link.password) {
    throw new CustomError("Couldn't find the link.", 400);
  }

  // 3. Check if password matches
  const matches = await bcrypt.compare(req.body.password, link.password);

  if (!matches) {
    throw new CustomError("Password is not correct.", 401);
  }

  // 4. Create visit
  if (link.user_id) {
    queue.visit.add({
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      country: req.get("cf-ipcountry"),
      referrer: req.get("Referrer"),
      link
    });
  }

  // 5. Send target
  if (req.isHTML) {
    res.setHeader("HX-Redirect", link.target);
    res.render("partials/protected/form", {
      id: link.uuid,
      message: "Redirecting...",
    });
    return;
  }
  return res.status(200).send({ target: link.target });
};

async function redirectCustomDomainHomepage(req, res, next) {
  const host = utils.removeWww(req.headers.host);
  if (host === env.DEFAULT_DOMAIN) {
    next();
    return;
  }

  const path = req.path;
  const pathName = path.replace("/", "").split("/")[0];
  if (
    path === "/" ||
    utils.preservedURLs.includes(pathName)
  ) {
    const domain = await query.domain.find({ address: host });
    if (domain?.homepage) {
      res.redirect(302, domain.homepage);
      return;
    }
  }

  next();
};

async function stats(req, res) {
  const { user } = req;
  const uuid = req.params.id;

  const link = await query.link.find({
    ...(!user.admin && { user_id: user.id }),
    uuid
  });

  if (!link) {
    if (req.isHTML) {
      res.setHeader("HX-Redirect", "/404");
      res.status(200).send("");
      return;
    }
    throw new CustomError("Link could not be found.");
  }

  const stats = await query.visit.find({ link_id: link.id }, link.visit_count);

  if (!stats) {
    throw new CustomError("Could not get the short link stats. Try again later.");
  }

  if (req.isHTML) {
    res.render("partials/stats", {
      link: utils.sanitize.link_html(link),
      stats,
      map,
    });
    return;
  }

  return res.status(200).send({
    ...stats,
    ...utils.sanitize.link(link)
  });
};

module.exports = {
  ban,
  create,
  edit,
  editAdmin,
  get,
  getAdmin,
  remove,
  report,
  stats,
  redirect,
  redirectProtected,
  redirectCustomDomainHomepage,
}
