const { Router } = require("express");
const auth = require("../handlers/auth.handler");
const analytics = require("../handlers/analytics.handler");
const helpers = require("../handlers/helpers.handler");
const asyncHandler = require("../utils/asyncHandler");
const router = Router();
router.use(asyncHandler(auth.apikey), asyncHandler(auth.jwt), analytics.boundary);
router.get("/", helpers.rateLimit({ window: 60, limit: 30 }), asyncHandler(analytics.get));
module.exports = router;
