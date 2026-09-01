/**
 * WastewaterVariantChart
 *
 * Self-fetching small-multiples grid: one compact line+area panel per
 * SARS-CoV-2 wastewater variant, each showing that variant's weekly share
 * of sequenced samples. Rendered on the COVID page's Wastewater tab, right
 * after WastewaterChart.
 *
 * Originally built as a single 100%-stacked bar chart (all variants in one
 * view via a legend); switched to small multiples per Morgan's request.
 * With ~11 named variants + "Other", a single legend got crowded, and the
 * codebase's existing small-multiples component (SmallMultipleLineChart —
 * see the flu/COVID "By Age"/"By Borough" charts) lays panels out as one
 * long vertically-stacked column (Vega `vconcat`), which for this many
 * categories would make the section very tall. This component instead
 * lays panels out in a responsive CSS grid (multiple per row), same idea
 * as WastewaterChart's Flu 2-panel grid, generalized to N panels.
 *
 * Every panel uses one consistent color rather than a categorical palette
 * — with small multiples, the panel's position + title carry the variant's
 * identity, not its color (same convention SmallMultipleLineChart already
 * uses for age/borough breakdowns elsewhere on this site), so there's no
 * legend to fit or categorical palette to validate.
 *
 * Data: public/data/wastewaterData.csv, metric === "SARS-CoV-2 variants".
 * Two submetric values aren't real variant lineages:
 *  - "Other" — RPU's catch-all for variants each present at a low
 *    individual share that week. Still gets its own panel (a real,
 *    trackable series), placed last.
 *  - "No sequencing data" — a placeholder row (100%) for weeks when no
 *    wastewater samples were sequenced at all, per RPU's email note
 *    ("RPU webpage - new long files for staging", Hilary Parton,
 *    2026-08-19). Doesn't get its own panel (it's not a prevalence trend);
 *    instead every real panel shows a genuine gap that week — a `null`
 *    value breaks a Vega-Lite line/area rather than being filled in as
 *    zero, so "no data that week" isn't drawn as "confirmed absent that
 *    week." That gap is additionally marked with a greyed-out band
 *    (buildGapBands()/the first `rect` layer in buildPanelSpec()) spanning
 *    every contiguous run of no-sequencing weeks, so "we don't know" reads
 *    as an explicit visual signal rather than empty whitespace a viewer
 *    might mistake for a rendering gap. Both this and the "Other" bucket
 *    are explained via this section's info (ⓘ) button — the standard
 *    site-wide `infoIcon`/`modal`
 *    config on the "wastewater-covid-variants" section in
 *    CovidPage.config.js, rendered by ContentContainer in the section's
 *    title row like every other info button on the site (NOT a bespoke
 *    button inside this component — matching the site-wide convention on
 *    placement mattered more than dodging the sessionStorage caching
 *    quirk noted in usePageData.js; that quirk just means a tab that was
 *    already open on this exact page before this button was added needs a
 *    reload of a fresh tab / `sessionStorage.clear()` to see it once).
 *
 * Every other variant name is discovered dynamically from the data (not
 * hardcoded) and ranked by total prevalence so panel order is stable and
 * reads most-common-first — same "don't hardcode what RPU might change"
 * philosophy used in neighborhoodGeoData.js. A week where a listed variant
 * doesn't appear (RPU only lists variants that clear some share that week)
 * is filled in as 0%, not a gap — that's a real "at/below reporting
 * threshold that week," different from "no sequencing happened."
 */

import React, { useEffect, useMemo, useState } from "react";
import { loadCSVData } from "../../utils/loadCSVData";
import VegaLiteWrapper from "./VegaLiteWrapper";
import ChartFooter from "./ChartFooter";
import { tokens } from "../../styles/tokens";
import { resolveAsset } from "../../utils/pathUtils";
import { buildTooltipLineCalc, tooltipLineEntry, hideZeroLabelExpr } from "../../utils/tooltipUtils";
import {
  BASE_AXIS_LABEL_CONFIG,
  BASE_AXIS_X_CONFIG,
  BASE_AXIS_Y_CONFIG,
  BASE_CHART_VIEW,
} from "../../utils/vegaTheme";

const { colors, typography } = tokens;

const METRIC_NAME = "SARS-CoV-2 variants";
const NO_SEQUENCING_LABEL = "No sequencing data";
const OTHER_LABEL = "Other";

