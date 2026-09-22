const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const origin = process.env.KUTT_TEST_URL, evidence = process.env.KUTT_EVIDENCE_DIR;
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1"); assert(evidence);
  assert.equal(new URL(origin).hostname, "localhost"); assert.equal(new URL(origin).protocol, "http:");
  mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: [
    `--host-resolver-rules=MAP browser-grants.example.invalid 127.0.0.1:${new URL(origin).port}, MAP www.browser-grants.example.invalid 127.0.0.1:${new URL(origin).port}`
  ] });
  try {
    const fixture = await browser.newContext(), password = randomBytes(32).toString("hex");
    const json = { Accept: "application/json" };
    const bootstrap = await fixture.request.post(origin + "/api/auth/create-admin", { headers: json, data: { email: "browser-admin@example.invalid", password } });
    assert.equal(bootstrap.status(), 201, "Refuse initialized fixture");
    await fixture.addCookies([{ name: "token", value: (await bootstrap.json()).token, url: origin }]);
    const accounts = {};
    for (const role of ["owner", "recipient"]) {
      const email = role + ".long-localized-account@example.invalid";
      const created = await fixture.request.post(origin + "/api/users/admin", { headers: json, data: { email, password, role: "USER", verified: true } });
      assert.equal(created.status(), 201);
      const login = await fixture.request.post(origin + "/api/auth/login", { headers: json, data: { email, password } });
      assert.equal(login.status(), 200); accounts[role] = { email, token: (await login.json()).token };
    }
    const shortOrigin = origin.replace("localhost", "127.0.0.1"), target = "https://192.0.2.1/public-grants-fixture";
    const claim = { address: "browser-grants.example.invalid" }, headers = { ...json, Cookie: "token=" + accounts.owner.token };
    const challenge = await fixture.request.post(origin + "/api/domains", { headers, data: claim });
    assert.equal(challenge.status(), 409);
    const proof = (await challenge.json()).verification;
    const claimed = await fixture.request.post(origin + "/api/domains", { headers, data: { ...claim, proof: proof.proof || proof.token } });
    assert.equal(claimed.status(), 200, await claimed.text()); const domain = await claimed.json();
    for (const locale of ["en", "fr", "es"]) for (const theme of ["light", "dark"]) {
      const catalog = require("../locales/" + locale + ".json"), t = key => catalog[key];
      const protectedResponse = await fixture.request.post(origin + "/api/links", {
        headers: { ...json, Cookie: "token=" + accounts.owner.token },
        data: { customurl: `protected-${locale}-${theme}`, target, password: "synthetic-link-password" }
      });
      assert.equal(protectedResponse.status(), 201);
      const protectedLink = await protectedResponse.json();
      const customProtectedResponse = await fixture.request.post(origin + "/api/links", {
        headers: { ...json, Cookie: "token=" + accounts.owner.token },
        data: { customurl: `protected-${locale}-${theme}`, domain: domain.address, target, password: "synthetic-link-password" }
      });
      assert.equal(customProtectedResponse.status(), 201);
      const customProtected = await customProtectedResponse.json();
      const publicLinks = [{ origin: shortOrigin, ...protectedLink },
        { origin: "http://" + domain.address, ...customProtected }, { origin: "http://www." + domain.address, ...customProtected }];
      const context = await browser.newContext({ locale, colorScheme: theme });
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await context.addCookies([{ name: "token", value: accounts.owner.token, url: origin }]);
      const page = await context.newPage(), errors = [], violations = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => { window.cspViolations = []; document.addEventListener("securitypolicyviolation", event => window.cspViolations.push(event.violatedDirective)); });
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(origin + "/settings/domain-sharing/" + domain.id);
      await page.getByLabel(t("domain_grants.recipient"), { exact: true }).fill(accounts.recipient.email);
      await page.getByRole("button", { name: t("domain_grants.grant"), exact: true }).focus();
      await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);
      assert.equal(await page.locator(".grant-list li").count(), 1);
      assert((await page.locator(".grant-list").innerText()).includes(accounts.recipient.email));
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 1000 }); await page.reload();
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
        assert(await page.getByRole("heading", { name: t("domain_grants.title"), exact: true }).isVisible());
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const heading = await page.locator(".domain-grants header").boundingBox(), nav = await page.locator(".domain-grants > nav").boundingBox();
        const domainHeading = await page.locator(".domain-grants h2").boundingBox(), form = await page.locator(".grant-form").boundingBox();
        assert(nav.y >= heading.y + heading.height - 1 && domainHeading.y >= nav.y + nav.height - 1 && form.y >= domainHeading.y + domainHeading.height - 1, "Heading, navigation and form must not overlap");
        assert(form.height < 180, "No inherited shortener flex basis gap");
        const boxes = await page.locator(".domain-grants h1, .domain-grants h2, .domain-grants input[type=email], .domain-grants button").evaluateAll(nodes => nodes.map(node => {
          const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height, scroll: node.scrollWidth, client: node.clientWidth };
        }));
        for (const box of boxes) { assert(box.left >= 0 && box.right <= width + 1); assert(box.scroll <= box.client + 1); }
        assert.equal(await page.locator(".grant-list form").count(), 1);
        const label = await page.locator(".grant-list li > div").boundingBox(), button = await page.locator(".grant-list button").boundingBox();
        assert(label.y + label.height <= button.y + 1 || label.x + label.width <= button.x + 1, "Recipient and revoke button must not overlap");
        violations.push(...await page.evaluate(() => window.cspViolations));
        await page.screenshot({ path: path.join(evidence, `${locale}-${theme}-${width}.png`), fullPage: true });
      }
      const recipient = await browser.newContext({ locale, colorScheme: theme });
      await recipient.route("**/*", route => {
        const url = route.request().url();
        if (url === target) return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Synthetic landing</title>Fixture" });
        return [origin, ...publicLinks.map(link => link.origin)].includes(new URL(url).origin) ? route.continue() : route.abort();
      });
      await recipient.addCookies([{ name: "token", value: accounts.recipient.token, url: origin }]);
      const recipientPage = await recipient.newPage();
      await recipientPage.goto(origin + "/settings/domain-sharing");
      assert((await recipientPage.locator("main").innerText()).includes(domain.address));
      assert.equal(await recipientPage.locator(".grant-list form").count(), 0);
      await recipientPage.goto(origin + "/");
      assert.equal(await recipientPage.locator('#domain option[value="' + domain.address + '"]').count(), 1);
      const recipientLink = await recipient.request.post(origin + "/api/links", { headers: json,
        data: { customurl: `recipient-${locale}-${theme}`, domain: domain.address, target } });
      assert.equal(recipientLink.status(), 201);
      await page.getByRole("button", { name: t("domain_grants.revoke_for").replace("{{email}}", accounts.recipient.email), exact: true }).focus();
      await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);
      assert((await page.locator(".grant-list").innerText()).includes(t("domain_grants.empty")));
      await recipientPage.reload();
      assert.equal(await recipientPage.locator('#domain option[value="' + domain.address + '"]').count(), 0);
      const reportResponse = recipientPage.waitForResponse(response => new URL(response.url()).pathname === "/api/analytics");
      await recipientPage.goto(origin + "/settings/analytics?domain=" + domain.id);
      const report = await reportResponse; assert.equal(report.status(), 200);
      assert((await report.json()).matched_links > 0);
      await recipientPage.locator('select[name="domain"] option[value="' + domain.id + '"]').waitFor({ state: "attached" });
      assert(!(await recipient.cookies(origin.replace("localhost", "127.0.0.1"))).some(cookie => cookie.name === "token"));
      const publicPage = await recipient.newPage();
      publicPage.on("pageerror", error => errors.push(error.message));
      await publicPage.addInitScript(() => { window.cspViolations = []; document.addEventListener("securitypolicyviolation", event => window.cspViolations.push(event.violatedDirective)); });
      for (const publicLink of publicLinks) for (const width of [320, 390, 1440]) {
        await publicPage.setViewportSize({ width, height: 1000 });
        await publicPage.goto(publicLink.origin + "/" + publicLink.address);
        await publicPage.evaluate(() => document.fonts.ready);
        assert.equal(await publicPage.evaluate(() => typeof window.htmx?.ajax), "function", "Short-host HTMX assets must load");
        assert.equal(await publicPage.locator('a[href="/login"]').count(), 0);
        assert(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        violations.push(...await publicPage.evaluate(() => window.cspViolations));
        await publicPage.screenshot({ path: path.join(evidence, `${locale}-${theme}-${width}-protected-${new URL(publicLink.origin).hostname}.png`), fullPage: true });
        await publicPage.locator('#protected-link-password').fill("synthetic-link-password");
        const submitted = publicPage.waitForResponse(response => response.url() === publicLink.origin + "/api/links/" + publicLink.id + "/protected");
        await publicPage.locator('#protected-link-password').press("Enter");
        const response = await submitted;
        assert.equal(response.status(), 200); assert.equal(response.request().headers().origin, publicLink.origin);
        assert(!response.request().headers().cookie?.includes("token="));
        await publicPage.waitForURL(target);
      }
      assert.deepEqual(errors, []); assert.deepEqual(violations, []);
      await recipient.close(); await context.close();
      console.log("PASS: grants native keyboard flow, ownership selectors, revoke, host-only cookies, public protected forms and enforced CSP " + locale + "/" + theme + " 320/390/1440");
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
