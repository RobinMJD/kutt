const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { locale, t } = require("./browser-locale.cjs");

(async () => {
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1");
  const origin = process.env.KUTT_TEST_URL, evidence = process.env.KUTT_EVIDENCE_DIR, container = process.env.KUTT_BROWSER_CONTAINER;
  assert.equal(new URL(origin).hostname, "127.0.0.1"); assert(/^[a-f0-9]{64}$/.test(container));
  assert(evidence); mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true }); let page;
  const errors = [], external = []; let requests = 0, layouts = 0;
  try {
    const context = await browser.newContext({ locale, reducedMotion: "reduce" });
    const headers = { Accept: "application/json" };
    const admin = await context.request.post(origin + "/api/auth/create-admin", { headers, data: { email: "geography-browser@example.invalid", password: randomBytes(32).toString("hex") } });
    assert.equal(admin.status(), 201, "Fresh fixture required");
    await context.addCookies([{ name: "token", value: (await admin.json()).token, url: origin }]);
    const created = await context.request.post(origin + "/api/links", { headers, data: { target: "https://192.0.2.1/geography", customurl: "geography-fixture" } });
    assert.equal(created.status(), 201); const link = await created.json();
    // Only the wrapper-owned tmpfs database is seeded; no test-only application endpoint is exposed.
    const dbScript = `const assert=require("node:assert/strict"); assert.equal(process.env.DB_FILENAME,"/tmp/kutt-browser-geography.sqlite"); const db=new(require("better-sqlite3"))(process.env.DB_FILENAME); const link=db.prepare("SELECT * FROM links WHERE uuid=?").get(process.argv[1]); assert.equal(link.address,"geography-fixture");`;
    const database = script => execFileSync("docker", ["exec", container, "node", "-e", dbScript + script + ";db.close()", link.id], { encoding: "utf8" }).trim();
    database(`db.prepare("INSERT INTO visits(link_id,user_id,created_at,total,countries,referrers) VALUES(?,?,?,?,?,?)").run(link.id,link.user_id,"2024-01-01 12:00:00",20,JSON.stringify({FR:10,ES:4,US:3,unknown:2,SG:1}),"{}")`);
    const snapshot = () => database(`console.log(JSON.stringify({counter:link.visit_count,visits:db.prepare("SELECT * FROM visits WHERE link_id=?").all(link.id)}))`);
    const before = snapshot();
    const params = new URLSearchParams({ start: "2024-01-01", end: "2024-01-01", link: link.id, q: "geography", domain: "default" });
    const reportURL = origin + "/settings/analytics?" + params;
    const response = await context.request.get(origin + "/api/analytics?" + params); assert.equal(response.status(), 200); const baseline = await response.json();
    page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (["error", "warning"].includes(message.type()) && !/Failed to load resource.*403/.test(message.text())) errors.push(message.text()); });
    page.on("request", request => {
      if (new URL(request.url()).origin !== origin) external.push(request.url());
      if (new URL(request.url()).pathname === "/api/analytics") requests++;
    });
    const region = code => new Intl.DisplayNames(locale, { type: "region" }).of(code);
    const percent = n => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(n);
    const detail = (code, visits) => t("geography.details_other", { country: region(code), visits: String(visits), share: percent(visits / 20) });
    const ready = async () => page.waitForFunction(() => !document.querySelector("#analytics-report").hidden && !document.querySelector('#analytics-filters button[type="submit"]').disabled);
    const formState = () => page.locator("#analytics-filters").evaluate(form => [...new FormData(form)]);
    const shot = async name => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + " overflow");
      await page.locator("#analytics-geography").screenshot({ path: path.join(evidence, name + ".png"), animations: "disabled" });
    };
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ["light", "dark"]) {
        await page.goto(reportURL); await ready();
        assert.equal(new URL(page.url()).pathname, "/settings/analytics"); assert((await page.title()).includes(t("ui.analytics")));
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        await page.getByRole("radio", { name: t("theme." + mode), exact: true }).check();
        assert.equal(await page.locator("html").getAttribute("data-theme"), mode);
        const geography = page.locator("#analytics-geography"), select = page.locator("#geography-country"), details = page.locator("#geography-details");
        const basis = page.locator("#geography-basis");
        assert.equal(await basis.textContent(), t("geography.basis"));
        assert.equal(await select.getAttribute("aria-describedby"), "geography-basis");
        assert(await basis.evaluate(node => {
          const box = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
          return [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1);
        }), "The full localized denominator text wraps inside its visible container");
        assert.equal(await geography.getByRole("button").count(), 177);
        const shape = await geography.locator("svg").evaluate(svg => ({ box: svg.getBBox().width, visible: [...svg.querySelectorAll("path")].filter(path => path.getBBox().width > 0 && path.getBBox().height > 0 && getComputedStyle(path).fill !== "none").length }));
        assert(shape.box > 900 && shape.visible === 177, "Nonblank SVG geometry");
        const colors = await geography.locator("svg").evaluate(svg => ["fr", "es", "de"].map(code => getComputedStyle(svg.querySelector(`[data-country=${code}]`)).fill));
        assert.equal(new Set(colors).size, 3, "Recorded countries and zero counts have distinct fills");
        assert.equal(await geography.locator('[data-country="fr"]').getAttribute("data-level"), "3");
        const initialRequests = requests, state = await formState(), url = page.url();
        await select.selectOption("FR"); assert.equal(await details.textContent(), detail("FR", 10));
        assert.equal(await geography.locator('[data-country="fr"]').getAttribute("aria-pressed"), "true");
        await select.focus(); await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement.dataset.country), "fr", "One map tab stop follows the native selector: " + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 300)));
        await page.keyboard.press("ArrowRight");
        const focused = await page.evaluate(() => document.activeElement.dataset.country.toUpperCase());
        assert.notEqual(focused, "FR"); assert((await details.textContent()).includes(region(focused)));
        await page.keyboard.press("Enter"); assert.equal(await select.inputValue(), focused);
        await page.keyboard.press("Home"); const first = await select.locator("option").nth(1).getAttribute("value");
        assert.equal(await page.evaluate(() => document.activeElement.dataset.country.toUpperCase()), first);
        await page.keyboard.press("End"); const last = await select.locator("option").last().getAttribute("value");
        await page.keyboard.press(" "); assert.equal(await select.inputValue(), last);
        await page.keyboard.press("Escape"); assert.equal(await select.inputValue(), "");
        assert.equal(await geography.locator('[tabindex="0"]').count(), 1);
        await geography.locator('[data-country="es"]').click(); assert.equal(await select.inputValue(), "ES");
        assert.equal(await details.textContent(), detail("ES", 4));
        await geography.locator('[data-country="de"]').hover(); assert((await details.textContent()).includes(region("DE")));
        await geography.locator("h2").hover(); assert.equal(await details.textContent(), detail("ES", 4));
        await select.selectOption("MT"); assert((await details.textContent()).includes(region("MT")), "Tiny countries remain reachable");
        await select.selectOption("FR");
        await select.focus();
        assert.deepEqual(await formState(), state); assert.equal(page.url(), url); assert.equal(requests, initialRequests, "Details never refetch or filter analytics");
        const countries = page.locator('[data-table="country"]');
        assert.equal(await countries.getByRole("columnheader").count(), 3);
        assert((await countries.getByRole("row", { name: new RegExp(region("SG")) }).textContent()).includes(percent(.05)));
        assert((await countries.innerText()).includes(t("ui.unknown")));
        assert.equal(await page.locator("#geography-unmapped").textContent(), t("geography.unmapped_other", { visits: "3" }));
        await shot(locale + "-" + width + "-" + mode); layouts++;
        await geography.getByRole("link", { name: t("geography.table"), exact: true }).click();
        assert.equal(await page.evaluate(() => document.activeElement.id), "analytics-country-table");
        assert.deepEqual(await formState(), state); assert.equal(new URL(page.url()).search, new URL(url).search);
      }
    }
    // A late response must be ignored even when aborting its transport is ineffective.
    await page.goto(reportURL); await ready();
    await page.evaluate(() => {
      window.originalGeographyFetch = window.fetch;
      window.fetch = async (url, options) => {
        const slow = String(url).includes("q=missing-geography");
        const response = await window.originalGeographyFetch(url, slow ? { ...options, signal: undefined } : options);
        if (slow) await new Promise(resolve => setTimeout(resolve, 600));
        return response;
      };
    });
    await page.locator('[name="q"]').fill("missing-geography");
    await page.locator("#analytics-filters").evaluate(form => form.requestSubmit());
    await page.locator('[name="q"]').fill("geography");
    await page.locator("#analytics-filters").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await ready(); await page.waitForTimeout(800);
    assert.equal(await page.locator("#analytics-total").textContent(), "20");
    await page.locator("#geography-country").selectOption("FR"); assert.equal(await page.locator("#geography-details").textContent(), detail("FR", 10));
    await page.evaluate(() => { window.fetch = window.originalGeographyFetch; delete window.originalGeographyFetch; });
    await page.locator('[name="start"]').fill("2023-01-01"); await page.locator('[name="end"]').fill("2023-01-01");
    await page.getByRole("button", { name: t("ui.apply"), exact: true }).click(); await ready();
    assert.equal(await page.locator('[data-table="country"]').innerText(), t("ui.no_visits"));
    assert.equal(await page.locator('.geography-map path:not([data-level="0"])').count(), 0);
    assert((await page.locator("#geography-details").textContent()).includes(t("geography.share_unavailable")));
    await shot(locale + "-empty");
    const hostile = '<img src=x onerror="window.geographyInjected=1">';
    let mocked = { ...baseline, total: 1, stats: { ...baseline.stats, country: [...baseline.stats.country, { name: hostile, visits: 1 }] } };
    await page.route("**/api/analytics?*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mocked) }));
    await page.goto(reportURL); await ready();
    assert.equal(await page.locator('img[onerror]').count(), 0); assert.equal(await page.evaluate(() => window.geographyInjected || false), false);
    assert((await page.locator('[data-table="country"]').innerText()).includes(t("geography.share_unavailable")));
    const many = new Intl.DisplayNames(locale, { type: "region" });
    const codes = require("../server/utils/map.json").layers.slice(0, 25).map(row => row.id.toUpperCase());
    mocked = { ...baseline, total: 25, stats: { ...baseline.stats, country: codes.map(name => ({ name, visits: 1 })) } };
    await page.getByRole("button", { name: t("ui.apply"), exact: true }).click(); await ready();
    const countries = page.locator('[data-table="country"]'), countBefore = requests;
    assert.equal(await countries.locator("tbody tr").count(), 20);
    await countries.getByRole("button", { name: t("ui.next"), exact: true }).click();
    assert.equal(await countries.locator("tbody tr").count(), 5); assert((await countries.innerText()).includes(many.of(codes[24])));
    assert.equal(requests, countBefore); await countries.getByRole("button", { name: t("ui.previous"), exact: true }).click();
    await page.unroute("**/api/analytics?*");
    await page.route("**/api/analytics?*", route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Test authorization denied" }) }));
    await page.getByRole("button", { name: t("ui.apply"), exact: true }).click();
    await page.getByText("Test authorization denied", { exact: true }).waitFor();
    assert(await page.locator("#analytics-report").isHidden()); assert.equal(await page.locator("#analytics-json").getAttribute("href"), null);
    await page.unroute("**/api/analytics?*");
    await page.getByRole("button", { name: t("ui.apply"), exact: true }).click(); await ready();
    assert.equal(await page.locator("#analytics-total").textContent(), "20");
    assert.equal(snapshot(), before, "All browsing, selections, assets and report requests add zero analytics");
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log(`PASS (${locale}): ${layouts} light/dark 1440/390/320px geography layouts, SVG, pointer/native/keyboard details, report shares, unknowns, table pages, filters, stale/empty/error/retry, hostile text, zero external requests and zero analytics writes`);
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(evidence, "failure.png"), fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
