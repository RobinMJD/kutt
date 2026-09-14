// Keep legacy single aliases compatible; nested aliases use unambiguous segments.
function reserved(value) {
  const root = String(value).split("/")[0].toLowerCase();
  return [...require("./utils").preservedURLs, "scripts", ".well-known", "favicon.ico", "robots.txt", "404"]
    .some(item => item.toLowerCase() === root);
}
function valid(value) {
  if (typeof value !== "string" || !value.length || value.length > 64 || reserved(value)) return false;
  if (!value.includes("/")) {
    const utils = require("./utils");
    return utils.customAddressRegex.test(value) || utils.customAlphabetRegex.test(value);
  }
  const parts = value.split("/");
  return parts.length <= 8 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part));
}
module.exports = { valid, reserved };
