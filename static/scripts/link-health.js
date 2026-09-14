(() => {
  "use strict";
  const page = document.querySelector(".health-page"); if (!page) return;
  const message = document.querySelector("#health-message");
  const states = { disabled: "Monitoring disabled", pending: "Check pending", checking: "Checking destinations", healthy: "Healthy", attention: "Needs attention", stale: "Results out of date", authorization_required: "Review and re-enable monitoring after authorization changed", configuration_invalid: "Repair saved destination rules before checking", results_unavailable: "Results unreadable. Queue a fresh check or disable monitoring." };
  const show = (text, error = false) => { message.textContent = text; message.classList.toggle("error", error); };
  const node = (tag, text, parent) => { const result = document.createElement(tag); result.textContent = text; parent.append(result); return result; };
  async function request(url, method = "GET", body) {
    const response = await fetch(url, { method, credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...(body && { body: JSON.stringify(body) }) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 409 ? "Changed elsewhere. Reload saved monitoring before saving." : value.error || "Request failed (" + response.status + "). Please retry.");
    return value;
  }
  if (page.dataset.healthDashboard) {
    const list = document.querySelector("#health-links"), refresh = document.querySelector("#health-refresh"), more = document.querySelector("#health-more");
    let cursor = null, busy = false;
    async function load(reset) {
      if (busy) return; busy = true; refresh.disabled = more.disabled = true; show("Loading...");
      try {
        const result = await request("/api/v2/links/health" + (!reset && cursor ? "?before=" + encodeURIComponent(cursor) : ""));
        if (reset) list.replaceChildren();
        for (const item of result.data) {
          const row = node("li", "", list), link = node("a", item.link, row); link.href = "/link/health/" + encodeURIComponent(item.id);
          node("p", states[item.state] || "Unknown", row).className = item.state === "healthy" ? "healthy" : "";
          if (item.overdue) node("p", "Check overdue. Inspect the background worker or queue capacity.", row);
          for (const failure of item.results.filter(value => value.code !== "OK")) node("p", failure.name + ": " + failure.action, row);
        }
        cursor = result.next; more.hidden = !cursor;
        show(list.children.length ? "Monitoring refreshed." : "No monitored links. Open a link in Library to configure monitoring.");
      } catch (error) { show(error.message, true); }
      finally { busy = false; refresh.disabled = more.disabled = false; }
    }
    refresh.addEventListener("click", () => load(true)); more.addEventListener("click", () => load(false)); void load(true); return;
  }
  const form = document.querySelector("#health-form"), check = document.querySelector("#health-check"), results = document.querySelector("#health-results");
  const api = "/api/v2/links/" + encodeURIComponent(page.dataset.linkId) + "/health";
  let revision = null, enabled = false, busy = false;
  function lock(value) {
    busy = value;
    form.querySelectorAll("input,button").forEach(item => { item.disabled = value || (revision === null && item.id !== "health-reload"); });
    check.disabled = value || !enabled || revision === null;
  }
  function render(data, replaceForm) {
    revision = data.revision; enabled = data.enabled;
    if (replaceForm) { form.elements.enabled.checked = enabled; form.elements.interval_hours.value = data.interval_hours; }
    document.querySelector("#health-state").textContent = states[data.state] || "Unknown";
    document.querySelector("#health-times").textContent = (data.checked_at ? "Last cycle: " + new Date(data.checked_at).toLocaleString() + ". " : "") +
      (data.next_at ? "Next due: " + new Date(data.next_at).toLocaleString() + ". " : "") + (data.overdue ? "Check overdue. Inspect the worker or queue capacity." : "");
    results.replaceChildren();
    for (const item of data.results) {
      const row = node("li", "", results); node("strong", item.name, row);
      node("p", item.code + (item.http_status ? " (HTTP " + item.http_status + ")" : "") + " | " + item.duration_ms + " ms", row).className = item.code === "OK" ? "healthy" : "error";
      node("p", item.action, row);
    }
    if (!data.results.length) node("li", data.source_changed ? "Destinations changed. Previous results no longer apply." : "No current results.", results);
  }
  async function load() {
    if (busy) return; lock(true); show("Loading...");
    try { render(await request(api), true); show("Saved monitoring loaded."); }
    catch (error) { show(error.message, true); } finally { lock(false); }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (busy || revision === null) return;
    const body = { revision, enabled: form.elements.enabled.checked, interval_hours: Number(form.elements.interval_hours.value) };
    lock(true); show("Saving...");
    try { render(await request(api, "PUT", body), false); show("Monitoring saved."); }
    catch (error) { show(error.message, true); } finally { lock(false); }
  });
  check.addEventListener("click", async () => {
    if (busy || revision === null || !enabled) return; lock(true); show("Queueing...");
    try { render(await request(api + "/check", "POST", { revision }), false); show("Check queued. Refresh to view results."); }
    catch (error) { show(error.message, true); } finally { lock(false); }
  });
  document.querySelector("#health-reload").addEventListener("click", load); void load();
})();