// One consistent hue for every panel — see file header for why small
// multiples don't need a categorical palette here.
const PANEL_COLOR = tokens.colorScales.covid[2];

const escapeForVega = (str = "") =>
  String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/**
 * Groups consecutive "no sequencing data" dates into contiguous
 * {start, end} bands — used to draw a greyed-out "no data available" rect
 * behind each panel's line/area.
 *
 * A band is anchored to the nearest REAL (non-null) neighboring point on
 * each side, not just padded a bit past the null dates themselves: a
 * Vega-Lite line/area with a `null` value only stops drawing exactly AT
 * the last real point before the gap and only resumes exactly AT the next
 * real point after it, so the actual empty visual space runs edge-to-edge
 * between those two real points — anything narrower (e.g. only padding
 * halfway from the null dates) would leave a sliver of ungreyed empty
 * space on each side that still looks like an unexplained gap. When a gap
 * touches the very start or end of the series (no real neighbor on that
 * side), fall back to padding by the typical data interval instead.
 */
function buildGapBands(allDates, noSeqDates) {
  if (!allDates.length || !noSeqDates.size) return [];

  let intervalMs = 7 * 24 * 60 * 60 * 1000; // fallback: assume weekly data
  if (allDates.length > 1) {
    const diffs = [];
    for (let i = 1; i < allDates.length; i++) {
      diffs.push(allDates[i].getTime() - allDates[i - 1].getTime());
    }
    diffs.sort((a, b) => a - b);
    intervalMs = diffs[Math.floor(diffs.length / 2)]; // median interval
  }

  const bands = [];
  const n = allDates.length;
  let i = 0;

  while (i < n) {
    if (!noSeqDates.has(allDates[i].getTime())) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && noSeqDates.has(allDates[j].getTime())) j++;
    // Run of no-data dates is allDates[i..j-1]; anchor to the real point
    // just before (allDates[i-1]) and just after (allDates[j]) it.
    const start = i > 0 ? allDates[i - 1] : new Date(allDates[i].getTime() - intervalMs);
    const end = j < n ? allDates[j] : new Date(allDates[j - 1].getTime() + intervalMs);
    bands.push({ start, end });
    i = j;
  }

  return bands;
}

/**
 * Builds one { category, series } entry per variant (ranked by total
 * prevalence, "Other" last), each series filled across every date in the
 * data — 0% for a week the variant simply wasn't listed, `null` (a real
 * gap) for a week RPU reported no sequencing at all.
 */
