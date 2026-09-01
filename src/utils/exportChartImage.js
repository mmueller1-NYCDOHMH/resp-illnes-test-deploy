// src/utils/exportChartImage.js
import { compile } from "vega-lite";
import { parse, View } from "vega";

/** Strip HTML tags and collapse whitespace to produce plain text. */
function stripHtml(html = "") {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
}

/**
 * Compile + run a Vega-Lite spec off-screen (no DOM attachment — renderer
 * "none" so this works headless) and rasterize it to a canvas.
 *
 * Used for multi-panel small-multiples charts (e.g. WastewaterVariantChart's
 * per-variant grid) where the on-screen chart is actually N independent Vega
 * views, one per panel — there's no single `view` to hand to
 * exportVegaImage/copyVegaImageToClipboard that would capture the whole
 * grouping. Those components instead build ONE combined Vega-Lite `concat`
 * spec (all panels' data inlined) on demand and hand it here, so the
 * exported/copied image matches the entire on-screen grid rather than just
 * whichever single panel happened to have a registered view.
 */
async function renderSpecToCanvas(spec, scaleFactor = 2) {
  const vegaSpec = compile(spec).spec;
  const view = new View(parse(vegaSpec), { renderer: "none" });
  await view.runAsync();
  return view.toCanvas(scaleFactor);
}

/**
 * Build a canvas that stacks: [header block] + [chart].
 * Header block = title (bold) + optional subtitle (lighter, smaller).
 *
 * @param {HTMLCanvasElement} chartCanvas  Already-rendered chart canvas
 * @param {Object}  opts
 * @param {string}  opts.title      Chart title (may contain HTML — stripped automatically)
 * @param {string}  [opts.subtitle] Chart subtitle (may contain HTML)
 * @param {number}  [opts.scaleFactor=2]   Pixel density multiplier
 * @param {string}  [opts.bg="#ffffff"]    Background colour
 * @returns {Promise<HTMLCanvasElement>}
 */
async function buildCanvasFromChart(chartCanvas, { title = "", subtitle = "", scaleFactor = 2, bg = "#ffffff" } = {}) {
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

function downloadCanvasBlob(canvas, type, filename) {
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
}

function copyCanvasBlobToClipboard(canvas) {
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

/**
 * Download a Vega chart as PNG (with optional title + subtitle header).
 */
export async function exportVegaImage(view, type = "png", filename = "chart", options = {}) {
  if (!view) { console.error("No Vega view provided"); return; }
  try {
    const chartCanvas = await view.toCanvas(options.scaleFactor ?? 2);
    const canvas = await buildCanvasFromChart(chartCanvas, options);
    downloadCanvasBlob(canvas, type, filename);
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
  const chartCanvas = await view.toCanvas(options.scaleFactor ?? 2);
  const canvas = await buildCanvasFromChart(chartCanvas, options);
  return copyCanvasBlobToClipboard(canvas);
}

/**
 * Download a whole small-multiples grid (a combined Vega-Lite `concat` spec,
 * one panel per variant/category, each panel's data inlined) as a single
 * PNG — see renderSpecToCanvas() for why this exists instead of reusing
 * exportVegaImage.
 */
export async function exportVegaSpecImage(spec, type = "png", filename = "chart", options = {}) {
  if (!spec) { console.error("No Vega-Lite spec provided"); return; }
  try {
    const chartCanvas = await renderSpecToCanvas(spec, options.scaleFactor ?? 2);
    const canvas = await buildCanvasFromChart(chartCanvas, options);
    downloadCanvasBlob(canvas, type, filename);
  } catch (err) {
    console.error("Failed to export chart grid:", err);
  }
}

/**
 * Copy a whole small-multiples grid to the clipboard as one PNG — the
 * spec-based counterpart to copyVegaImageToClipboard, see renderSpecToCanvas.
 */
export async function copyVegaSpecImageToClipboard(spec, options = {}) {
  if (!spec) throw new Error("No Vega-Lite spec provided");
  const chartCanvas = await renderSpecToCanvas(spec, options.scaleFactor ?? 2);
  const canvas = await buildCanvasFromChart(chartCanvas, options);
  return copyCanvasBlobToClipboard(canvas);
}
