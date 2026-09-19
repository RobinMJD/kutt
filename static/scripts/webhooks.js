(() => {
  const root = document.querySelector(".integrations-page"); if (!root) return;
  const $ = id => document.getElementById(id), form = $("hook-form");
  let rows = [], editing = null, selected = null, older = null, source = null, after = "0", busy = false, secret = "", deliveryBusy = false, editorOpener = null, validationError = false;
  let secretGeneration = 0, secretCopyPending = false;
  const status = (text, error = false) => { $("integration-status").textContent = text; $("integration-status").className = error ? "integration-error" : ""; };
  function clearFormError() { $("hook-form-error").textContent = ""; $("hook-form-error").hidden = true; validationError = false; }
  const date = value => value ? new Date(value).toLocaleString() : "-";
  async function api(path, method = "GET", body) {
    const response = await fetch("/api/v2/" + path, { method, credentials: "same-origin", cache: "no-store",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const checks = window.KuttResponses;
    if (method === "DELETE") return checks.acknowledgement(response, 204);
    if (path.endsWith("/retry")) return checks.acknowledgement(response, 202, "Accepted");
    const create = path === "webhooks" && method === "POST", rotate = path.endsWith("/rotate"), test = path.endsWith("/test");
    const schema = path === "events" ? checks.events : /\/deliveries(?:\?|$)/.test(path) ? checks.deliveries :
      test ? checks.deliveryQueued : create || rotate ? checks.hookSecret : method === "GET" ? checks.hookList : checks.hook;
    if (response.ok && response.status !== (create ? 201 : test ? 202 : 200)) throw checks.unexpected();
    return checks.read(response, data => schema(data) &&
      (!(method === "PUT" || rotate) || data.revision === body.revision + 1) && (!create || data.revision === 1));
  }
  async function action(run, fromForm = false) {
    if (busy) return; busy = true;
    let errorTarget = null;
    if (fromForm) { clearFormError(); status(""); }
    root.querySelectorAll("button,input").forEach(el => { el.disabled = true; });
    try { await run(); } catch (error) {
      if (fromForm && !$("hook-editor").hidden) {
        errorTarget = $("hook-form-error"); errorTarget.textContent = error.message; errorTarget.hidden = false;
        validationError = error.status === 400 || error.status === 422;
      } else { status(error.message, true); if (fromForm) errorTarget = $("integration-status"); }
    } finally {
      busy = false; root.querySelectorAll("button,input").forEach(el => { el.disabled = false; });
      $("hook-secret-copy").disabled = secretCopyPending || !secret;
      if (errorTarget && (document.activeElement === document.body || form.contains(document.activeElement))) errorTarget.focus();
    }
  }
  function node(tag, text, cls) { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; }
  function button(text, click) { const el = node("button", text); el.type = "button"; el.addEventListener("click", click); return el; }
  function secretStatus(text = "", error = false) {
    $("hook-secret-status").textContent = text;
    $("hook-secret-status").className = error ? "integration-error" : "";
  }
  function hideSecret() {
    secretGeneration++; secretCopyPending = false; secret = "";
    $("hook-secret-value").textContent = ""; $("hook-secret").hidden = true;
    $("hook-secret-copy-label").textContent = "Copy"; $("hook-secret-copy").disabled = true;
    secretStatus();
  }
  function showSecret(value) {
    hideSecret();
    if (value) {
      secret = value; $("hook-secret-value").textContent = value; $("hook-secret").hidden = false;
      $("hook-secret-copy").disabled = busy;
    }
  }
  async function copySecret() {
    if (busy || secretCopyPending || !secret) return;
    const generation = secretGeneration;
    const current = () => root.isConnected && generation === secretGeneration && !$("hook-secret").hidden;
    secretCopyPending = true; $("hook-secret-copy").disabled = true;
    $("hook-secret-copy-label").textContent = "Copying..."; secretStatus("Copying...");
    let timer;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await Promise.race([navigator.clipboard.writeText(secret), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Clipboard timeout")), 3000);
      })]);
      if (current()) { $("hook-secret-copy-label").textContent = "Copied"; secretStatus("Signing secret copied."); }
    } catch {
      if (current()) {
        $("hook-secret-copy-label").textContent = "Copy";
        secretStatus("Copy failed. Select the signing secret above to copy it manually.", true);
      }
    } finally {
      clearTimeout(timer);
      if (current()) { secretCopyPending = false; $("hook-secret-copy").disabled = busy || !secret; }
    }
  }
  function editor(row) {
    if (busy) return;
    editorOpener = document.activeElement; clearFormError(); status("");
    hideSecret(); editing = row || null; form.reset();
    $("hook-editor-title").textContent = row ? "Edit webhook" : "New webhook";
    form.elements.name.value = row?.name || ""; form.elements.url.value = row?.url || "";
    form.elements.enabled.checked = !!row?.enabled;
    form.querySelectorAll("[name=events]").forEach(el => { el.checked = row ? row.events.includes(el.value) : true; });
    $("hook-editor").hidden = false; form.elements.name.focus();
  }
  function config(row) { return { name: row.name, url: row.url, enabled: row.enabled, events: row.events, revision: row.revision }; }
  function renderHooks() {
    const list = $("hooks-list"); list.replaceChildren();
    if (!rows.length) list.append(node("p", "No webhooks configured."));
    for (const row of rows) {
      const item = node("article", "", "hook-row"), actions = node("div", "", "integration-actions");
      item.dataset.id = row.id;
      item.append(node("h3", row.name), node("p", row.url, "hook-url"), node("p", row.authorization_required ? "Authorization changed: save this webhook again to resume." : row.enabled ? "Enabled" : "Disabled"), node("p", row.events.join(", ")));
      actions.append(button("Edit", () => editor(row)), button(row.enabled ? "Disable" : "Enable", () => action(async () => {
        hideSecret(); await api("webhooks/" + row.id, "PUT", { ...config(row), enabled: !row.enabled }); await loadHooks(); status("Webhook updated. Previous pending deliveries were cancelled.");
      })), button("Deliveries", () => action(async () => { selected = row; older = null; await loadDeliveries(); })),
      button("Send test", () => action(async () => { await api("webhooks/" + row.id + "/test", "POST", { revision: row.revision }); selected = row; older = null; await loadDeliveries(); status("Test delivery queued."); })),
      button("Rotate secret", () => action(async () => {
        if (!window.confirm("Rotate this signing secret and cancel previous pending deliveries? Update the receiver with the new secret.")) return;
        const result = await api("webhooks/" + row.id + "/rotate", "POST", { revision: row.revision }); await loadHooks(); showSecret(result.secret); status("Signing secret rotated.");
      })), button("Delete", () => action(async () => {
        if (!window.confirm("Delete this webhook and its delivery records? Link history and links will remain.")) return;
        await api("webhooks/" + row.id, "DELETE", { revision: row.revision }); hideSecret();
        if (selected?.id === row.id) { selected = null; $("hook-deliveries").hidden = true; }
        await loadHooks(); status("Webhook deleted.");
      })));
      actions.querySelectorAll("button").forEach(el => { el.disabled = busy; });
      item.append(actions); list.append(item);
    }
  }
  async function loadHooks() {
    const result = await api("webhooks"); rows = result.data; renderHooks();
    if (selected) selected = rows.find(row => row.id === selected.id) || null;
  }
  async function loadDeliveries(before) {
    if (!selected || deliveryBusy) return; deliveryBusy = true;
    const id = selected.id;
    $("hook-deliveries").hidden = false; $("deliveries-title").textContent = selected.name + " deliveries";
    $("deliveries-status").textContent = "Loading...";
    try {
      const result = await api("webhooks/" + id + "/deliveries" + (before ? "?before=" + encodeURIComponent(before) : ""));
      if (selected?.id !== id) return;
      const list = $("deliveries-list"); if (!before) list.replaceChildren(); older = result.next;
      for (const delivery of result.data) {
        const row = node("article", "", "delivery-row");
        row.append(node("strong", delivery.type + " - " + delivery.state), node("span", "Attempts: " + delivery.total_attempts + "; " + date(delivery.created_at)), node("span", delivery.id));
        if (delivery.error) row.append(node("span", delivery.error + (delivery.http_status ? " (HTTP " + delivery.http_status + ")" : ""), "integration-error"));
        if (delivery.next_at) row.append(node("span", "Next attempt: " + date(delivery.next_at)));
        if (delivery.state === "failed" && delivery.revision === selected.revision && selected.enabled && !selected.authorization_required) row.append(button("Retry", () => action(async () => {
          await api("webhooks/" + id + "/retry", "POST", { delivery_id: delivery.id, revision: selected.revision }); await loadDeliveries(); status("Delivery retry queued.");
        })));
        list.append(row);
      }
      $("deliveries-status").textContent = list.children.length ? "Updated " + new Date().toLocaleTimeString() : "No deliveries yet.";
      $("deliveries-older").hidden = !older;
    } catch (error) { $("deliveries-list").replaceChildren(); $("deliveries-status").textContent = error.message; $("deliveries-older").hidden = true; }
    finally { deliveryBusy = false; }
  }
  function event(value) {
    if (!window.KuttResponses.event(value)) throw window.KuttResponses.unexpected();
    const list = $("events-list");
    if (Array.from(list.children).some(el => el.dataset.id === value.id)) return;
    const item = node("li", value.type + " - " + date(value.occurred_at) + (value.data.link_id ? " - " + value.data.link_id : ""));
    if (value.delivery?.status === "not_queued") item.append(node("p", "Moderation saved. Webhook notification was not queued because delivery capacity was reached."));
    item.dataset.id = value.id; list.prepend(item);
    while (list.children.length > 50) list.lastElementChild.remove(); after = value.sequence;
  }
  function connect() {
    source?.close(); source = null;
    if (!$("events-live").checked || document.hidden) { $("events-status").textContent = "Paused"; return; }
    source = new EventSource("/api/v2/events/stream?after=" + encodeURIComponent(after));
    source.onopen = () => { $("events-status").textContent = "Connected"; };
    source.addEventListener("management", received => { try { event(JSON.parse(received.data)); } catch { $("events-status").textContent = "Invalid update. Reload integrations."; } });
    source.onerror = () => { $("events-status").textContent = "Reconnecting..."; };
    for (const name of ["revoked", "unavailable"]) source.addEventListener(name, () => { source?.close(); source = null; $("events-status").textContent = name === "revoked" ? "Session ended. Sign in again." : "Updates unavailable. Reload to retry."; });
  }
  form.addEventListener("submit", e => { e.preventDefault(); void action(async () => {
    const data = { name: form.elements.name.value, url: form.elements.url.value, enabled: form.elements.enabled.checked,
      events: Array.from(form.querySelectorAll("[name=events]:checked"), el => el.value), ...(editing ? { revision: editing.revision } : {}) };
    const result = await api("webhooks" + (editing ? "/" + editing.id : ""), editing ? "PUT" : "POST", data);
    $("hook-editor").hidden = true; editing = null; await loadHooks(); showSecret(result.secret); status("Webhook saved.");
  }, true); });
  form.addEventListener("input", () => { if (validationError) clearFormError(); });
  $("hook-new").onclick = () => editor(null);
  $("hook-cancel").onclick = () => { $("hook-editor").hidden = true; editing = null; clearFormError(); if (editorOpener?.isConnected) editorOpener.focus(); };
  $("hooks-reload").onclick = () => action(async () => { hideSecret(); clearFormError(); $("hook-editor").hidden = true; editing = null; await loadHooks(); const result = await api("events"); $("events-list").replaceChildren(); result.data.forEach(event); after = result.cursor; connect(); status("Integrations loaded."); });
  $("hook-secret-hide").onclick = hideSecret;
  $("hook-secret-copy").onclick = copySecret;
  $("deliveries-reload").onclick = () => action(() => loadDeliveries());
  $("deliveries-older").onclick = () => action(() => loadDeliveries(older));
  $("events-live").onchange = connect;
  document.addEventListener("visibilitychange", connect);
  window.addEventListener("pagehide", () => { source?.close(); hideSecret(); });
  $("hooks-reload").click();
})();
