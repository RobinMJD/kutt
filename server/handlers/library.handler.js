const library = require("../library");
const { sameOrigin } = require("./link-history.handler");
const { CustomError } = require("../utils");

function metadataAccess(req) {
  if (req.apiTokenDomain !== undefined) throw new CustomError("Account labels and filters require an unrestricted domain scope.", 403);
}

async function list(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(await library.list(req.user.id, req.query, req.apiTokenDomain));
}

async function mutate(req, operation) {
  sameOrigin(req);
  if (typeof operation !== "string") throw new CustomError("Invalid action.", 400);
  const input = req.body;
  const id = req.params.id || input.id;
  if (id !== undefined && (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) throw new CustomError("Invalid identifier.", 400);
  if (operation.startsWith("remove_") && !id) throw new CustomError("An identifier is required.", 400);
  if (operation === "bulk") return library.bulk(req.user.id, input, { id: req.user.id, apiToken: req.apiToken }, req.apiTokenDomain);
  metadataAccess(req);
  switch (operation) {
    case "save_label": return library.saveLabel(req.user.id, input, id);
    case "remove_label": return library.removeLabel(req.user.id, id);
    case "save_filter": return library.saveFilter(req.user.id, { ...input, filters: input.filters || input }, id);
    case "remove_filter": return library.removeFilter(req.user.id, id);
    default: throw new CustomError("Invalid action.", 400);
  }
}

const api = operation => async (req, res) => {
  res.set("Cache-Control", "no-store");
  const result = await mutate(req, operation);
  if (result === undefined) return res.sendStatus(204);
  res.status(req.method === "POST" && operation !== "bulk" ? 201 : 200).json(result);
};

function viewURL(filters, page = 1) {
  return "/settings/library?" + new URLSearchParams({ ...filters, page }).toString();
}

async function page(req, res, error, notice) {
  res.set("Cache-Control", "no-store");
  // Native forms need their same-origin Origin; never accept the opaque null origin.
  res.set("Referrer-Policy", "same-origin");
  const result = await library.list(req.user.id, error ? {} : req.query);
  const tags = result.labels.filter(row => row.kind === "tag").map(row => ({ ...row, selected: row.id === result.filters.tag }));
  const collections = result.labels.filter(row => row.kind === "collection").map(row => ({ ...row, selected: row.id === result.filters.collection }));
  return res.render("library", {
    title: "Library", ...result, tags, collections, error, notice,
    states: ["active", "paused", "unpaused", "trash"].map(value => ({ value, selected: value === result.filters.state })),
    view_url: viewURL(result.filters, result.page),
    previous: result.page > 1 ? viewURL(result.filters, result.page - 1) : null,
    next: result.page * result.limit < result.total ? viewURL(result.filters, result.page + 1) : null,
    saved_filters: result.saved_filters.map(row => ({ ...row, url: "/settings/library?saved=" + row.id })),
    data: result.data.map(row => ({ ...row, selectable: !row.deleted_at && !row.banned }))
  });
}

async function submit(req, res) {
  try {
    await mutate(req, req.body.operation);
    let target = "/settings/library";
    if (typeof req.body.return_to === "string") {
      let url;
      try { url = new URL(req.body.return_to, "https://kutt.invalid"); } catch {}
      if (url?.origin === "https://kutt.invalid" && url.pathname === target) {
        if (req.body.operation === "remove_label") {
          for (const kind of ["tag", "collection"]) if (url.searchParams.get(kind) === req.body.id) url.searchParams.delete(kind);
        }
        target += url.search;
      }
    }
    return res.redirect(303, target);
  } catch (error) {
    if (!(error instanceof CustomError)) throw error;
    res.status(error.statusCode || 400);
    return page(req, res, error.message);
  }
}

module.exports = { list, api, page, submit };
