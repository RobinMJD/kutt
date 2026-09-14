const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1");
  const origin = process.env.KUTT_TEST_URL;
  assert(origin && new URL(origin).hostname === "127.0.0.1", "Use a fresh loopback-only instance");
  const evidence = process.env.KUTT_EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "kutt-library-ui-"));
  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    const context = await browser.newContext();
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await context.request.get(origin + "/api/health")).status() === 200) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const headers = { Accept: "application/json" };
    const account = { email: "browser-library@example.invalid", password: randomBytes(32).toString("hex") };
    const bootstrap = await context.request.post(origin + "/api/auth/create-admin", { data: account, headers });
    assert.equal(bootstrap.status(), 201, "Refuse initialized instances");
    await context.addCookies([{ name: "token", value: (await bootstrap.json()).token, url: origin }]);
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("dialog", dialog => dialog.accept());
    const submit = async button => {
      const response = page.waitForResponse(row => row.url().endsWith("/settings/library") && row.request().method() === "POST");
      await button.click();
      const result = await response;
      if (result.status() !== 303) {
        const headers = result.request().headers();
        console.log({ status: result.status(), origin: headers.origin, site: headers["sec-fetch-site"] });
      }
      assert.equal(result.status(), 303);
      await page.waitForLoadState("networkidle");
    };
    const manage = async () => { await page.locator(".library-manage").evaluate(element => { element.open = true; }); };
    const select = async address => { await page.getByRole("checkbox", { name: "Select " + address, exact: true }).check(); };
    const action = async (value, label) => {
      await page.locator("#library-action").selectOption(value);
      if (label) await page.locator('#library-label-field select').selectOption({ label });
      await submit(page.getByRole("button", { name: "Apply", exact: true }));
    };
    for (const [mode, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
      await page.setViewportSize({ width, height });
      const address = "library-ui-" + mode;
      const link = await context.request.post(origin + "/api/links", { headers, data: {
        target: "https://192.0.2.1/" + "long-path-".repeat(20), customurl: address
      } });
      assert.equal(link.status(), 201);
      await page.goto(origin);
      await page.getByRole("link", { name: "Library", exact: true }).click();
      await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
      assert((await page.title()).includes("Library"));
      const tagName = "Research documents " + mode;
      const collectionName = "Collection-" + "long-name-".repeat(5) + mode;
      for (const [kind, name] of [["tag", tagName], ["collection", collectionName]]) {
        await manage();
        const form = page.getByRole("form", { name: "Create label", exact: true });
        await form.getByLabel("Kind", { exact: true }).selectOption(kind);
        await form.getByLabel("Name", { exact: true }).fill(name);
        await submit(form.getByRole("button", { name: "Create", exact: true }));
        await select(address);
        await action("add_label", `${kind}: ${name}`);
      }
      const filter = page.getByRole("form", { name: "Filter links", exact: true });
      await filter.getByLabel("Tag", { exact: true }).selectOption({ label: tagName });
      await filter.getByLabel("Collection", { exact: true }).selectOption({ label: collectionName });
      await filter.getByRole("button", { name: "Filter", exact: true }).click();
      await page.waitForLoadState("networkidle");
      assert.equal(await page.locator('.library-links input[name="ids"]').count(), 1);
      await manage();
      const save = page.getByRole("form", { name: "Save current filter", exact: true });
      await save.getByLabel("Filter name", { exact: true }).fill("Queue " + mode);
      await submit(save.getByRole("button", { name: "Save filter", exact: true }));
      await page.getByRole("link", { name: "Clear", exact: true }).click();
      await page.getByRole("navigation", { name: "Saved filters", exact: true }).getByRole("link", { name: "Queue " + mode, exact: true }).click();
      await page.waitForLoadState("networkidle");
      assert.equal(await page.locator('.library-links input[name="ids"]').count(), 1);
      await page.getByRole("checkbox", { name: "Select page", exact: true }).check();
      assert.equal(await page.locator("#library-selection").textContent(), "1 selected");
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), mode + " library overflow");
      await page.screenshot({ path: path.join(evidence, `library-${mode}.png`), fullPage: true });
      await action("pause");
      assert.equal((await context.request.get(origin + "/" + address, { maxRedirects: 0 })).status(), 410);
      await select(address);
      await action("resume");
      assert.equal((await context.request.get(origin + "/" + address, { maxRedirects: 0 })).status(), 302);
      await manage();
      const edit = page.getByRole("form", { name: "Edit tag " + tagName, exact: true });
      await edit.getByRole("textbox").fill("Renamed " + mode);
      await submit(edit.getByRole("button", { name: "Save name", exact: true }));
      assert.equal(await page.locator(".library-label-tag").textContent(), "Renamed " + mode);
      await manage();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), mode + " management overflow");
      await page.screenshot({ path: path.join(evidence, `library-manage-${mode}.png`), fullPage: true });
      await select(address);
      await action("trash");
      await page.getByText("No matching links.", { exact: true }).waitFor();
      assert.equal((await context.request.get(origin + "/" + address, { maxRedirects: 0 })).status(), 410);
      await manage();
      await page.locator(".library-filter-edit").filter({ has: page.locator("summary", { hasText: "Queue " + mode }) }).locator("summary").click();
      const editFilter = page.getByRole("form", { name: "Edit filter Queue " + mode, exact: true });
      await editFilter.getByRole("textbox").fill("Archived queue " + mode);
      await submit(editFilter.getByRole("button", { name: "Save name", exact: true }));
      await manage();
      await page.locator(".library-filter-edit").filter({ has: page.locator("summary", { hasText: "Archived queue " + mode }) }).locator("summary").click();
      await submit(page.getByRole("form", { name: "Edit filter Archived queue " + mode, exact: true }).getByRole("button", { name: "Remove saved filter", exact: true }));
      await manage();
      await submit(page.getByRole("form", { name: "Edit collection " + collectionName, exact: true }).getByRole("button", { name: "Remove label", exact: true }));
      await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
      assert(!page.url().includes("collection="), "Removing a selected label clears only that filter");
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: desktop/mobile library, labels, collection, saved filter, bulk selection, pause/resume, rename, trash, long-content layout; ${evidence}`);
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(evidence, "library-failure.png"), fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
