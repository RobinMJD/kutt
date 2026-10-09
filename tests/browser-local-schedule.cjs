const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  assert.equal(process.env.KUTT_BROWSER_DISPOSABLE, "1");
  const origin = process.env.KUTT_TEST_URL, evidence = process.env.KUTT_EVIDENCE_DIR;
  assert.equal(new URL(origin).hostname, "127.0.0.1"); assert(evidence);
  mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true }), errors = [], results = [];
  let page;
  try {
    const setup = await browser.newContext(), headers = { Accept: "application/json" };
    const response = await setup.request.post(origin + "/api/auth/create-admin", {
      headers, data: { email: "local-schedule@example.invalid", password: randomBytes(32).toString("hex") }
    });
    assert.equal(response.status(), 201, "Refuse initialized instances");
    const token = (await response.json()).token;
    for (const [locale, zone] of [["en", "America/New_York"], ["fr", "Europe/Paris"], ["es", "Asia/Kathmandu"]]) {
      const t = key => require("../locales/" + locale + ".json")[key];
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ locale, colorScheme: theme, timezoneId: zone });
        await context.addCookies([{ name: "token", value: token, url: origin }]);
        page = await context.newPage(); page.setDefaultTimeout(10000);
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          const alias = `local-${locale}-${theme}-${width}`;
          const created = await context.request.post(origin + "/api/links", { headers,
            data: { target: "https://192.0.2.1/local", customurl: alias, expire_in: "2 days" } });
          assert.equal(created.status(), 201); const link = await created.json();
          const loaded = await page.goto(origin); assert(loaded.headers()["content-security-policy"]);
          const row = page.locator(`#tr-${link.id}`); await row.locator("button.edit").click();
          const form = page.locator(`#lifecycle-${link.id}`), endpoint = origin + "/api/links/" + link.id + "/lifecycle";
          await form.waitFor();
          assert.equal(await page.locator(`#edit-form-${link.id} [name="expire_in"]`).count(), 0);
          assert.equal(await form.locator('[name="clear_expiry"]').count(), 0);
          assert.equal(await form.locator('[name="ends_at"]').inputValue(), link.expire_in, "Legacy expiry prepopulates End");
          const field = name => form.locator(`[data-date-time]`).filter({ has: page.locator(`[name="${name}"]`) });
          const pick = async (name, wall) => {
            const control = field(name); await control.locator('[data-date-time-display]').click();
            const dialog = control.locator("dialog"); await dialog.waitFor({ state: "visible" });
            await dialog.locator('[type="date"]').fill(wall.slice(0, 10));
            await dialog.locator('[type="time"]').fill(wall.slice(11));
            await dialog.locator('[data-date-time-apply]').click();
            await dialog.waitFor({ state: "hidden" });
            assert.equal(await control.locator('[data-date-time-display]').inputValue(), wall.replace("T", " "));
            const expected = await page.evaluate(value => new Date(value).toISOString(), wall);
            assert.equal(await form.locator(`[name="${name}"]`).inputValue(), expected);
            return expected;
          };
          await pick("starts_at", "2080-05-31T12:30:15");
          const end = await pick("ends_at", "2080-06-01T18:45:59");
          await form.locator('[name="paused"]').check();
          const editor = page.locator(`#edit-form-${link.id}`);
          await editor.locator('[name="description"]').fill("Independent draft");
          const save = async () => {
            const result = page.waitForResponse(r => r.url() === endpoint && r.request().method() === "PATCH");
            await form.locator('[type="submit"]').click(); assert.equal((await result).status(), 200);
            await page.waitForFunction(() => !document.querySelector(".htmx-request, .htmx-settling"));
          };
          await save(); await form.locator(".success").waitFor();
          assert.equal(await editor.locator('[name="description"]').inputValue(), "Independent draft", "Availability saves retain the other form's draft");
          const descriptionSave = page.waitForResponse(r => r.url() === origin + "/api/links/" + link.id && r.request().method() === "PATCH");
          await editor.locator('[type="submit"]').click(); await descriptionSave;
          await page.waitForFunction(() => !document.querySelector(".htmx-request, .htmx-settling"));
          let persisted = await context.request.get(origin + "/api/links", { headers });
          let current = (await persisted.json()).data.find(item => item.id === link.id);
          assert.equal(current.ends_at, end); assert.equal(current.expire_in, null); assert.equal(current.paused, true);
          await page.reload(); await row.locator("button.edit").click(); await form.waitFor();
          assert.equal(await field("ends_at").locator('[data-date-time-display]').inputValue(), "2080-06-01 18:45:59");
          const box = await form.locator(".lifecycle-checkbox").evaluate(label => {
            const input = label.querySelector("input").getBoundingClientRect(), text = label.querySelector("span").getBoundingClientRect();
            return { difference: Math.abs(input.y + input.height / 2 - text.y - text.height / 2), before: input.right <= text.left };
          });
          assert(box.difference < 2 && box.before, "Paused checkbox and text must share a baseline");
          // Dates are visible in full, and open calendars cannot overflow mobile.
          for (const name of ["starts_at", "ends_at"]) {
            assert(await field(name).locator('[data-date-time-display]').evaluate(node => {
              const canvas = document.createElement("canvas"), c = canvas.getContext("2d"), s = getComputedStyle(node); c.font = s.font;
              return c.measureText(node.value).width <= node.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
            }), "Date, time and seconds fit");
          }
          await form.scrollIntoViewIfNeeded();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.screenshot({ path: path.join(evidence, `${locale}-${theme}-${width}.png`), fullPage: true });
          await field("ends_at").locator('[data-date-time-display]').click();
          const dialog = field("ends_at").locator("dialog");
          const rect = await dialog.boundingBox(); assert(rect.x >= 0 && rect.x + rect.width <= width + 1);
          await page.screenshot({ path: path.join(evidence, `${locale}-${theme}-${width}-picker.png`) });
          await dialog.locator('[data-date-time-cancel]').click();
          // Concurrent policy changes conflict, keep the draft, then permit review/retry.
          await context.request.patch(endpoint, { headers, data: { max_visits: 77 } });
          await save(); await form.locator(".response .error").waitFor();
          assert.equal(await field("ends_at").locator('[data-date-time-display]').inputValue(), "2080-06-01 18:45:59");
          await save(); await form.locator(".success").waitFor();
          for (const name of ["starts_at", "ends_at"]) {
            await field(name).locator('[data-date-time-display]').click();
            await field(name).locator('[data-date-time-clear]').click();
          }
          await form.locator('[name="paused"]').uncheck(); await save();
          assert.equal((await context.request.get(origin + "/" + alias, { maxRedirects: 0 })).status(), 302);
          // Public clicks are not changes to the policy snapshot.
          await save(); await form.locator(".success").waitFor();
          if (locale === "en" && theme === "light" && width === 1440) {
            await field("ends_at").locator('[data-date-time-display]').click();
            await dialog.locator('[type="date"]').fill("2030-03-10");
            await dialog.locator('[type="time"]').fill("02:30:15");
            await dialog.locator('[data-date-time-apply]').click();
            assert.equal(await dialog.locator('[role="alert"]').innerText(), t("schedule.invalid"), "Reject nonexistent spring DST time");
            await dialog.locator('[data-date-time-cancel]').click();
            await context.request.patch(endpoint, { headers, data: { ends_at: "2030-11-03T06:30:15Z" } });
            await page.reload(); await row.locator("button.edit").click(); await form.waitFor();
            await field("ends_at").locator('[data-date-time-display]').click();
            await dialog.locator('[data-date-time-apply]').click();
            assert.equal(await form.locator('[name="ends_at"]').inputValue(), "2030-11-03T06:30:15.000Z", "Keep second occurrence of unchanged DST fold");
            await save(); await form.locator(".success").waitFor();
          }
          results.push({ locale, zone, theme, width, localConversion: true, clearing: true, conflict: true });
        }
        await context.close();
      }
    }
    assert.deepEqual(errors, []); writeFileSync(path.join(evidence, "receipt.json"), JSON.stringify({ results, errors }, null, 2));
    console.log("PASS: 18 local schedule workflows, EN/FR/ES, three zones, light/dark, desktop/mobile, exact seconds, DST, stale saves, clearing, public redirects and CSP");
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(evidence, "failure.png"), fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
