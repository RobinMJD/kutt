const spaces = require("../workspaces");
const lifecycle = require("../link-lifecycle");
const { sameOrigin } = require("./link-history.handler");
const { sessionOnly } = require("./tokens.handler");
const { CustomError } = require("../utils");

function boundary(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  res.set("Referrer-Policy", "same-origin");
  if (req.apiTokenDomain !== undefined) throw new CustomError("Workspace access requires an unrestricted domain scope.", 403);
  if (!["GET", "HEAD"].includes(req.method)) sameOrigin(req);
  next();
}

const linkFields = ["target", "address", "description", "password", "domain", "paused", "starts_at", "ends_at", "max_visits"];
function formLink(body) {
  const input = Object.fromEntries(linkFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (input.address === "") delete input.address;
  if (input.domain === "") delete input.domain;
  // Empty password on an edit preserves protection unless explicitly cleared.
  if (input.password === "") delete input.password;
  if (body.clear_password === "on") input.password = null;
  if (body.policy === "on") {
    const parsed = lifecycle.parse(body, {}, true);
    for (const key of ["starts_at", "ends_at"]) if (parsed[key] != null) parsed[key] = new Date(parsed[key]).toISOString();
    Object.assign(input, parsed);
  }
  return input;
}

async function mutate(req, operation, res) {
  const id = req.params.id || req.body.workspace_id, memberId = req.params.memberId || req.body.member_id;
  const body = req.body;
  const actor = { id: req.user.id, apiToken: req.apiToken };
  if (!["create_link", "edit_link", "trash_link", "restore_link"].includes(operation)) sessionOnly(req, res, () => {});
  switch (operation) {
    case "create": return spaces.create(req.user.id, body);
    case "rename": return spaces.edit(req.user.id, id, body);
    case "close": return spaces.close(req.user.id, id, body);
    case "invite": return spaces.invite(req.user.id, id, body);
    case "accept": case "decline": return spaces.respond(req.user.id, req.params.invitationId || body.invitation_id, operation === "accept");
    case "role": return spaces.membership(req.user.id, id, memberId, body.role);
    case "remove_member": return spaces.membership(req.user.id, id, memberId, null);
    case "share": case "unshare": return spaces.share(req.user.id, id, req.params.linkId || body.link_id, operation === "unshare");
    case "create_link": case "edit_link": case "trash_link": case "restore_link": {
      const input = operation === "trash_link" || operation === "restore_link" ? {} : req.isHTML ? formLink(body) : body;
      return spaces.changeLink(req.user.id, id, operation.replace("_link", ""), req.params.linkId || body.link_id, input, actor);
    }
    default: throw new CustomError("Invalid workspace action.", 400);
  }
}

async function list(req, res) {
  const data = await spaces.list(req.user.id);
  // Invitations require a session; a read token cannot discover pending access.
  if (req.apiToken || req.get("X-API-Key") || req.query.apikey || req.body?.apikey) delete data.invitations;
  res.json(data);
}
async function detail(req, res) {
  const data = await spaces.detail(req.user.id, req.params.id, req.query);
  if (req.apiToken) delete data.members;
  res.json(data);
}
const api = operation => async (req, res) => {
  const result = await mutate(req, operation, res);
  if (result === undefined) return res.sendStatus(204);
  res.status(["create", "invite", "create_link"].includes(operation) ? 201 : 200).json(result);
};

async function page(req, res, error) {
  const all = await spaces.list(req.user.id);
  let selected;
  if (req.params.id) selected = await spaces.detail(req.user.id, req.params.id, req.query);
  const url = selected ? "/settings/workspaces/" + selected.id : "/settings/workspaces";
  if (selected) {
    selected.owner = selected.role === "owner";
    if (selected.owner) {
      selected.share_candidates = await spaces.candidates(req.user.id, selected.id, req.query.share_q);
      selected.share_q = req.query.share_q;
    }
    selected.editor = selected.role !== "viewer";
    selected.trash = selected.state === "trash";
    selected.members = selected.members.map(m => ({ ...m, editor: m.role === "editor" }));
    selected.data = selected.data.map(link => ({ ...link, can_edit: selected.editor && link.editable, can_unshare: selected.owner,
      trashed: !!link.deleted_at }));
  }
  const pageURL = number => url + "?" + new URLSearchParams({ q: selected.q, state: selected.state, page: number });
  return res.render("workspaces", { title: selected?.name || "Workspaces", all, selected, error, action_url: url,
    previous: selected?.page > 1 ? pageURL(selected.page - 1) : null,
    next: selected && selected.page * selected.limit < selected.total ? pageURL(selected.page + 1) : null });
}

async function submit(req, res) {
  const operation = req.body.operation;
  try {
    const result = await mutate(req, operation, res);
    let id = req.params.id;
    if (operation === "create") id = result.id;
    if (operation === "accept") id = result.workspace_id;
    if (operation === "close" || operation === "remove_member") id = null;
    return res.redirect(303, "/settings/workspaces" + (id ? "/" + id : ""));
  } catch (error) {
    if (!(error instanceof CustomError)) throw error;
    res.status(error.statusCode || 400);
    return page(req, res, error.message);
  }
}

module.exports = { boundary, list, detail, api, page, submit };
