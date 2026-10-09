function legacyTimestamp(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isFinite(value.getTime())) return value.getTime();
  } else if (typeof value === "string") {
    const normalized = value.replace(" ", "T");
    if (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)?$/.test(normalized)) {
      const time = Date.parse(normalized + (/(Z|[+-]\d\d:\d\d)$/.test(normalized) ? "" : "Z"));
      const day = normalized.slice(0, 10);
      if (Number.isFinite(time) && new Date(day + "T00:00:00Z").toISOString().slice(0, 10) === day) return time;
    }
  }
  throw new Error("Invalid stored link expiry; repair it before migrating deadlines.");
}

function effectiveEnd(link) {
  const legacy = legacyTimestamp(link.expire_in);
  const end = link.ends_at == null ? null : Number(link.ends_at);
  if (end !== null && !Number.isFinite(end)) throw new Error("Invalid stored link end date.");
  return legacy === null ? end : end === null ? legacy : Math.min(legacy, end);
}

module.exports = { legacyTimestamp, effectiveEnd };