function buildPanels(rows) {
  const noSeqDates = new Set(
    rows
      .filter((r) => r.submetric === NO_SEQUENCING_LABEL)
      .map((r) => r.date?.getTime())
      .filter((t) => Number.isFinite(t))
  );
  const realRows = rows.filter(
    (r) => r.submetric && r.submetric !== NO_SEQUENCING_LABEL
  );

  const totals = new Map();
  for (const row of realRows) {
    if (row.submetric === OTHER_LABEL) continue;
    totals.set(row.submetric, (totals.get(row.submetric) || 0) + (row.valueNum || 0));
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const hasOther = realRows.some((r) => r.submetric === OTHER_LABEL);
  const categories = hasOther ? [...ranked, OTHER_LABEL] : ranked;

  const allDates = [...new Set(rows.map((r) => r.date?.getTime()).filter((t) => Number.isFinite(t)))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  const panels = categories.map((category) => {
    const byDate = new Map(
      realRows
        .filter((r) => r.submetric === category)
        .map((r) => [r.date?.getTime(), r.valueNum])
    );
    const series = allDates.map((date) => {
      const t = date.getTime();
      const value = noSeqDates.has(t) ? null : byDate.has(t) ? byDate.get(t) : 0;
      return { date, category, value };
    });
    const ownMax = Math.max(1, ...series.map((d) => d.value ?? 0));
    return { category, series, ownMax };
  });

  const sharedMax = Math.max(1, ...panels.map((p) => p.ownMax));
  const gapBands = buildGapBands(allDates, noSeqDates);

  return { panels, sharedMax, hasNoSequencing: noSeqDates.size > 0, gapBands };
}

function buildPanelSpec(category, maxValue, gapBands = []) {
  const tooltipLineCalc = buildTooltipLineCalc({
    seriesLabel: category,
    valueField: "valueDisplay",
    metricLabel: "sequenced samples",
    isPercent: true,
    includeSeriesInValue: false,
  });

  const xAxis = {
    title: null,
    format: "%b %d",
    tickCount: 4,
    labelAngle: -30,
    ...BASE_AXIS_LABEL_CONFIG,
  };

  const yAxis = {
    format: ".0f",
    labelExpr: hideZeroLabelExpr("format(datum.value, '.0f') + '%'"),
    gridDash: [2],
    tickCount: 3,
    domain: false,
    ticks: false,
    ...BASE_AXIS_LABEL_CONFIG,
  };

  const yScale = { domain: [0, maxValue], nice: true, zero: true };

  return {
    width: "container",
    height: 110,
    autosize: { type: "fit", contains: "padding" },
    title: {
      text: category,
      anchor: "start",
      align: "left",
      fontSize: 13,
      fontWeight: "bold",
      font: typography.heading,
      color: colors.gray800,
    },
    config: {
      background: colors.white,
      axis: { ...BASE_AXIS_LABEL_CONFIG },
      axisX: { ...BASE_AXIS_X_CONFIG },
      axisY: { ...BASE_AXIS_Y_CONFIG },
      view: { ...BASE_CHART_VIEW },
    },
    transform: [
      {
        calculate: "isValid(datum.value) ? format(datum.value, '.1f') + '%' : 'N/A'",
        as: "valueDisplay",
      },
      { calculate: tooltipLineCalc, as: "tooltipLine" },
    ],
    layer: [
      ...(gapBands.length
        ? [
            {
              // Greyed-out "no data available" band behind the line/area,
              // one per contiguous run of "No sequencing data" weeks (see
              // buildGapBands). Drawn first so it sits behind every other
              // layer. Uses `datum` (not a data field) for y/y2 so it always
              // spans the full [0, maxValue] range of this panel's shared
              // y-scale, regardless of the "nice"-rounded domain.
              data: { values: gapBands },
              mark: { type: "rect", color: colors.gray300, opacity: 0.6 },
              encoding: {
                x: { field: "start", type: "temporal" },
                x2: { field: "end" },
                y: { datum: 0 },
                y2: { datum: maxValue },
              },
            },
          ]
        : []),
      {
        // A null `value` breaks this area/line rather than filling to
        // zero — see file header note on "No sequencing data" weeks.
        mark: { type: "area", opacity: 0.15, color: PANEL_COLOR },
        encoding: {
          x: { field: "date", type: "temporal", axis: xAxis },
          y: { field: "value", type: "quantitative", title: null, axis: yAxis, scale: yScale },
        },
      },
      {
        mark: { type: "line", point: false, strokeWidth: 2, color: PANEL_COLOR },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      },
      {
        params: [
          {
            name: "pointHover",
            select: { type: "point", on: "pointerover", clear: "pointerout", nearest: false },
          },
        ],
        mark: { type: "point", filled: true, strokeWidth: 1.5, color: PANEL_COLOR },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Week ending" },
            tooltipLineEntry("tooltipLine", category),
          ],
          size: {
            condition: { param: "pointHover", empty: false, value: 150 },
            value: 50,
          },
        },
      },
    ],
  };
}

// ── Export-grid spec builder ─────────────────────────────────────────────────
// PNG download / copy-as-image need ONE image of the whole panel grid, but
// on screen this chart is N independent Vega views (one VegaLiteWrapper per
// variant) — there's no single view that represents "the whole thing" to
// hand to the standard onNewView-based capture. Instead this builds one
// combined Vega-Lite `concat` spec (each panel's already-computed series
// inlined as its own `data`) on demand; exportChartImage.js's
// renderSpecToCanvas compiles + rasterizes it off-screen. Reuses
// buildPanelSpec exactly, just swaps its container-relative `width`/
// `autosize` for an explicit width (concat children need a fixed size) and
// hoists the (identical across panels) `config` up to the concat's top
// level instead of repeating it per child.
const EXPORT_PANEL_WIDTH = 260;
const EXPORT_MAX_COLUMNS = 3;

