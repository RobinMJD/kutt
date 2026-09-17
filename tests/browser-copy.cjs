const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdirSync, mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1");
  const origin = process.env.KUTT_TEST_URL;
  assert(origin && new URL(origin).hostname === "127.0.0.1", "Use a fresh loopback fixture");
  const evidence = process.env.KUTT_EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "kutt-copy-ui-"));
  mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await context.request.get(origin + "/api/health")).status() === 200; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready);
    const headers = { Accept: "application/json" };
    const bootstrap = await context.request.post(origin + "/api/auth/create-admin", {
      data: { email: "copy-ui@example.invalid", password: randomBytes(32).toString("hex") }, headers
    });
    assert.equal(bootstrap.status(), 201, "Refuse initialized instances");
    await context.addCookies([{ name: "token", value: (await bootstrap.json()).token, url: origin }]);
    const page = await context.newPage(), errors = [], consoleErrors = [];
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const override = async mode => page.evaluate(mode => {
      window.copyCalls = 0;
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: mode === "missing" ? undefined : {
        writeText(value) {
          window.copyCalls++; window.copiedValue = value;
          if (mode === "pending") return new Promise((resolve, reject) => { window.finishCopy = { resolve, reject }; });
          if (mode === "reject") return Promise.reject(new DOMException("Denied", "NotAllowedError"));
          return Promise.resolve();
        }
      } });
    }, mode);
    const exercise = async (host, button, shot) => {
      await page.waitForFunction(() => !document.querySelector(".htmx-request, .htmx-swapping, .htmx-settling"));
      await page.evaluate(async () => { for (const animation of document.body.getAnimations({ subtree: true })) await animation.finished.catch(() => {}); });
      const value = await button.getAttribute("data-url"); assert(value);
      await override("reject"); await button.focus(); await button.press("Enter");
      const fallback = host.getByLabel("Value to copy", { exact: true });
      try { await fallback.waitFor({ state: "visible" }); }
      catch (error) {
        console.error("Copy diagnostic", { errors, consoleErrors, state: await host.evaluate(el => ({ handler: typeof handleShortURLCopyLink, feedback: el.querySelector(".copy-feedback")?.textContent, calls: window.copyCalls, host: el.hasAttribute("data-copy-container") })) });
        throw error;
      }
      assert.equal(await fallback.inputValue(), value);
      assert(await fallback.evaluate(el => el.readOnly && el === document.activeElement && el.selectionEnd === el.value.length));
      assert.equal(await host.locator(".clipboard.copied").count(), 0);
      assert.match(await host.getByRole("status").textContent(), /Copy failed/);
      assert(!(await host.getByRole("status").textContent()).includes(value));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (shot) await page.screenshot({ path: path.join(evidence, shot), fullPage: true });
      await override("missing"); await button.focus(); await button.press("Enter");
      assert(await fallback.isVisible());
      await override("pending"); await button.focus(); await button.press("Enter");
      assert.equal(await host.getByRole("status").textContent(), "Copying...");
      assert.equal(await host.locator(".clipboard.copied").count(), 0);
      await button.press("Enter"); assert.equal(await page.evaluate(() => window.copyCalls), 1);
      await page.evaluate(() => window.finishCopy.resolve());
      await host.getByRole("status").getByText("Copied.", { exact: true }).waitFor();
      assert(await button.evaluate(el => el === document.activeElement));
      assert(await fallback.isHidden()); assert.equal(await fallback.inputValue(), "");
      assert.equal(await page.evaluate(() => window.copiedValue), value);
      assert.equal(await host.getByRole("status").count(), 1);
      // A delayed denial must not steal focus from unrelated navigation.
      await override("pending"); await button.press("Enter");
      const outside = page.locator("header a").first(); await outside.focus();
      await page.evaluate(() => window.finishCopy.reject(new DOMException("Denied", "NotAllowedError")));
      await fallback.waitFor({ state: "visible" });
      assert(await outside.evaluate(el => el === document.activeElement));
      await override("success"); await button.focus(); await button.press("Enter");
      await host.getByRole("status").getByText("Copied.", { exact: true }).waitFor();
      assert(await fallback.isHidden());
    };
    let personal;
    for (const [mode, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844], ["compact", 320, 720]]) {
      await page.setViewportSize({ width, height }); await page.goto(origin + "/");
      const form = page.locator("#shortener-form");
      await form.getByLabel("Destination URL").fill("https://example.org/copy-" + mode);
      const saved = page.waitForResponse(r => r.url() === origin + "/api/links" && r.request().method() === "POST");
      await form.getByRole("button", { name: "Shorten link", exact: true }).click();
      assert.equal((await saved).status(), 200);
      const top = page.locator("#shorturl");
      await top.locator(".clipboard button").waitFor();
      await exercise(top, top.locator(".clipboard button"), `copy-top-${mode}.png`);
      await exercise(top, top.locator(".link-button"));
      personal = (await (await context.request.get(origin + "/api/links", { headers })).json()).data[0];
      assert(personal);
      for (const admin of [false, true]) {
        await page.goto(origin + (admin ? "/admin" : "/"));
        const host = page.locator("#main-table-wrapper [data-copy-container]").first();
        await host.locator(".clipboard button").waitFor();
        await exercise(host, host.locator(".clipboard button"), `copy-${admin ? "admin" : "row"}-${mode}.png`);
      }
      await page.goto(origin + "/settings");
      await page.locator("#generate-apikey button").click();
      const key = page.locator("#apikey");
      await key.locator(".clipboard button").waitFor();
      await exercise(key, key.locator(".clipboard button"));
      const tokens = page.locator("#tokens-wrapper");
      await tokens.getByLabel("Name", { exact: true }).fill("Copy " + mode);
      await tokens.locator('input[value="links:read"]').check();
      await tokens.getByRole("button", { name: "Create token", exact: true }).click();
      const result = tokens.locator(".token-result");
      await result.getByLabel("New API token", { exact: true }).waitFor();
      await exercise(result, result.getByRole("button", { name: "Copy API token", exact: true }));
    }
    // Workspace and QR have separate handlers; preserve their existing failure paths.
    const space = await context.request.post(origin + "/api/v2/workspaces", { data: { name: "Copy regression" }, headers });
    assert.equal(space.status(), 201); const workspace = await space.json();
    const shared = await context.request.post(origin + `/api/v2/workspaces/${workspace.id}/links`, { data: { target: "https://example.org/shared", address: "copy-shared", paused: true }, headers });
    assert.equal(shared.status(), 201);
    await page.goto(origin + "/settings/workspaces/" + workspace.id);
    await override("reject"); await page.locator("[data-copy]").first().click();
    assert.match(await page.locator("#workspace-notice").textContent(), /Copy failed/);
    await override("success"); await page.locator("[data-copy]").first().click();
    assert.match(await page.locator("#workspace-notice").textContent(), /Short link copied/);
    await page.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async () => { throw new DOMException("Denied", "NotAllowedError"); } } }); });
    await page.goto(origin + "/link/qr/" + personal.id);
    await page.locator("#qr-copy:not([disabled])").waitFor(); await page.locator("#qr-copy").click();
    await page.getByText("Could not copy image. Retry or download PNG.", { exact: true }).waitFor();
    assert(await page.getByRole("link", { name: "Download PNG", exact: true }).isVisible());
    assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []);
    console.log("PASS: desktop/mobile/compact top, personal/admin row, API key and token copy; confirmed success, denied/missing clipboard, selected fallback, focus, no secret status, duplicate prevention, retry; workspace/QR fallback preserved; no extra permissions");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
