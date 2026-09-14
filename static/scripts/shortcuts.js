(() => {
  "use strict";
  const form = document.querySelector("#shortcut-form"); if (!form) return;
  const message = document.querySelector("#shortcut-message"), create = document.querySelector("#shortcut-create"),
    section = document.querySelector("#shortcut-secret"), token = document.querySelector("#shortcut-token"),
    copy = document.querySelector("#shortcut-copy-token"), reveal = document.querySelector("#shortcut-reveal"), hide = document.querySelector("#shortcut-hide"), revoke = document.querySelector("#shortcut-revoke");
  let id = null, busy = false, generation = 0;
  const show = (text, error = false) => { message.textContent = text; message.classList.toggle("error", error); };
  function clear() { token.value = ""; token.type = "password"; reveal.setAttribute("aria-pressed", "false"); reveal.title = "Show API token"; reveal.setAttribute("aria-label", reveal.title); copy.disabled = hide.disabled = reveal.disabled = true; }
  reveal.addEventListener("click", () => { const shown = token.type === "password"; token.type = shown ? "text" : "password"; reveal.setAttribute("aria-pressed", String(shown)); reveal.title = shown ? "Mask API token" : "Show API token"; reveal.setAttribute("aria-label", reveal.title); });
  async function copyValue(value, label) {
    let timer;
    try { await Promise.race([navigator.clipboard.writeText(value), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Clipboard timeout")), 3000); })]); show(label + " copied."); }
    catch { show("Clipboard unavailable. Select and copy the field manually.", true); }
    finally { clearTimeout(timer); }
  }
  document.querySelector("#shortcut-copy-endpoint").addEventListener("click", () => copyValue(document.querySelector("#shortcut-endpoint").value, "Endpoint"));
  copy.addEventListener("click", () => { if (token.value) void copyValue(token.value, "Token"); });
  hide.addEventListener("click", () => { clear(); create.disabled = false; show("Credential hidden. It cannot be displayed again; revoke it if it was not saved securely."); });
  window.addEventListener("pagehide", () => { generation++; clear(); });
  window.addEventListener("pageshow", () => { if (!token.value) create.disabled = busy; });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (busy || token.value) return;
    const requestGeneration = generation;
    busy = true; create.disabled = true; show("Creating...");
    try {
      const response = await fetch("/api/v2/shortcuts/token", { method: "POST", credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ name: form.elements.name.value }) });
      const result = await response.json().catch(() => ({}));
      // Never restore a one-time secret after navigating away, including BFCache.
      if (requestGeneration !== generation) return;
      if (!response.ok) throw new Error(result.error || "Request failed. Check API tokens in Settings before retrying.");
      if (!result.id || !result.token) throw new Error("Unexpected response. Check API tokens in Settings before retrying.");
      id = result.id; token.value = result.token; section.hidden = false; copy.disabled = hide.disabled = revoke.disabled = reveal.disabled = false;
      document.querySelector("#shortcut-expiry").textContent = "Expires " + new Date(result.expires_at).toLocaleString();
      show("Token created. Store it only in your private Shortcut."); token.focus();
    } catch (error) { show(error.message, true); }
    finally { busy = false; create.disabled = Boolean(token.value); }
  });
  revoke.addEventListener("click", async () => {
    if (busy || !id) return; busy = true; revoke.disabled = create.disabled = true;
    try {
      const response = await fetch("/api/v2/tokens/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Revocation failed. Retry or revoke in Settings.");
      clear(); id = null; section.hidden = true; show("Token revoked.");
    } catch (error) { show(error.message, true); }
    finally { busy = false; revoke.disabled = !id; create.disabled = Boolean(token.value); }
  });
  clear(); create.disabled = false;
  document.querySelector("#shortcut-copy-endpoint").disabled = false;
})();
