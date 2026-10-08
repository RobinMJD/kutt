const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { locale, t } = require("./browser-locale.cjs");

(async () => {
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1");
  const origin = process.env.KUTT_TEST_URL, evidence = process.env.KUTT_EVIDENCE_DIR;
  assert.equal(new URL(origin).hostname, "127.0.0.1"); assert(evidence);
  mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ locale, reducedMotion: "reduce" });
    const headers = { Accept: "application/json" };
    const setup = await context.request.post(origin + "/api/auth/create-admin", { headers,
      data: { email: "stats-reset-ui@example.invalid", password: randomBytes(32).toString("hex") } });
    assert.equal(setup.status(), 201, "Refuse initialized instances");
    await context.addCookies([{ name: "token", value: (await setup.json()).token, url: origin }]);
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on("pageerror", error => errors.push(error.message));
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36";
    let sequence = 0;
    const visit = async link => {
      assert.equal((await context.request.get(origin + "/" + link.address, { maxRedirects: 0, headers: { "User-Agent": ua } })).status(), 302);
      for (let i = 0; i < 50; i++) {
        const data = await (await context.request.get(origin + "/api/links/" + link.id + "/stats", { headers })).json();
        if (data.visit_count === 1) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.fail("Visit was not recorded");
    };
    for (const width of [1440, 390, 320]) for (const theme of ["light", "dark"]) {
      const created = await context.request.post(origin + "/api/links", { headers,
        data: { customurl: "stats-reset-ui-" + sequence++, target: "https://192.0.2.1/default" } });
      assert.equal(created.status(), 201); const link = await created.json(); await visit(link);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + "/login");
      await page.evaluate(mode => localStorage.setItem("kutt.theme", mode), theme);
      const response = await page.goto(origin + "/stats?id=" + link.id);
      assert.equal(response.status(), 200); assert(response.headers()["content-security-policy"]);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
      const button = page.getByRole("button", { name: t("stats_reset.button"), exact: true });
      await button.waitFor(); assert.equal(await page.locator(".total-number").textContent(), "1");
      let writes = 0;
      const count = request => { if (request.method() === "POST" && request.url().endsWith("/stats/reset")) writes++; };
      page.on("request", count);
      page.once("dialog", dialog => { assert.equal(dialog.message(), t("stats_reset.confirm")); dialog.dismiss(); });
      await button.click(); assert.equal(writes, 0, "Cancel must not send a write");
      assert.equal(await page.locator(".total-number").textContent(), "1");
      // Errors preserve counters and offer a reload, never an automatic retry.
      await page.route("**/stats/reset", route => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: t("stats_reset.conflict") }) }));
      page.once("dialog", dialog => dialog.accept()); await button.click();
      await page.getByRole("status").filter({ hasText: t("stats_reset.conflict") }).waitFor();
      assert.equal(await page.locator(".total-number").textContent(), "1");
      await page.unroute("**/stats/reset");
      page.once("dialog", dialog => dialog.accept());
      await button.focus(); await page.keyboard.press("Enter");
      await page.getByRole("status").filter({ hasText: t("stats_reset.success") }).waitFor();
      assert.equal(await page.locator(".total-number").textContent(), "0");
      assert.equal(writes, 2); page.off("request", count);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal overflow");
      await page.screenshot({ path: path.join(evidence, locale + "-" + width + "-" + theme + ".png"), fullPage: true });
      await visit(link); await page.reload(); await button.waitFor();
      assert.equal(await page.locator(".total-number").textContent(), "1", "New visitor starts a fresh count");
      const chart = await page.locator("canvas.visits[data-period=day]").getAttribute("data-data");
      assert.equal(JSON.parse(chart).reduce((sum, n) => sum + n, 0), 1);
    }
    assert.deepEqual(errors, []);
    console.log("PASS: " + locale + " reset confirmation/cancel, conflict recovery, keyboard submit, refreshed counters/charts, subsequent visit, enforced CSP and light/dark 1440/390/320px; " + evidence);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
