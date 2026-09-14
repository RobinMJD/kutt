(() => {
  const form = document.querySelector("#transfer-import"), status = document.querySelector("#transfer-status");
  const preview = document.querySelector("#transfer-preview"), commit = document.querySelector("#transfer-commit");
  let pending = null, busy = false;
  const message = (text, error = false) => { status.textContent = text; status.classList.toggle("transfer-error", error); };
  const invalidate = () => { pending = null; commit.disabled = true; preview.hidden = true; };
  form.addEventListener("input", invalidate); form.addEventListener("change", invalidate);
  const lock = value => { busy = value; for (const control of form.elements) control.disabled = value; commit.disabled = value || !pending; };
  const api = async (path, payload) => {
    const response = await fetch("/api/v2/transfer/" + path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || `Request failed (${response.status}).`);
    return result;
  };
  document.querySelector("#transfer-file").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    invalidate();
    try {
      if (file.size > 900000) throw new Error("File exceeds 900 KB. Split it into smaller batches.");
      form.elements.format.value = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
      form.elements.content.value = await file.text(); message("");
    } catch (error) { message(error.message, true); }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (busy) return;
    const payload = Object.fromEntries(new FormData(form));
    invalidate(); lock(true); message("Validating import...");
    try {
      const result = await api("preview", payload), body = document.querySelector("#transfer-rows"); body.replaceChildren();
      for (const row of result.rows) {
        const tr = document.createElement("tr");
        for (const [index, value] of [row.row, row.address || "", row.domain || "", row.action, row.message || ""].entries()) {
          const td = document.createElement("td"); td.dataset.label = ["Row", "Alias", "Domain", "Action", "Issue"][index]; td.textContent = String(value); tr.append(td);
        }
        body.append(tr);
      }
      document.querySelector("#transfer-counts").textContent = `${result.rows.filter(row => row.action === "create").length} new, ${result.rows.filter(row => row.action === "skip").length} skipped, ${result.rows.filter(row => row.action === "error").length} errors`;
      preview.hidden = false; pending = result.valid ? { ...payload, preview_token: result.preview_token } : null;
      message(result.valid ? "Dry run complete. No links were changed. Confirmation expires in 20 minutes." : "Correct the reported errors and run a new dry run.", !result.valid);
    } catch (error) { message(error.message, true); }
    finally { lock(false); }
  });
  commit.addEventListener("click", async () => {
    if (busy || !pending) return;
    lock(true); message("Importing...");
    try {
      const result = await api("commit", pending); pending = null;
      message(`Import complete: ${result.created.length} created, ${result.skipped} skipped${result.replayed ? " (verified retry)" : ""}.`);
    } catch (error) { message(error.message + " Retry confirmation after a connection error; run a new dry run if availability changed.", true); }
    finally { lock(false); }
  });
  document.querySelector("#transfer-export").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector("button"); button.disabled = true;
    try {
      const params = new URLSearchParams(new FormData(form));
      const response = await fetch("/api/v2/transfer/export?" + params, { credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.error || `Export failed (${response.status}).`); }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = "kutt-links." + params.get("format"); link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); message("Export downloaded.");
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
})();
