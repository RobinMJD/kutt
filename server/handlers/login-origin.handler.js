const env = require("../env");
const { CustomError } = require("../utils");

module.exports = function loginOrigin(req, res, next) {
  const expected = new URL("https://" + env.DEFAULT_DOMAIN);
  const allowed = new Set([expected.origin]);
  // Plain HTTP is only useful for a developer's loopback instance.
  if (env.isDev || ["localhost", "127.0.0.1", "[::1]"].includes(expected.hostname)) {
    expected.protocol = "http:"; allowed.add(expected.origin);
  }
  const origin = req.get("Origin");
  if (req.get("Sec-Fetch-Site") === "cross-site" || (origin && !allowed.has(origin))) {
    res.status(403).set("Cache-Control", "no-store");
    return next(new CustomError("Invalid request origin.", 403));
  }
  // API clients without browser Origin/Fetch-Metadata remain supported.
  next();
};
