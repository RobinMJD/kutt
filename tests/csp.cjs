const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const csp = require("../server/csp");

async function unit(root) {
  for (const mode of [undefined, "", "ENFORCE", "enforce ", "self", "report-only; report-uri https://foreign.invalid"]) assert.throws(() => csp.middleware(mode));
  for (const value of [undefined, "", "x' unsafe-inline", "a".repeat(31), "a".repeat(33)]) assert.throws(() => csp.policy(value));
  for (const file of fs.readdirSync(path.join(root, "server/views"), { recursive: true }).filter(file => file.endsWith(".hbs"))) {
    const source = fs.readFileSync(path.join(root, "server/views", file), "utf8");
    require("hbs").handlebars.precompile(source);
    const tags = [...source.matchAll(/<[a-z][^>]*>/gi)].map(match => match[0]).join("\n");
    assert(!/\s(?:on\w+|hx-on(?::[\w:-]+)?)\s*=/i.test(tags), "Executable attribute: " + file);
    assert(!/\sstyle\s*=/i.test(tags), "Inline style attribute: " + file);
    assert(!/\shx-(?:vals|headers)\s*=\s*["'](?:javascript|js):|\shx-vars\s*=/.test(source), "Evaluated values: " + file);
    for (const script of source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)) {
      assert(script[0].includes('nonce="{{cspNonce}}"') && /\ssrc=/.test(script[0]), "Nonce-bearing self-hosted script: " + file);
      assert(/>\s*<\/script>$/.test(script[0]), "No bundled inline script: " + file);
    }
  }
  const hbs = require("hbs").create().handlebars; csp.register(hbs);
  const render = hbs.compile('{{cspNonce}}|{{#each values}}{{cspNonce}}{{/each}}');
  const nonces = await Promise.all(Array.from({ length: 24 }, (_, index) => new Promise((resolve, reject) => {
    const headers = {}, res = { locals: { cspNonce: "attacker" }, set: (name, value) => { headers[name] = value; },
      render: (view, options) => {
        const body = render(options), header = headers["Content-Security-Policy"];
        const nonce = header.match(/'nonce-([^']+)'/)[1];
        assert.equal(body, nonce + "|" + nonce); resolve(nonce);
      } };
    csp.middleware("enforce")({ path: "/" }, res, () => setTimeout(() => {
      try { res.render("test", { cspNonce: "attacker", values: [{ cspNonce: "nested-attacker" }] }); } catch (error) { reject(error); }
    }, index % 5));
  })));
  assert.equal(new Set(nonces).size, nonces.length, "Fresh, isolated request nonces");
  for (const [pathname, layout, expected] of [["/api/links", undefined, false], ["/API/v2/links", undefined, false],
    ["/api", undefined, false], ["/apiary", undefined, true], ["/link/edit/x", null, false], ["/login", undefined, true]]) {
    const req = { path: pathname }, headers = {}, res = { locals: { layout },
      set: (name, value) => { headers[name] = value; }, render: () => {} };
    csp.middleware("enforce")(req, res, () => {
      req.path = "/mounted-route";
      res.render("test", { layout: false, cspNonce: "attacker" });
      assert.equal(!!headers["Content-Security-Policy"], expected, "Original API path/trusted fragment boundary: " + pathname);
    });
  }
  console.log("PASS: CSP mode/nonce bounds, all bundled script/handler contracts and concurrent unforgeable template nonces");
}

