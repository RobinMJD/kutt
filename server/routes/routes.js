const { Router } = require("express");

const helpers = require("./../handlers/helpers.handler");
const locals = require("./../handlers/locals.handler");
const renders = require("./renders.routes");
const domains = require("./domain.routes");
const health = require("./health.routes");
const link = require("./link.routes");
const user = require("./user.routes");
const auth = require("./auth.routes");
const tokens = require("./tokens.routes");
const tokenHandlers = require("../handlers/tokens.handler");
const asyncHandler = require("../utils/asyncHandler");

const renderRouter = Router();
renderRouter.use(renders);

const apiRouter = Router();
apiRouter.use(locals.noLayout);
apiRouter.use(asyncHandler(tokenHandlers.authenticate));
apiRouter.use("/tokens", tokens);
apiRouter.use("/domains", domains);
apiRouter.use("/health", health);
apiRouter.use("/links", link);
apiRouter.use("/library", require("./library.routes"));
apiRouter.use("/transfer", require("./transfer.routes"));
apiRouter.use("/workspaces", require("./workspaces.routes"));
apiRouter.use("/users", user);
apiRouter.use("/auth", auth);

module.exports = {
  api: apiRouter,
  render: renderRouter,
};