function buildExportGridSpec(panels, scaleMode, sharedMax, gapBands) {
  if (!panels.length) return null;

  const childSpecs = panels.map(({ category, series, ownMax }) => {
    const maxValue = scaleMode === "shared" ? sharedMax : ownMax;
    const { config, autosize, width, ...rest } = buildPanelSpec(category, maxValue, gapBands);
    return {
      ...rest,
      width: EXPORT_PANEL_WIDTH,
      data: { values: series },
    };
  });

  return {
    background: colors.white,
    config: {
      background: colors.white,
      axis: { ...BASE_AXIS_LABEL_CONFIG },
      axisX: { ...BASE_AXIS_X_CONFIG },
      axisY: { ...BASE_AXIS_Y_CONFIG },
      view: { ...BASE_CHART_VIEW },
    },
    concat: childSpecs,
    columns: Math.min(EXPORT_MAX_COLUMNS, panels.length),
    spacing: { row: 24, column: 24 },
  };
}

const WastewaterVariantChart = ({ onExportSpec }) => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Same "scale to group" vs "same scale" toggle SmallMultipleLineChart.jsx
  // offers for its age/borough small multiples — defaults to independent
  // per-panel scaling so a rare variant's own trend is still legible.
  const [scaleMode, setScaleMode] = useState("independent");

  const dataUrl = resolveAsset("data/wastewaterData.csv");

  useEffect(() => {
    setLoading(true);
    setError(false);
    loadCSVData(dataUrl)
      .then((rows) => {
        setAllData(rows.filter((d) => d.metric === METRIC_NAME));
        setLoading(false);
      })
      .catch((err) => {
        console.error("[WastewaterVariantChart] CSV load failed:", err);
        setError(true);
        setLoading(false);
      });
  }, [dataUrl]);

  const { panels, sharedMax, gapBands } = useMemo(() => buildPanels(allData), [allData]);

  // Keep the download panel's PNG/copy-image spec-getter current — see
  // buildExportGridSpec above. Re-registers whenever the underlying panel
  // data or the independent/shared scale toggle changes.
  useEffect(() => {
    onExportSpec?.(() => buildExportGridSpec(panels, scaleMode, sharedMax, gapBands));
  }, [onExportSpec, panels, scaleMode, sharedMax, gapBands]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-md font-body text-[var(--gray-400)]">
        Loading variant data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-md font-body text-[var(--gray-500)]">
        Variant data could not be loaded.
      </div>
    );
  }

  if (!panels.length) return null;

  // "Other"/no-sequencing-gap explanation lives in this section's info
  // button (CovidPage.config.js's `modal` on this section) — the footnote
  // now only covers the current scale-mode state.
  const footnote =
    scaleMode === "shared"
      ? "Y-axis scales are the same across panels to support comparing prevalence between variants."
      : "Y-axis scales are different to clearly show the trend for each variant, including rarer ones.";

  return (
    <div className="w-full">
      {panels.length > 1 && (
        <div className="flex justify-end mb-3">
          <div
            className="inline-flex border border-[var(--gray-300)] rounded-full overflow-hidden bg-white"
            role="group"
            aria-label="Toggle chart scale mode"
            style={{ "--chart-toggle-active-color": PANEL_COLOR }}
          >
            {[
              { mode: "independent", label: "Scale to variant" },
              { mode: "shared", label: "Same scale" },
            ].map(({ mode, label }) => {
              const active = scaleMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScaleMode(mode)}
                  aria-pressed={active}
                  className={`appearance-none border-0 py-[0.45rem] px-[0.8rem] cursor-pointer text-sm font-semibold leading-tight outline-none transition-[background-color,color] duration-150 focus:outline-none focus-visible:relative focus-visible:z-[1] focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-[var(--chart-toggle-active-color,var(--gray-900))] ${active ? "bg-[var(--chart-toggle-active-color,var(--gray-900))] text-white" : "bg-transparent text-[var(--gray-700)] hover:bg-[var(--gray-100)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
        {panels.map(({ category, series, ownMax }) => (
          <div key={category}>
            <VegaLiteWrapper
              data={series}
              specTemplate={buildPanelSpec(category, scaleMode === "shared" ? sharedMax : ownMax, gapBands)}
              rendererMode="svg"
            />
          </div>
        ))}
      </div>
      <ChartFooter footnote={footnote} />
    </div>
  );
};

export default WastewaterVariantChart;
