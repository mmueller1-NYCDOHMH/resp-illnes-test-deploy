// src/utils/exportChartImage.js

/** Strip HTML tags and collapse whitespace to produce plain text. */
function stripHtml(html = "") {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
}

/**
 * Build a canvas that stacks: [header block] + [chart].
 * Header block = title (bold) + optional subtitle (lighter, smaller).
 *
 * @param {Object}  view        Vega view instance
 * @param {Object}  opts
 * @param {string}  opts.title      Chart title (may contain HTML — stripped automatically)
 * @param {string}  [opts.subtitle] Chart subtitle (may contain HTML)
 * @param {number}  [opts.scaleFactor=2]   Pixel density multiplier
 * @param {string}  [opts.bg="#ffffff"]    Background colour
 * @returns {Promise<HTMLCanvasElement>}
 */
async function buildCanvas(view, { title = "", subtitle = "", scaleFactor = 2, bg = "#ffffff" } = {}) {
  const chartCanvas = await view.toCanvas(scaleFactor);
  const s = scaleFactor;

  const plainTitle    = stripHtml(title);
  const plainSubtitle = stripHtml(subtitle);

  const PADDING     = 20 * s;
  const TITLE_SIZE  = 16 * s;
  const SUB_SIZE    = 13 * s;
  const SUB_GAP     = 6  * s;

  const headerHeight =
    plainTitle
      ? PADDING + TITLE_SIZE + (plainSubtitle ? SUB_GAP + SUB_SIZE : 0) + PADDING
      : 0;

  const canvas = document.createElement("canvas");
  canvas.width  = chartCanvas.width;
  canvas.height = chartCanvas.height + headerHeight;

  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (plainTitle) {
    // Title
    ctx.fillStyle = "#1F2937"; // gray-800
    ctx.font = `bold ${TITLE_SIZE}px "Inter", Arial, sans-serif`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    ctx.fillText(plainTitle, PADDING, PADDING, canvas.width - PADDING * 2);

    // Subtitle
    if (plainSubtitle) {
      ctx.fillStyle = "#4B5563"; // gray-700
      ctx.font = `${SUB_SIZE}px "Inter", Arial, sans-serif`;
      ctx.fillText(
        plainSubtitle,
        PADDING,
        PADDING + TITLE_SIZE + SUB_GAP,
        canvas.width - PADDING * 2
      );
    }
  }

  // Chart
  ctx.drawImage(chartCanvas, 0, headerHeight);

  return canvas;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Download a Vega chart as PNG (with optional title + subtitle header).
 */
export async function exportVegaImage(view, type = "png", filename = "chart", options = {}) {
  if (!view) { console.error("No Vega view provided"); return; }
  try {
    const canvas = await buildCanvas(view, options);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url, download: `${filename}.${type}`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, `image/${type}`);
  } catch (err) {
    console.error("Failed to export chart:", err);
  }
}

// Alias kept for any callers that reference the old name
export const exportVegaImageWithTitle = exportVegaImage;

/**
 * Copy a Vega chart to the clipboard as a PNG (with optional title + subtitle header).
 * Requires a secure context (HTTPS / localhost) and a user gesture.
 */
export async function copyVegaImageToClipboard(view, options = {}) {
  if (!view) throw new Error("No Vega view provided");
  const canvas = await buildCanvas(view, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, "image/png");
  });
}
