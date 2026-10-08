const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const Database = require("better-sqlite3");

module.exports = async ({ request, session, database, account, restart, root, directory, env }) => {
  const db = new Database(database), owner = db.prepare("SELECT * FROM users WHERE email=?").get(account.email);
  const check = async (pending, status = 200) => {
    const response = await pending;
    assert.equal(response.status, status, await response.clone().text());
    return response.json();
  };
  try {
    const prefix = "reset-" + randomUUID();
    const create = suffix => check(request("POST", "/api/links", { customurl: prefix + suffix, target: "https://192.0.2.1/default", max_visits: 3 }, session), 201);
    const link = await create("-one"), other = await create("-two");
    const row = db.prepare("SELECT * FROM links WHERE uuid=?").get(link.id);
    const otherRow = db.prepare("SELECT * FROM links WHERE uuid=?").get(other.id);
    const snapshot = () => db.prepare("SELECT * FROM links WHERE id=?").get(row.id);
    const revision = () => Number(db.prepare("SELECT revision FROM link_tracking WHERE link_id=?").get(row.id)?.revision || 0);
    const buckets = () => db.prepare("SELECT COUNT(*) n FROM visits WHERE link_id=?").get(row.id).n;
    const reset = (body = { confirm: true, revision: revision() }, cookie = session, headers = {}, prefix = "/api") =>
      request("POST", prefix + "/links/" + link.id + "/stats/reset", body, cookie, headers);
    const worker = generation => {
      const result = spawnSync(process.execPath, ["-e", `(async()=>{const db=require(${JSON.stringify(path.join(root, "server/knex"))});try{await require(${JSON.stringify(path.join(root, "server/queries/visit.queries"))}).add(${JSON.stringify({ link_id: row.id, user_id: owner.id, tracking_revision: generation, country: "FR", browser: "safari", os: "ios", referrer: "Direct" })})}finally{await db.destroy()}})().catch(e=>{console.error(e);process.exitCode=1})`], { cwd: directory, env, encoding: "utf8", timeout: 30000 });
      assert.equal(result.status, 0, result.stderr);
    };
    worker(0); worker(0);
    db.prepare("UPDATE links SET visit_count=7,redirect_count=3 WHERE id=?").run(otherRow.id);
    db.prepare("UPDATE links SET redirect_count=3 WHERE id=?").run(row.id);
    const before = snapshot();
    assert.equal(before.visit_count, 2); assert.equal(buckets(), 1);
    await check(reset(undefined, null), 401);
    for (const body of [{}, { confirm: false, revision: 0 }, { confirm: "true", revision: 0 }, { confirm: true, revision: "0" }, { confirm: true, revision: -1 }, { confirm: true, revision: 0, user_id: owner.id }]) await check(reset(body), 400);
    await check(reset(undefined, session, { Origin: "https://evil.invalid" }), 403);
    await check(reset(undefined, session, { "Sec-Fetch-Site": "cross-site" }), 403);
    const foreign = Number(db.prepare("INSERT INTO users(email,password,role,verified) VALUES(?,?,'ADMIN',1)").run(prefix + "@example.invalid", owner.password).lastInsertRowid);
    const foreignSession = require("jsonwebtoken").sign({ iss: "ApiAuth", sub: foreign }, env.JWT_SECRET, { expiresIn: 600 });
    await check(reset(undefined, foreignSession), 404);
    const token = async scopes => check(request("POST", "/api/tokens", { name: "Reset fixture", scopes, domain_scope: "default" }, session), 201);
    for (const scope of ["stats:read", "links:update", "links:delete", "links:read"]) {
      const key = await token([scope]);
      await check(reset(undefined, session, { "X-API-Key": key.token }), 403);
    }
    const key = await token(["stats:reset", "stats:read"]), headers = { "X-API-Key": key.token };
    const stats = await check(request("GET", "/api/links/" + link.id + "/stats", undefined, undefined, headers));
    assert.equal(stats.reset_revision, 0);
    const domain = Number(db.prepare("INSERT INTO domains(uuid,address,user_id) VALUES(?,?,?)").run(randomUUID(), prefix + ".invalid", owner.id).lastInsertRowid);
    db.prepare("UPDATE links SET domain_id=? WHERE id=?").run(domain, row.id);
    await check(reset(undefined, undefined, headers), 404);
    db.prepare("UPDATE links SET domain_id=NULL WHERE id=?").run(row.id);
    for (const [field, value, expected] of [["banned", 1, 404], ["deleted_at", Date.now(), 410], ["archived_domain", "old.invalid", 410]]) {
      db.prepare("UPDATE links SET " + field + "=? WHERE id=?").run(value, row.id);
      await check(reset(), expected);
      db.prepare("UPDATE links SET " + field + "=? WHERE id=?").run(field === "banned" ? 0 : null, row.id);
    }
    // An audit write failure must roll back counters, buckets and the queue fence.
    db.exec("CREATE TRIGGER reset_audit_failure BEFORE INSERT ON link_history WHEN NEW.action='statistics_reset' BEGIN SELECT RAISE(ABORT,'fixture'); END");
    await check(reset(), 500); db.exec("DROP TRIGGER reset_audit_failure");
    assert.equal(snapshot().visit_count, 2); assert.equal(buckets(), 1); assert.equal(revision(), 0);
    const result = await check(reset({ confirm: true, revision: 0 }, undefined, headers, "/api/v2"));
    assert.deepEqual(result, { id: link.id, visit_count: 0, reset_revision: 1 });
    assert.equal(buckets(), 0); assert.equal(snapshot().visit_count, 0);
    assert.deepEqual(snapshot(), { ...before, visit_count: 0 });
    assert.equal(db.prepare("SELECT visit_count FROM links WHERE id=?").get(otherRow.id).visit_count, 7);
    const audit = db.prepare("SELECT * FROM link_history WHERE link_id=? AND action='statistics_reset'").get(row.id);
    assert.equal(audit.source, "api_token"); assert.equal(audit.actor_id, owner.id);
    worker(0); assert.equal(snapshot().visit_count, 0, "Delayed old job cannot resurrect test visits");
    worker(1); assert.equal(snapshot().visit_count, 1);
    await check(reset({ confirm: true, revision: 0 }), 409);
    const competing = await Promise.all([reset(), reset()]);
    assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
    assert.equal(snapshot().visit_count, 0);
    await check(request("PUT", "/api/links/" + link.id + "/tracking", { enabled: false, revision: revision() }, session));
    await check(reset()); assert.equal(db.prepare("SELECT enabled FROM link_tracking WHERE link_id=?").get(row.id).enabled, 0);
    worker(revision()); assert.equal(snapshot().visit_count, 0, "Reset does not re-enable tracking");
    assert.equal((await request("GET", "/" + link.address)).status, 410, "Reset cannot bypass an exhausted redirect limit");
    db.prepare("UPDATE links SET max_visits=NULL WHERE id=?").run(row.id);
    assert.equal((await request("HEAD", "/" + link.address)).status, 302, "Link still works without consuming a visit");
    db.prepare("UPDATE api_tokens SET revoked_at=? WHERE id=?").run(Date.now(), key.id);
    await check(reset(undefined, undefined, headers), 401);
    await restart();
    const fresh = await check(request("GET", "/api/links/" + link.id + "/stats", undefined, session));
    assert.equal(fresh.visit_count, 0); assert.equal(fresh.lastDay.total, 0); assert.equal(fresh.reset_revision, revision());
    console.log("PASS: per-link reset, owner/scope/domain/origin isolation, confirmation, audit rollback, stale/concurrent requests, delayed jobs, opt-out, quota preservation and restart");
  } finally { db.close(); }
};
