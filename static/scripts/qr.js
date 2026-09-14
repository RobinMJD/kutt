(() => {
  const image = document.getElementById("qr-preview");
  const print = document.getElementById("qr-print");
  const error = document.getElementById("qr-error");
  const copy = document.getElementById("qr-copy");
  const status = document.getElementById("qr-copy-status");
  const supported = window.isSecureContext && typeof window.ClipboardItem === "function" &&
    typeof navigator.clipboard?.write === "function";
  let copying = false;
  if (!supported) copy.title = "Image copying unavailable; download PNG instead";
  const update = () => {
    const ready = image.complete && image.naturalWidth > 0;
    print.disabled = !ready;
    copy.disabled = !ready || !supported || copying;
    error.hidden = ready;
  };
  image.addEventListener("load", update);
  image.addEventListener("error", update);
  if (image.complete) update();
  print.addEventListener("click", () => { if (!print.disabled) window.print(); });
  copy.addEventListener("click", async () => {
    if (copy.disabled || copying) return;
    copying = true;
    copy.setAttribute("aria-busy", "true");
    status.textContent = "Copying...";
    update();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const png = new Promise((resolve, reject) => canvas.toBlob(blob => {
        if (blob?.type === "image/png") resolve(blob);
        else reject(new Error("PNG conversion failed"));
      }, "image/png"));
      // Safari requires write() during the click, before awaiting PNG encoding.
      // Handle conversion rejection even if ClipboardItem construction fails.
      png.catch(() => {});
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      status.textContent = "QR image copied.";
    } catch {
      status.textContent = "Could not copy image. Retry or download PNG.";
    } finally {
      copying = false;
      copy.removeAttribute("aria-busy");
      update();
    }
  });
})();
