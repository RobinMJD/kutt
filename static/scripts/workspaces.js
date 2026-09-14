(() => {
  document.querySelectorAll(".workspaces form").forEach(form => form.addEventListener("submit", event => {
    const message = event.submitter?.dataset.confirm;
    if (message && !window.confirm(message)) event.preventDefault();
  }));
  document.querySelectorAll(".workspaces [data-copy]").forEach(button => button.addEventListener("click", async () => {
    const notice = document.getElementById("workspace-notice");
    try { await navigator.clipboard.writeText(button.dataset.copy); notice.textContent = "Short link copied."; }
    catch { notice.textContent = "Copy failed. Select and copy the short link."; }
  }));
})();
