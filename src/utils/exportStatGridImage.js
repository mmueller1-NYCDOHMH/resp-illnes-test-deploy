// src/utils/exportStatGridImage.js
//
// PNG / clipboard export for StatGrid ("What's happening across the city?").
// Unlike the single-chart sections handled by exportChartImage.js, StatGrid
// renders several independent Vega views (one sparkline per virus row), so
// there's no single view to hand off. This stitches each row's chart canvas
// together with its title and trend numbers into one flattened image —
// mirroring the manual canvas-composition approach used in exportChartImage.js.

/** Strip HTML tags and collapse whitespace to produce plain text. */
function stripHtml(html = "") {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
}

const DIR_COLORS = {
  up: "#A32D2D",   // matches --trend-chip-inc-text (increase)
  down: "#0F6E56", // matches --trend-chip-dec-text (decrease)
  same: "#444441", // matches --trend-chip-neutral-text
};

const DIR_ARROWS = { up: "▲", down: "▼", same: "–" };

/** Height + chart-canvas sizing for a single row, shared by the measure and draw passes. */
function measureRow(row, chartCanvas, s, contentWidth) {
  const titleSize = (row.isPrimary ? 17 : 15) * s;
  const rowTitleGap = 8 * s;
  const chartHeight = chartCanvas
    ? Math.round(contentWidth * (chartCanvas.height / chartCanvas.width))
    : 60 * s;
  return { titleSize, rowTitleGap, chartHeight, blockHeight: titleSize + rowTitleGap + chartHeight };
}

/**
 * Build a single canvas combining a header (title + subtitle) with one block
 * per row: row title (+ trend numbers) followed by that row's chart image.
 *
 * @param {Array} rows  [{ title, color, isPrimary, trend: {previous, current, direction}|null, view }]
 * @param {Object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {number} [opts.scaleFactor=2]
 * @param {string} [opts.bg="#ffffff"]
 * @returns {Promise<HTMLCanvasElement>}
 */
async function buildStatGridCanvas(rows, { title = "", subtitle = "", scaleFactor = 2, bg = "#ffffff" } = {}) {
  const s = scaleFactor;
  const WIDTH = 760 * s;
  const PADDING = 24 * s;
  const CONTENT_WIDTH = WIDTH - PADDING * 2;

  const TITLE_SIZE = 19 * s;
  const SUB_SIZE = 13 * s;
  const SUB_GAP = 6 * s;
  const HEADER_BOTTOM_GAP = 18 * s;
  const ROW_GAP = 16 * s;
  const DIVIDER_GAP = 14 * s;
  const TREND_SIZE = 13 * s;

  const plainTitle = stripHtml(title);
  const plainSubtitle = stripHtml(subtitle);

  // Fetch each row's chart as a canvas up front (rows with no live Vega view
  // — e.g. "Not enough data" rows — are skipped and drawn as a placeholder).
  const chartCanvases = await Promise.all(
    rows.map((r) => (r.view ? r.view.toCanvas(s) : Promise.resolve(null)))
  );

  const blocks = rows.map((r, i) => measureRow(r, chartCanvases[i], s, CONTENT_WIDTH));

  const headerHeight = plainTitle
    ? TITLE_SIZE + (plainSubtitle ? SUB_GAP + SUB_SIZE : 0) + HEADER_BOTTOM_GAP
    : 0;

  const rowsHeight =
    blocks.reduce((sum, b) => sum + ROW_GAP + b.blockHeight, 0) +
    DIVIDER_GAP * Math.max(0, rows.length - 1);

  const height = PADDING + headerHeight + rowsHeight + PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = PADDING;

  // Header
  if (plainTitle) {
    ctx.fillStyle = "#1F2937"; // gray-800
    ctx.font = `600 ${TITLE_SIZE}px "Inter", Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(plainTitle, PADDING, y, CONTENT_WIDTH);
    y += TITLE_SIZE;

    if (plainSubtitle) {
      y += SUB_GAP;
      ctx.fillStyle = "#4B5563"; // gray-700
      ctx.font = `${SUB_SIZE}px "Inter", Arial, sans-serif`;
      ctx.fillText(plainSubtitle, PADDING, y, CONTENT_WIDTH);
      y += SUB_SIZE;
    }
    y += HEADER_BOTTOM_GAP;
  }

  // Rows
  rows.forEach((row, i) => {
    const { titleSize, rowTitleGap, chartHeight } = blocks[i];
    y += ROW_GAP;

    // Row title
    ctx.fillStyle = row.color || "#1F2937";
    ctx.font = `600 ${titleSize}px "Inter", Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(row.title || "", PADDING, y, CONTENT_WIDTH * 0.55);

    // Trend numbers (right-aligned)
    if (row.trend) {
      const { previous, current, direction } = row.trend;
      const color = DIR_COLORS[direction] || DIR_COLORS.same;
      const arrow = DIR_ARROWS[direction] || DIR_ARROWS.same;
      const prevStr = Number.isFinite(previous) ? previous.toFixed(2) : "–";
      const currStr = Number.isFinite(current) ? current.toFixed(2) : "–";
      ctx.fillStyle = color;
      ctx.font = `600 ${TREND_SIZE}px "Inter", Arial, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(`${arrow} ${prevStr}% → ${currStr}%`, WIDTH - PADDING, y, CONTENT_WIDTH * 0.5);
      ctx.textAlign = "left";
    }

    y += titleSize + rowTitleGap;

    // Chart image (or placeholder)
    const chartCanvas = chartCanvases[i];
    if (chartCanvas) {
      ctx.drawImage(chartCanvas, PADDING, y, CONTENT_WIDTH, chartHeight);
    } else {
      ctx.fillStyle = "#9CA3AF"; // gray-400
      ctx.font = `${TREND_SIZE}px "Inter", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Not enough data", WIDTH / 2, y + chartHeight / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
    y += chartHeight;

    // Divider between rows
    if (i < rows.length - 1) {
      ctx.strokeStyle = "#E5E7EB"; // gray-200
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(PADDING, y + DIVIDER_GAP / 2);
      ctx.lineTo(WIDTH - PADDING, y + DIVIDER_GAP / 2);
      ctx.stroke();
      y += DIVIDER_GAP;
    }
  });

  return canvas;
}

/** Download the composited stat grid as a PNG. */
export async function downloadStatGridImage(rows, { fileName = "stat-grid", title = "", subtitle = "" } = {}) {
  if (!Array.isArray(rows) || !rows.length) return;
  try {
    const canvas = await buildStatGridCanvas(rows, { title, subtitle });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `${fileName}.png`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (err) {
    console.error("Failed to export stat grid image:", err);
  }
}

/**
 * Copy the composited stat grid to the clipboard as a PNG.
 * Requires a secure context (HTTPS / localhost) and a user gesture.
 */
export async function copyStatGridImageToClipboard(rows, { title = "", subtitle = "" } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("No rows to export");
  const canvas = await buildStatGridCanvas(rows, { title, subtitle });
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
