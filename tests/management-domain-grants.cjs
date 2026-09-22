// Synthetic accounts and a fresh disposable DB only. No external DNS or mail.
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { existsSync, mkdtempSync, rmSync } = require("node:fs");
const path = require("node:path"), http = require("node:http"), net = require("node:net");
const { setTimeout: delay } = require("node:timers/promises");
const root = path.resolve(__dirname, "..");
assert(!existsSync(path.join(root, ".env")));
const external = process.env.KUTT_DATABASE_DISPOSABLE === "1";
const database = external ? Object.fromEntries(["DB_CLIENT", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"].map(key => [key, process.env[key]])) : {};
if (external) {
  assert.equal(database.DB_HOST, "127.0.0.1");
  assert.equal(database.DB_NAME, "kutt_search_regression");
  assert(["mysql2", "pg"].includes(database.DB_CLIENT));
}
function unit() {
  const { parse } = require("../server/management-origin");
  const env = { DEFAULT_DOMAIN: "short.example.invalid", isDev: true };
  assert.equal(parse("", env), null);
  assert.equal(parse("HTTPS://Manage.Example.Invalid:443/", env).origin, "https://manage.example.invalid");
  assert.equal(parse("https://münchen.example.invalid", env).host, "xn--mnchen-3ya.example.invalid");
  assert.equal(parse("http://localhost:4000", env).origin, "http://localhost:4000");
  for (const value of ["https://short.example.invalid:444", "https://www.short.example.invalid", "http://manage.example.invalid", "https://user@manage.invalid", "https://manage.invalid/path", "https://manage.invalid/?x", "https://manage.invalid/#", "https://manage.invalid\\x", "https://manage.invalid.", " https://manage.invalid", "https://manage%2einvalid", "https:manage.invalid", "https://bad..invalid", "https://-bad.invalid", "https://manage.invalid/../", "https://manage.invalid\n"]) assert.throws(() => parse(value, env), undefined, value);
  assert.throws(() => parse("http://localhost:4000", { ...env, isDev: false }));
}

async function main() {
  unit();
  const directory = mkdtempSync(path.join(require("node:os").tmpdir(), "kutt-grants-"));
  let db, server, exited, output = "";
  const stop = async () => {
    if (!server) return;
    server.kill("SIGTERM"); await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) { server.kill("SIGKILL"); await exited; }
    server = null;
  };
  try {
    const listener = net.createServer();
    await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
    const short = `127.0.0.1:${port}`, host = `localhost:${port}`, origin = "http://" + host;
    const env = { PATH: process.env.PATH, NODE_ENV: "development", PORT: String(port), DEFAULT_DOMAIN: short, MANAGEMENT_ORIGIN: origin,
      DB_CLIENT: "better-sqlite3", DB_FILENAME: path.join(directory, "fixture.sqlite"), ...database,
      JWT_SECRET: randomBytes(48).toString("hex"), REDIS_ENABLED: "false", MAIL_ENABLED: "false", OIDC_ENABLED: "false",
      DISALLOW_ANONYMOUS_LINKS: "false", DISALLOW_REGISTRATION: "true", DISALLOW_LOGIN_FORM: "false", ENABLE_RATE_LIMIT: "false", TRUST_PROXY: "false", NODE_APP_INSTANCE: "1" };
    for (const key of Object.keys(process.env)) if (key.endsWith("_FILE")) delete process.env[key];
    Object.assign(process.env, env);
    db = require("../server/knex");
    assert.equal(await db.schema.hasTable("users"), false, "Refuse an initialized database");
    await db.migrate.latest({ directory: path.join(root, "server/migrations") });
    const request = (method, endpoint, body, token, extra = {}, requestHost = host) => new Promise((resolve, reject) => {
      const req = http.request({ hostname: "127.0.0.1", port, method, path: endpoint,
        headers: { Host: requestHost, Accept: "application/json", ...(body !== undefined && { "Content-Type": "application/json" }),
          ...(token && { Cookie: "token=" + token }), ...extra } }, res => {
        const chunks = []; res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString(),
          json() { return this.text ? JSON.parse(this.text) : null; } }));
      });
      req.setTimeout(15000, () => req.destroy(Error("Fixture HTTP timeout"))); req.on("error", reject);
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
    const checked = async (method, endpoint, body, token, expected = 200, extra, requestHost) => {
      const res = await request(method, endpoint, body, token, extra, requestHost);
      assert.equal(res.status, expected, method + " " + endpoint + " status=" + res.status + " " + (res.text.startsWith('{"error"') ? res.text : "") + (res.status >= 500 ? "\n" + output : ""));
      return res.json();
    };
    const start = async settings => {
      output = "";
      server = spawn(process.execPath, [path.join(root, "server/server.js")], { cwd: directory, env: { ...env, ...settings }, stdio: ["ignore", "pipe", "pipe"] });
      server.stdout.on("data", chunk => { output = (output + chunk).slice(-6000); });
      server.stderr.on("data", chunk => { output = (output + chunk).slice(-6000); });
      exited = new Promise(resolve => { server.once("exit", resolve); server.once("error", resolve); });
      for (let i = 0; i < 100; i++) {
        try { if ((await request("GET", "/api/health")).status === 200) return; } catch {}
        if (server.exitCode != null) break;
        await delay(100);
      }
      throw Error("Fixture startup failed: " + output);
    };
    await start();
    const password = randomBytes(32).toString("hex");
    const adminToken = (await checked("POST", "/api/auth/create-admin", { email: "admin@example.invalid", password }, null, 201, { Origin: origin })).token;
    const admin = await db("users").where({ email: "admin@example.invalid" }).first();
    const users = require("../server/queries/user.queries"), utils = require("../server/utils"), access = require("../server/domain-access");
    const owner = await users.add({ email: "owner@example.invalid", password: "fixture-no-login", verified: true });
    const recipient = await users.add({ email: "recipient@example.invalid", password: "fixture-no-login", verified: true });
    const stranger = await users.add({ email: "stranger@example.invalid", password: "fixture-no-login", verified: true });
    const ownerToken = utils.signToken(owner), recipientToken = utils.signToken(recipient), strangerToken = utils.signToken(stranger);
    const domain = { uuid: randomUUID(), address: "shared.example.invalid", user_id: owner.id };
    await db("domains").insert(domain); Object.assign(domain, await db("domains").where({ uuid: domain.uuid }).first());
    const endpoint = "/api/domains/" + domain.uuid + "/grants", target = "https://192.0.2.1/grants";
    const create = (alias, token = recipientToken, expected = 201, extra) => checked("POST", "/api/links", { target, customurl: alias, domain: domain.address }, token, expected, extra);
    for (const route of ["/", "/settings", "/login", "/logout", "/create-admin", "/login/oidc", "/reset-password/opaque", "/verify/opaque", "/settings/domain-sharing", "/api/links", "/API/v2/links", "/api/auth/login", "/%6cogin", "/settings%2fsecurity", "/%61pi/links", "/api%2fv2%2flinks", "/%256cogin"]) {
      for (const requestHost of [short, domain.address, "foreign.example.invalid"]) {
        const response = await request("GET", route, undefined, adminToken, { "X-Forwarded-Host": host, "X-Forwarded-Proto": "https" }, requestHost);
        assert((route.includes("%") ? [400, 404] : [404]).includes(response.status), route + " on " + requestHost + ": " + response.status);
        assert(!response.headers.location); assert(!response.headers["set-cookie"]);
      }
    }
    for (const requestHost of [short, domain.address]) {
      const denied = await request("POST", "/api/auth/login", { email: admin.email, password }, null, { Origin: origin, "X-Forwarded-Host": host }, requestHost);
      assert.equal(denied.status, 404); assert(!denied.headers.location); assert(!denied.headers["set-cookie"]);
    }
    for (const requestHost of ["localhost.evil.invalid:" + port, host + ".", host + ",foreign.invalid", "user@" + host]) {
      assert.equal((await request("GET", "/settings", undefined, adminToken, {}, requestHost)).status, 404);
    }
    for (const badOrigin of ["null", "http://" + short, "https://" + host, "https://foreign.invalid"]) {
      await checked("POST", "/api/auth/login", { email: admin.email, password }, null, 403, { Origin: badOrigin });
      await checked("POST", endpoint, { email: recipient.email }, ownerToken, 403, { Origin: badOrigin });
    }
    const login = await request("POST", "/api/auth/login", { email: admin.email, password }, null, { Origin: origin, Accept: "text/html" });
    assert.equal(login.status, 303);
    const cookies = login.headers["set-cookie"].filter(cookie => cookie.startsWith("token="));
    assert(cookies.some(cookie => /HttpOnly/.test(cookie) && /SameSite=Lax/.test(cookie) && /Path=\//.test(cookie)));
    assert(cookies.every(cookie => !/Domain=/i.test(cookie)));
    assert.equal(utils.getSiteURL(), origin);
    assert.equal(require("../server/handlers/shortcuts.handler").endpoint(), origin + "/api/v2/links");
    for (const kind of ["verify", "reset", "change-email"]) {
      const mail = require("../server/mail/render").render(kind, { domain: host, origin, site_name: "Fixture", token: "synthetic" });
      assert(mail.html.includes(origin + "/") && mail.text.includes(origin + "/")); assert(!mail.html.includes("https://" + short));
    }
    await create("before-grant", recipientToken, 400);
    await create("guest-grant", null, 400);
    await checked("POST", endpoint, { email: recipient.email }, strangerToken, 404);
    const grant = await checked("POST", endpoint, { email: recipient.email }, ownerToken, 201, { Origin: origin });
    await checked("POST", endpoint, { email: stranger.email }, recipientToken, 404);
    await checked("GET", endpoint, undefined, recipientToken, 404);
    const available = await checked("GET", "/api/domains/available", undefined, recipientToken);
    assert.deepEqual(available.data, [{ id: domain.uuid, address: domain.address, owned: false }]);
    const shared = await create("shared/guide.pdf");
    assert.equal((await db("links").where({ uuid: shared.id }).first()).user_id, recipient.id);
    const protectedLink = await checked("POST", "/api/links", { target, customurl: "shared-protected", domain: domain.address, password: "synthetic-protection" }, recipientToken, 201);
    const forward = await create("shared-forward");
    await checked("PUT", "/api/links/" + forward.id + "/forwarding", { revision: 0, query_keys: ["page"], path_prefixes: ["docs"] }, recipientToken);
    const scoped = await checked("POST", "/api/tokens", { name: "Shared", scopes: ["links:read", "links:create", "links:update"], domain_scope: domain.uuid }, recipientToken, 201);
    const all = await checked("POST", "/api/tokens", { name: "All", scopes: ["links:read", "links:create", "links:update"], domain_scope: "all" }, recipientToken, 201);
    const grantToken = await checked("POST", "/api/tokens", { name: "Sharing", scopes: ["domains:share"], domain_scope: domain.uuid }, ownerToken, 201);
    await checked("GET", endpoint, undefined, null, 200, { "X-API-Key": grantToken.token });
    await checked("GET", endpoint, undefined, null, 403, { "X-API-Key": scoped.token });
    for (const route of ["/api/links/" + shared.id + "/stats", "/api/links/" + shared.id + "/qr", "/api/links/" + shared.id + "/history"]) {
      const response = await request("GET", route, undefined, ownerToken);
      assert.equal(response.status, route.endsWith("/stats") ? 500 : 404, route);
      assert(!response.text.includes(target));
    }
    assert(!(await checked("GET", "/api/links", undefined, ownerToken)).data.some(link => link.id === shared.id));
    const workspace = await checked("POST", "/api/workspaces", { name: "Granted workspace" }, recipientToken, 201);
    const wsPath = "/api/workspaces/" + workspace.id;
    const invitation = await checked("POST", wsPath + "/members", { email: stranger.email, role: "editor" }, recipientToken, 201);
    await checked("POST", "/api/workspaces/invitations/" + invitation.id + "/accept", {}, strangerToken);
    const workspaceLink = await checked("POST", wsPath + "/links", { address: "workspace-shared", target, domain: domain.address }, strangerToken, 201);
    assert.equal((await db("links").where({ uuid: workspaceLink.id }).first()).user_id, recipient.id);
    const input = { format: "json", conflict: "abort", content: JSON.stringify({ schema_version: 1, links: [{ address: "import-shared", target, domain: domain.address }] }) };
    const preview = await checked("POST", "/api/transfer/preview", input, recipientToken); assert(preview.valid);
    const ordinary = await checked("POST", "/api/links", { target, customurl: "ordinary-health" }, recipientToken, 201);
    const ordinaryHealth = await checked("PUT", "/api/links/" + ordinary.id + "/health", { revision: 0, enabled: true, interval_hours: 24 }, recipientToken);
    assert(ordinaryHealth.enabled); assert.deepEqual(ordinaryHealth.results, []);
    const health = await checked("PUT", "/api/links/" + shared.id + "/health", { revision: 0, enabled: true, interval_hours: 24 }, recipientToken);
    assert(health.enabled);
    const replay = await create("replay-shared", recipientToken, 201, { "Idempotency-Key": "grants-idempotent-01" });
    await checked("DELETE", endpoint + "/" + grant.id, undefined, ownerToken, 204, { Origin: origin });
    assert((await db("api_tokens").where({ id: scoped.id }).first()).revoked_at);
    assert.equal(Number((await db("link_health").where({ link_id: (await db("links").where({ uuid: shared.id }).first()).id }).first()).enabled), 0);
    await create("after-revoke", recipientToken, 400);
    await create("all-after-revoke", null, 400, { "X-API-Key": all.token });
    await create("scoped-after-revoke", null, 401, { "X-API-Key": scoped.token });
    await create("replay-shared", recipientToken, 400, { "Idempotency-Key": "grants-idempotent-01" });
    await checked("PATCH", "/api/links/" + shared.id, { description: "denied" }, recipientToken, 403);
    await checked("POST", "/api/transfer/commit", { ...input, preview_token: preview.preview_token }, recipientToken, 409);
    await checked("POST", wsPath + "/links", { address: "workspace-revoked", target, domain: domain.address }, strangerToken, 403);
    await checked("PUT", "/api/links/" + shared.id + "/routing", { revision: 0, rules: [] }, recipientToken, 410);
    for (const method of ["GET", "HEAD"]) {
      const response = await request(method, "/" + shared.address, undefined, undefined, {}, domain.address);
      assert.equal(response.status, 302); assert.equal(response.headers.location, target); assert(!response.headers["set-cookie"]);
    }
    assert.equal((await request("GET", "/shared-protected", undefined, undefined, { Accept: "text/html" }, domain.address)).status, 200);
    await checked("POST", "/api/links/" + protectedLink.id + "/protected", { password: "synthetic-protection" }, null, 200, { Origin: "http://" + domain.address }, domain.address);
    for (const Origin of ["null", origin, "http://foreign.example.invalid"]) {
      await checked("POST", "/api/links/" + protectedLink.id + "/protected", { password: "synthetic-protection" }, null, 403, { Origin }, domain.address);
    }
    for (const wrong of [host, short, "foreign.example.invalid"]) await checked("POST", "/api/links/" + protectedLink.id + "/protected", { password: "synthetic-protection" }, null, 404, {}, wrong);
    assert.equal((await request("GET", "/shared-forward/docs/a.pdf?page=2", undefined, undefined, {}, domain.address)).headers.location, target + "/docs/a.pdf?page=2");
    let nextGrant = await checked("POST", endpoint, { email: recipient.email }, adminToken, 201);
    await create("scoped-regrant-denied", null, 401, { "X-API-Key": scoped.token });
    await create("regranted");
    assert.equal(Number((await db("link_health").where({ link_id: (await db("links").where({ uuid: shared.id }).first()).id }).first()).enabled), 0);
    await checked("DELETE", "/api/links/" + replay.id, undefined, recipientToken);
    await checked("DELETE", endpoint + "/" + nextGrant.id, undefined, ownerToken, 204);
    await checked("POST", "/api/links/" + replay.id + "/restore", {}, recipientToken, 403);
    nextGrant = await access.grant({ user: owner }, domain.uuid, { email: recipient.email });
    const requestData = { user: recipient, body: { fetched_domain: domain }, get: () => undefined };
    const creation = require("../server/link-creation");
    let acquired, release;
    const ready = new Promise(resolve => { acquired = resolve; }), wait = new Promise(resolve => { release = resolve; });
    const writing = creation.run(requestData, async transaction => {
      acquired(); await wait;
      return require("../server/queries/link.queries").create({ address: "racing-write", target, domain_id: domain.id, user_id: recipient.id }, transaction);
    });
    await ready;
    let revoked = false;
    const revoking = access.revoke({ user: owner }, domain.uuid, nextGrant.id).then(() => { revoked = true; });
    await delay(100); assert.equal(revoked, false); release(); await writing; await revoking;
    await assert.rejects(creation.run(requestData, async () => { throw Error("must not execute"); }), /unavailable/);
    if (external) {
      const staleGrant = await access.grant({ user: owner }, domain.uuid, { email: recipient.email });
      await assert.rejects(db.transaction(async transaction => {
        assert(await transaction("domain_grants").where({ id: staleGrant.id }).first());
        await access.revoke({ user: owner }, domain.uuid, staleGrant.id);
        await require("../server/queries/link.queries").create({ address: "stale-snapshot", target, domain_id: domain.id, user_id: recipient.id }, transaction);
      }), /unavailable/);
    }
    for (const transition of ["ban", "release", "owner-ban"]) {
      await access.grant({ user: owner }, domain.uuid, { email: recipient.email });
      if (transition === "ban") {
        await require("../server/moderation").moderate("domain", String(domain.id), true, admin);
        await require("../server/moderation").moderate("domain", String(domain.id), false, admin);
      } else if (transition === "release") {
        await require("../server/queries/domain.queries").release(domain.id, owner.id);
        await require("../server/queries/domain.queries").claim({ address: domain.address, user: owner });
      } else {
        await require("../server/moderation").moderate("user", String(owner.id), true, admin);
        await require("../server/moderation").moderate("user", String(owner.id), false, admin);
        Object.assign(owner, await db("users").where({ id: owner.id }).first());
      }
      assert.equal(await access.find(db, recipient.id, { id: domain.id }), undefined, transition + " must not resurrect grants");
    }
    await stop();
    // Disabled configuration preserves legacy custom-domain API management.
    await start({ MANAGEMENT_ORIGIN: "" });
    assert.equal((await request("GET", "/api/links", undefined, recipientToken, {}, domain.address)).status, 200);
    assert.equal((await request("GET", "/login", undefined, null, { Accept: "text/html" }, short)).status, 200);
    assert.equal((await request("GET", "/" + shared.address, undefined, null, {}, domain.address)).status, 302);
    console.log("PASS: " + env.DB_CLIENT + " split-host spoof/CSRF/cookies/mail, default compatibility, explicit grants/ownership/scopes, workspace/import checks, revoke races/stale snapshots, protected/HEAD/forwarding redirects and ban/reclaim non-resurrection");
  } finally {
    await stop(); if (db) await db.destroy(); rmSync(directory, { recursive: true, force: true });
  }
}
module.exports = async () => {
  const result = require("node:child_process").spawnSync(process.execPath, [__filename], {
    env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 120000
  });
  assert.equal(result.status, 0, result.stderr);
  console.log(result.stdout.trim());
};
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
