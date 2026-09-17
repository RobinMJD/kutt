(() => {
  const root = document.querySelector(".privacy-page"), status = document.querySelector("#privacy-status");
  if (!root) return;
  const retention = root.dataset.retention === "true";
  const endpoint = retention ? "/api/analytics/retention" : "/api/links/" + encodeURIComponent(root.dataset.link) + "/tracking";
  const form = document.querySelector(retention ? "#retention-form" : "#tracking-form");
  let revision = 0, confirmation = null, previewDays = 0, busy = false;
  const message = (text, error = false) => { status.textContent = text; status.classList.toggle("error", error); };
  async function api(path, method = "GET", body) {
    const response = await fetch(path, { method, cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const schema = retention ? path.endsWith("/preview") ? window.KuttResponses.retentionPreview : window.KuttResponses.retention : window.KuttResponses.tracking;
    return window.KuttResponses.read(response, data => schema(data) &&
      (method !== "PUT" || data.revision === revision + 1 && (retention ? data.days === previewDays : data.enabled === body.enabled)) &&
      (method !== "POST" || data.revision === revision && data.days === body.days));
  }
  function resetPreview() {
    confirmation = null;
    if (!retention) return;
    document.querySelector("#retention-preview").hidden = true;
    document.querySelector("#retention-ack").checked = false;
    const enabled = form.elements.mode.value === "expire";
    document.querySelector("#retention-days-label").hidden = !enabled;
    form.elements.days.disabled = !enabled || busy;
  }
  async function work(action) {
    if (busy) return; busy = true;
    const controls = [...root.querySelectorAll("button, input")]; controls.forEach(control => { control.disabled = true; });
    try { await action(); } catch (error) { resetPreview(); message(error.message, true); }
    finally {
      busy = false; controls.forEach(control => { control.disabled = false; });
      if (retention) form.elements.days.disabled = form.elements.mode.value !== "expire";
    }
  }
  function render(data, saved) {
    resetPreview(); revision = data.revision;
    if (retention) {
      form.elements.mode.value = data.days ? "expire" : "keep"; form.elements.days.value = data.days || 365; resetPreview();
      document.querySelector("#retention-last").textContent = data.last_run ? new Date(data.last_run).toLocaleString() : "Not run";
      document.querySelector("#retention-deleted").textContent = data.deleted_buckets.toLocaleString();
      document.querySelector("#retention-error").textContent = data.last_error || (data.days ? "Scheduled" : "Disabled");
      document.querySelector("#retention-state").hidden = false;
    } else document.querySelector("#tracking-enabled").checked = data.enabled;
    form.hidden = false; message(saved || "Settings loaded");
  }
  async function load() { render(await api(endpoint)); }
  document.querySelector("#privacy-reload").onclick = () => work(() => load());
  if (retention) {
    form.addEventListener("input", () => {
      resetPreview(); message("Draft changed. Preview again before applying.");
    });
    form.onsubmit = event => { event.preventDefault(); work(async () => {
      const data = await api(endpoint + "/preview", "POST", { days: form.elements.mode.value === "keep" ? 0 : Number(form.elements.days.value), revision });
      confirmation = data.confirmation; previewDays = data.days;
      document.querySelector("#retention-cutoff").textContent = data.cutoff ? "Delete hourly analytics before " + data.cutoff + " UTC" : "Keep all analytics";
      document.querySelector("#retention-count").textContent = "Eligible hourly buckets: " + data.eligible_buckets.toLocaleString();
      document.querySelector("#retention-ack-label").hidden = !data.days;
      document.querySelector("#retention-preview").hidden = false; message("Preview ready");
    }); };
    document.querySelector("#retention-save").onclick = () => work(async () => {
      if (!confirmation) throw new Error("Preview changes first.");
      if (previewDays && !document.querySelector("#retention-ack").checked) throw new Error("Acknowledge permanent deletion before applying retention.");
      const data = await api(endpoint, "PUT", { confirmation, acknowledge_deletion: document.querySelector("#retention-ack").checked });
      render(data, "Retention saved");
    });
  } else form.onsubmit = event => { event.preventDefault(); work(async () => {
    const data = await api(endpoint, "PUT", { enabled: document.querySelector("#tracking-enabled").checked, revision }); render(data, "Tracking saved");
  }); };
  work(() => load());
})();
