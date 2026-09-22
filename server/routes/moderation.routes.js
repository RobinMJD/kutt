const { Router } = require("express");
const auth = require("../handlers/auth.handler");
const handlers = require("../handlers/moderation.handler");
const asyncHandler = require("../utils/asyncHandler");
const api = Router(), pages = Router();
api.use(asyncHandler(auth.apikey), asyncHandler(auth.jwt), asyncHandler(auth.admin));
api.get("/", asyncHandler(handlers.list));
api.post("/:entity/:id/unban", asyncHandler(auth.sessionOrigin), asyncHandler(handlers.unban));
pages.use(asyncHandler(auth.jwtPage), asyncHandler(auth.admin), asyncHandler(require("../handlers/locals.handler").user));
// Native POST forms need a real same-origin Origin rather than the opaque
// Origin produced by no-referrer. Do not send a referrer to external sites.
pages.use((req, res, next) => { res.set({ "Referrer-Policy": "same-origin", "Cache-Control": "no-store" }); next(); });
pages.get("/", asyncHandler(handlers.page));
pages.get("/:entity/:id", asyncHandler(handlers.confirm));
pages.post("/:entity/:id", asyncHandler(auth.sessionOrigin), asyncHandler(handlers.unban));
pages.use((error, req, res, next) => {
  if (!req.isHTML) return next(error);
  const known = error instanceof require("../utils").CustomError;
  res.status(known ? error.statusCode : 500).set("Cache-Control", "no-store").render("error", {
    title: "Moderation failed",
    message: known ? error.message : "Moderation could not be completed. Review the current state before retrying."
  });
});
module.exports = { api, pages };
