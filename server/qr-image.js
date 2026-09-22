const i18n = require("./i18n");
const { PNG } = require("pngjs");

function renderPNG(modules, width) {
  const total = modules.size + 8;
  if (!Number.isInteger(width) || width < Math.max(128, total) || width > 1024) throw new Error(i18n.t("messages.invalid_qr_image_width"));
  const image = new PNG({ width, height: width });
  // Render the library's matrix on an exact integer canvas. node-qrcode's PNG
  // width calculation can round 1024 down to 1023 for a 41-module symbol.
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const row = Math.floor(y * total / width) - 4, col = Math.floor(x * total / width) - 4;
    const value = row >= 0 && col >= 0 && row < modules.size && col < modules.size && modules.get(row, col) ? 0 : 255;
    const offset = (y * width + x) * 4;
    image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  return PNG.sync.write(image);
}

module.exports = { renderPNG };