module.exports = async ({ root, request, session, restart, env }) => {
  await unit(root);
  const header = "Content-Security-Policy", report = header + "-Report-Only";
  const initial = await request("GET", "/login", undefined, undefined, { Accept: "text/html" });
  assert.equal(initial.headers.get(header), null); assert.equal(initial.headers.get(report), null);
  const initialHTML = await initial.text();
  const initialConfig = JSON.parse(initialHTML.match(/name="htmx-config" content='([^']+)'/)[1]);
  assert.equal(initialConfig.allowEval, true); assert.equal(initialConfig.allowScriptTags, true);
  assert(!Object.hasOwn(initialConfig, "attributesToSettle"), "Off preserves custom style settling");
  const created = await request("POST", "/api/links", { target: "https://192.0.2.1/csp", customurl: "csp-" + require("node:crypto").randomUUID() }, session);
  assert.equal(created.status, 201); const link = await created.json();
  try {
    for (const mode of ["report-only", "enforce"]) {
      env.CSP_MODE = mode; await restart();
      const selected = mode === "enforce" ? header : report, other = mode === "enforce" ? report : header;
      const nonces = [];
      for (const locale of ["en", "fr", "es"]) {
        const response = await request("GET", "/login?nonce=attacker&cspNonce=attacker&policy=unsafe-eval", undefined, undefined,
          { Accept: "text/html", "Accept-Language": locale, "X-CSP-Nonce": "attacker", "Content-Security-Policy": "script-src *" });
        assert.equal(response.status, 200); assert.equal(response.headers.get(other), null);
        const policy = response.headers.get(selected), nonce = policy.match(/'nonce-([^']+)'/)[1];
        assert.match(nonce, /^[A-Za-z0-9+/]{32}$/); nonces.push(nonce);
        assert.equal(policy, csp.policy(nonce)); assert(!/unsafe-|report-uri|report-to|https?:|\*/.test(policy));
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        const html = await response.text(); assert(html.includes('<html lang="' + locale + '">'));
        for (const script of html.matchAll(/<script\b[^>]*>/g)) assert(script[0].includes('nonce="' + nonce + '"'), script[0]);
        assert(html.includes('"inlineStyleNonce":"' + nonce + '"'));
        assert(html.includes('"allowEval":' + (mode !== "enforce")));
        assert(html.includes('"allowScriptTags":' + (mode !== "enforce")));
        assert(html.includes('"attributesToSettle":["class","width","height"]'));
        const fragment = await request("GET", "/link/edit/" + link.id, undefined, session, { Accept: "text/html" });
        assert.equal(fragment.headers.get(header), null); assert.equal(fragment.headers.get(report), null);
      }
      assert.equal(new Set(nonces).size, 3);
      const concurrent = await Promise.all(Array.from({ length: 9 }, async (_, index) => {
        const route = ["/", "/settings", "/stats?id=" + link.id][index % 3];
        const response = await request("GET", route, undefined, session,
          { Accept: "text/html", "Accept-Language": ["en", "fr", "es"][index % 3] });
        assert.equal(response.status, 200);
        const nonce = response.headers.get(selected).match(/'nonce-([^']+)'/)[1], html = await response.text();
        for (const script of html.matchAll(/<script\b[^>]*>/g)) assert(script[0].includes('nonce="' + nonce + '"'));
        return nonce;
      }));
      assert.equal(new Set([...nonces, ...concurrent]).size, 12, "Concurrent real document/layout-block nonce isolation");
      for (const route of ["/api/health", "/api/v2/links", "/locales/en.js", "/" + link.address]) {
        const response = await request("GET", route, undefined, session);
        assert.equal(response.headers.get(header), null); assert.equal(response.headers.get(report), null);
        if (route === "/" + link.address) { assert.equal(response.status, 302); assert.equal(response.headers.get("location"), link.target); }
      }
      const svg = await request("GET", "/api/links/" + link.id + "/qr?format=svg", undefined, session);
      assert.equal(svg.status, 200); assert.equal(svg.headers.get(header), "default-src 'none'; sandbox"); assert.equal(svg.headers.get(report), null);
    }
  } finally { delete env.CSP_MODE; await restart(); }
  console.log("PASS: optional document-only CSP, localized full pages, no-store, nonce freshness, no reflected policy, real fragments/API/assets/redirects and QR export parity");
};
module.exports.unit = unit;
if (require.main === module) unit(path.resolve(__dirname, "..")).catch(error => { console.error(error); process.exitCode = 1; });
