(() => {
  const image = document.getElementById("qr-preview");
  const print = document.getElementById("qr-print");
  const error = document.getElementById("qr-error");
  const update = () => {
    const ready = image.complete && image.naturalWidth > 0;
    print.disabled = !ready;
    error.hidden = ready;
  };
  image.addEventListener("load", update);
  image.addEventListener("error", update);
  if (image.complete) update();
  print.addEventListener("click", () => { if (!print.disabled) window.print(); });
})();
