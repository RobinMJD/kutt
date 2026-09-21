const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");
const http = require("node:http");

module.exports = async ({ request, session, database, account, env }) => {
  const db = new Database(database);
  const owner = db.prepare("SELECT id FROM users WHERE email=?").get(account.email).id;
  const domains = [];
  const checked = async (promise, status) => {
    const response = await promise;
    assert.equal(response.status, status, await response.clone().text());
    return response;
  };
  // Undici can replace Host; use a real HTTP request for host-routing assertions.
  const hostRequest = host => new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: env.PORT, path: "/host-same", headers: { Host: host } }, res => {
      res.resume(); res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.setTimeout(5000, () => req.destroy(new Error("Host fixture timed out")));
    req.on("error", reject);
  });
  try {
    const falseMatch = "notexample.invalid", intended = "notwww.example.invalid";
    domains.push(Number(db.prepare("INSERT INTO domains(uuid,address,banned) VALUES(?,?,1)").run(randomUUID(), falseMatch).lastInsertRowid));
    const create = target => request("POST", "/api/links", { target, customurl: "host-" + randomUUID() }, session);
    let response = await checked(create("https://" + intended + "/original"), 201);
    const link = await response.json();
    response = await checked(request("GET", "/" + link.address, undefined, undefined, {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    }), 302);
    let safari = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      safari = db.prepare("SELECT COALESCE(SUM(br_safari),0) AS n FROM visits WHERE link_id=(SELECT id FROM links WHERE uuid=?)").get(link.id).n;
      if (safari === 1) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(safari, 1, "A public Safari redirect must reach the Safari aggregate");
    await checked(create("https://www." + falseMatch + "/blocked"), 400);
    await checked(request("PATCH", "/api/links/" + link.id, { target: "https://sub.www.example.invalid/edited" }, session), 200);
    const rules = [{ name: "Interior prefix", target: "https://" + intended + "/routed", conditions: { languages: ["fr"] } }];
    await checked(request("PUT", "/api/links/" + link.id + "/routing", { rules, revision: 0 }, session), 200);
    response = await checked(request("GET", "/" + link.address, undefined, undefined, { "Accept-Language": "fr" }), 302);
    assert.equal(response.headers.get("location"), rules[0].target);
    const input = { format: "json", conflict: "abort", content: JSON.stringify([{ address: "host-import-" + randomUUID(), target: "https://" + intended + "/import" }]) };
    response = await checked(request("POST", "/api/transfer/preview", input, session), 200);
    const plan = await response.json(); assert.equal(plan.valid, true);
    await checked(request("POST", "/api/transfer/commit", { ...input, preview_token: plan.preview_token }, session), 201);
    response = await checked(request("POST", "/api/domains", { address: intended }, session), 409);
    const challenge = (await response.json()).verification;
    assert.equal(challenge.record_name, "_kutt-verification." + intended);
    response = await checked(request("POST", "/api/domains", { address: "sub.www.example.invalid", proof: challenge.proof }, session), 409);
    assert.notEqual((await response.json()).verification.proof, challenge.proof, "Proof is bound to the exact hostname");
    const domain = Number(db.prepare("INSERT INTO domains(uuid,address,user_id,banned) VALUES(?,?,?,0)").run(randomUUID(), intended, owner).lastInsertRowid);
    domains.push(domain);
    response = await checked(request("POST", "/api/links", { domain: intended, customurl: "host-same", target: "https://192.0.2.1/host" }, session), 201);
    assert.deepEqual(await hostRequest(intended), { status: 302, location: "https://192.0.2.1/host" });
    assert.deepEqual(await hostRequest(falseMatch), { status: 302, location: "/banned" });
    // A real ban on the intended hostname must still be enforced after creation.
    db.prepare("UPDATE domains SET banned=1 WHERE id=?").run(domain);
    await checked(create("https://" + intended + "/blocked"), 400);
    assert.equal(db.prepare("SELECT address FROM domains WHERE id=?").get(domain).address, intended);
    console.log("PASS: hostname identity across bans, create/edit/import/routing, DNS proofs and public Host lookup");
  } finally {
    for (const id of domains) db.prepare("UPDATE domains SET banned=0 WHERE id=?").run(id);
    db.close();
  }
};
