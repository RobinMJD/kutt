(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KuttCampaign = factory();
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  const fields = Object.freeze(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);
  function parse(target) {
    if (typeof target !== "string" || !target.trim() || target.length > 2040) throw new Error("Campaign destination must be a URL of at most 2040 characters.");
    const value = target.trim();
    let url;
    try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : "https://" + value); }
    catch { throw new Error("Campaign destination must be a valid HTTP or HTTPS URL."); }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("Campaign destination must use HTTP or HTTPS without embedded credentials.");
    return url;
  }
  function apply(target, values) {
    const url = parse(target);
    if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some(key => !fields.includes(key))) throw new Error("Unknown campaign parameter.");
    for (const key of fields) {
      if (!Object.hasOwn(values, key)) continue;
      const value = values[key];
      if (value !== null && (typeof value !== "string" || value.length > 255 || /[\u0000-\u001f\u007f]/.test(value))) throw new Error(key + " must be at most 255 printable characters, or null to remove it.");
      if (value === null || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    const result = url.href;
    if (result.length > 2040) throw new Error("Destination including campaign parameters exceeds 2040 characters.");
    return result;
  }
  function read(target) {
    const url = parse(target);
    return Object.fromEntries(fields.map(key => [key, url.searchParams.get(key) || ""]));
  }
  return Object.freeze({ fields, apply, read });
});
