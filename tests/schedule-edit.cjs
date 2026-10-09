const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");

module.exports = async ({ request, session, database }) => {
  const db = new Database(database), html = { Accept: "text/html" };
  const text = async response => { response = await response; assert.equal(response.status, 200); return response.text(); };
  const value = (page, name) => page.match(new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`))?.[1] || "";
  const state = id => db.prepare("SELECT expire_in, ends_at, starts_at, paused, max_visits, redirect_count FROM links WHERE uuid=?").get(id);
  try {
    for (const admin of [false, true]) {
      const created = await request("POST", "/api/links", { target: "https://192.0.2.1/local", customurl: "absolute-" + randomUUID(), expire_in: "2 days" }, session);
      assert.equal(created.status, 201); const link = await created.json();
      const endpoint = "/api/links/" + (admin ? "admin/" : "") + link.id + "/lifecycle";
      const page = await text(request("GET", (admin ? "/admin" : "") + "/link/edit/" + link.id, undefined, session, html));
      assert(!page.includes('name="expire_in"')); assert(!page.includes('name="clear_expiry"'));
      assert(page.includes('class="lifecycle-checkbox"')); assert(page.includes('data-date-time-local'));
      assert.equal(Date.parse(value(page, "ends_at")), Date.parse(state(link.id).expire_in + "Z"), "Legacy deadline is visible in End");
      const payload = { schedule_mode: "absolute", availability_snapshot: value(page, "availability_snapshot"),
        ends_at: "2080-06-01T12:34:56Z", starts_at: "", max_visits: "23", paused: "on" };
      await request("PATCH", "/api/links/" + link.id + "/lifecycle", { ends_at: "2081-01-01T00:00:00Z" }, session);
      const before = state(link.id);
      let result = await text(request("PATCH", endpoint, payload, session, html));
      assert(result.includes("Availability changed elsewhere.")); assert.deepEqual(state(link.id), before);
      assert.equal(Date.parse(value(result, "ends_at")), Date.parse("2080-06-01T12:34:56Z"), "Conflict preserves date draft");
      payload.availability_snapshot = value(result, "availability_snapshot");
      result = await text(request("PATCH", endpoint, payload, session, html));
      assert(result.includes("Lifecycle updated."));
      assert.deepEqual(state(link.id), { expire_in: null, ends_at: Date.parse(payload.ends_at), starts_at: null, paused: 1, max_visits: 23, redirect_count: 0 });
      const saved = state(link.id);
      for (const availability_snapshot of ["", "bad", payload.availability_snapshot + "x"]) {
        await text(request("PATCH", endpoint, { ...payload, availability_snapshot, paused: "", ends_at: "" }, session, html));
        assert.deepEqual(state(link.id), saved, "Invalid snapshots cannot clear deadlines");
      }
      payload.availability_snapshot = value(result, "availability_snapshot");
      await request("PATCH", "/api/links/" + link.id, { description: "Unrelated change" }, session);
      result = await text(request("PATCH", endpoint, { ...payload, ends_at: "", paused: "" }, session, html));
      assert(result.includes("Lifecycle updated."), "Unrelated edits do not cause false conflicts");
      assert.equal(state(link.id).ends_at, null); assert.equal(state(link.id).expire_in, null);
      assert.equal((await request("GET", "/" + link.address)).status, 302, "Redirect stays public");
    }
    const other = await (await request("POST", "/api/links", { target: "https://192.0.2.1/admin" }, session)).json();
    db.prepare("UPDATE links SET user_id=NULL WHERE uuid=?").run(other.id);
    assert.equal((await request("PATCH", "/api/links/" + other.id + "/lifecycle", { paused: true }, session)).status, 404, "Owner route remains owner-only even for admins");
    assert.equal((await request("PATCH", "/api/links/admin/" + other.id + "/lifecycle", { paused: true }, session)).status, 200);
    assert.equal((await request("PATCH", "/api/links/admin/" + other.id + "/lifecycle", { paused: false })).status, 401);
    const outsiderId = randomUUID();
    db.prepare("INSERT INTO users(email,password,role,verified) VALUES(?,?,'USER',1)").run(outsiderId + "@example.invalid", "unused");
    // Exercise actual non-admin authentication using the fixture's login API.
    const password = randomUUID();
    db.prepare("UPDATE users SET password=? WHERE email=?").run(await require("bcryptjs").hash(password, 12), outsiderId + "@example.invalid");
    const login = await request("POST", "/api/auth/login", { email: outsiderId + "@example.invalid", password });
    assert.equal(login.status, 200); const token = (await login.json()).token;
    assert.equal((await request("PATCH", "/api/links/admin/" + other.id + "/lifecycle", { paused: false }, token)).status, 401);
    assert.equal((await request("PATCH", "/api/links/" + other.id + "/lifecycle", { paused: false }, token)).status, 404);
    console.log("PASS: canonical End, clearing, stale/forged policy refusal, unrelated edits, legacy API and owner/admin boundaries");
  } finally { db.close(); }
};
