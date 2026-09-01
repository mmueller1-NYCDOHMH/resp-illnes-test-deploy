// YearComparisonChart.jsx
import React from "react";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
import { hideZeroLabelExpr } from "../../utils/tooltipUtils";
import {
  BASE_AXIS_LABEL_CONFIG,
  BASE_AXIS_X_CONFIG,
  BASE_AXIS_Y_CONFIG,
  BASE_CHART_VIEW,
  BASE_LEGEND_CONFIG,
} from "../../utils/vegaTheme";

const { colors } = tokens;

function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

const useMedia = (query) => {
  const get = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia !== "undefined" &&
    window.matchMedia(query).matches;

  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    setMatches(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
};

// Flu A shown first (far left) in the legend, Flu B second — domain order
// drives legend order. Stack position (B on bottom, A on top) is controlled
// separately below via `stackOrder`, so this reorder doesn't affect stacking.
const AB_COLOR_SCALE = {
  domain: ["Influenza A", "Influenza B"],
  range: ["#002B35", "#2F8F9D"],
};

// Shared transforms for both views:
// captures per-subtype counts, collapses A subtypes → "Influenza A", assigns
// stackOrder (B=0 → bottom), and computes a safe non-overlapping bar pixel
// width from the live container width + number of distinct dates.
const buildABTransforms = (colorField, xField, distinctDateCount, maxBandSize) => [
  // Capture subtype buckets BEFORE collapsing (based on the original, un-collapsed label)
  { calculate: `datum['${colorField}'] === 'Influenza A H1' ? datum.value : 0`, as: "_h1" },
  { calculate: `datum['${colorField}'] === 'Influenza A H3' ? datum.value : 0`, as: "_h3" },
  {
    calculate: `indexof(datum['${colorField}'], 'Influenza A') >= 0 && datum['${colorField}'] !== 'Influenza A H1' && datum['${colorField}'] !== 'Influenza A H3' ? datum.value : 0`,
    as: "_hOther",
  },
  // Per-row A-total / B-total buckets (before collapsing), so we can also
  // join day-level totals for BOTH series onto every row below.
  { calculate: `indexof(datum['${colorField}'], 'Influenza A') >= 0 ? datum.value : 0`, as: "_aValue" },
  { calculate: `datum['${colorField}'] === 'Influenza B' ? datum.value : 0`, as: "_bValue" },
  // Day-level (per-date) totals, joined onto EVERY row for that date —
  // both the eventual Influenza A row and the Influenza B row — before the
  // A-subtype collapse below. This is what lets the tooltip show the same
  // combined A+B breakdown no matter which segment you're hovering.
  {
    joinaggregate: [
      { op: "sum", field: "_h1",     as: "h1Count"     },
      { op: "sum", field: "_h3",     as: "h3Count"     },
      { op: "sum", field: "_hOther", as: "hOtherCount" },
      { op: "sum", field: "_aValue", as: "aValue"      },
      { op: "sum", field: "_bValue", as: "bValue"      },
    ],
    groupby: [xField],
  },
  // Collapse A subtypes
  {
    calculate: `indexof(datum['${colorField}'], 'Influenza A') >= 0 ? 'Influenza A' : datum['${colorField}']`,
    as: colorField,
  },
  // Aggregate value per date+series; carry the (already day-level-constant)
  // totals through via max() so collapsing multiple A-subtype rows together
  // doesn't re-sum them.
  {
    aggregate: [
      { op: "sum", field: "value",       as: "value"       },
      { op: "max", field: "h1Count",     as: "h1Count"     },
      { op: "max", field: "h3Count",     as: "h3Count"     },
      { op: "max", field: "hOtherCount", as: "hOtherCount" },
      { op: "max", field: "aValue",      as: "aValue"      },
      { op: "max", field: "bValue",      as: "bValue"      },
    ],
    groupby: [xField, colorField],
  },
  // Flu B = 0 (bottom), Flu A = 1 (top)
  { calculate: `datum['${colorField}'] === 'Influenza B' ? 0 : 1`, as: "stackOrder" },
  // Non-overlapping bar width: cap each bar at (available pixels per date) *
  // 0.75, and never exceed maxBandSize. Without this, a fixed bar width on a
  // continuous temporal x-scale overlaps adjacent bars whenever there are
  // more dates than the width can fit at that fixed size — later bars paint
  // over earlier ones, which is what broke hover (you had to hover the
  // sliver of a bar not covered by its neighbor to get a tooltip).
  {
    calculate: `max(2, min(${maxBandSize}, ({containerWidth} / ${distinctDateCount}) * 0.75))`,
    as: "barWidthPx",
  },
];

const YearComparisonChart = ({
  data,
  xField = "date",
  yField = "value",
  colorField = "submetric",
  metricName,
  title,
  display,
  showFluViewToggle = false,
  columnLabels = {},
  virus,
  onNewView,
}) => {
  // Default to proportion view
  const [fluView, setFluView] = React.useState("proportion");

  const normalizedDisplay =
    typeof display === "string" ? display.trim().toLowerCase() : null;

  const parsed = (Array.isArray(data) ? data : []).map((d) => {
    const dateObj = new Date(d.date);
    const year = dateObj.getFullYear();
    const week = getISOWeek(dateObj);
    const rawDisplay = typeof d.display === "string" ? d.display.trim() : "";
    const normalizedRowDisplay = rawDisplay.toLowerCase();
    const numeric = Number(d[yField]);
    const valueNum = Number.isFinite(numeric) ? numeric : null;

    return {
      ...d,
      date: dateObj,
      year,
      isoWeek: `${year}-W${String(week).padStart(2, "0")}`,
      valueRaw: d[yField],
      value: valueNum,
      metric: d.metric ?? metricName,
      [colorField]: d[colorField] ?? "Unknown",
      display: normalizedRowDisplay || "unknown",
    };
  });

  const isMobile = useMedia("(max-width: 770px)");
  const legendColumns = isMobile ? 2 : undefined;

  const filtered = parsed.filter((d) => {
    const isMatch = !metricName || d.metric === metricName;
    const isDisplayMatch = !normalizedDisplay || d.display === normalizedDisplay;
    return isMatch && isDisplayMatch;
  });


  // ── Bar layer — differs by view ───────────────────────────────────────────

  const colorEncoding = {
    field: colorField,
    type: "nominal",
    legend: { title: null },
    scale: AB_COLOR_SCALE,
  };

  const orderEncoding = { field: "stackOrder", type: "quantitative", sort: "ascending" };

  // Non-overlapping bar width — see buildABTransforms for why this is
  // needed. Capped at the same values the old fixed continuousBandSize used.
  const distinctDateCount =
    new Set(filtered.map((d) => +d[xField]).filter((v) => Number.isFinite(v))).size || 1;
  const maxBandSize = isMobile ? 20 : 36;
  const sizeEncoding = { field: "barWidthPx", type: "quantitative", scale: null };

  // Combined tooltip: always shows BOTH Influenza A's breakdown (H1/H3/other)
  // and Influenza B's total, regardless of which segment is hovered. This is
  // possible because aValue/bValue/h1Count/h3Count/hOtherCount are day-level
  // constants joined onto every row for a date (see buildABTransforms), so
  // the same two lines compute identically whether the hovered datum is the
  // Influenza A row or the Influenza B row.
  const escapeForVegaString = (str = "") =>
    String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const tooltipMetricLabel = columnLabels.value || metricName || "cases";
  const metricLabelLower = escapeForVegaString(
    tooltipMetricLabel.charAt(0).toLowerCase() + tooltipMetricLabel.slice(1)
  );

  const proportionBarLayer = {
    mark: { type: "bar", opacity: 0.9, stroke: null },
    encoding: {
      x: {
        field: xField,
        type: "temporal",
        axis: { title: null, format: "%b %d", tickCount: 12, labelAngle: 0 },
      },
      y: {
        field: "value",
        type: "quantitative",
        title: null,
        stack: "normalize",
        axis: { format: ".0%", labelExpr: hideZeroLabelExpr("format(datum.value, '.0%')") },
      },
      color: colorEncoding,
      order: orderEncoding,
      size: sizeEncoding,
      tooltip: [
        { field: "date", type: "temporal", format: "%b %d, %Y", title: columnLabels.date || "Date" },
        // Distinct (but still visually blank) titles — vega-tooltip
        // otherwise collapses two rows that share the exact same title
        // into one, silently dropping the second line.
        { field: "tooltipLineA", type: "nominal", title: " " },
        { field: "tooltipLineB", type: "nominal", title: "\u00A0" },
      ],
    },
  };

  const countsBarLayer = {
    mark: { type: "bar", opacity: 0.9, stroke: null },
    encoding: {
      x: {
        field: xField,
        type: "temporal",
        axis: { title: null, format: "%b %d", tickCount: 12, labelAngle: 0 },
      },
      y: {
        field: "barValue",
        type: "quantitative",
        title: null,
        stack: "zero",
        axis: { labelExpr: hideZeroLabelExpr("datum.label") },
      },
      color: colorEncoding,
      order: orderEncoding,
      size: sizeEncoding,
      tooltip: [
        { field: "date", type: "temporal", format: "%b %d, %Y", title: columnLabels.date || "Date" },
        // Distinct (but still visually blank) titles — vega-tooltip
        // otherwise collapses two rows that share the exact same title
        // into one, silently dropping the second line.
        { field: "tooltipLineA", type: "nominal", title: " " },
        { field: "tooltipLineB", type: "nominal", title: "\u00A0" },
      ],
    },
  };

  // ── Transforms ────────────────────────────────────────────────────────────

  const proportionTransform = [
    ...buildABTransforms(colorField, xField, distinctDateCount, maxBandSize),
    { joinaggregate: [{ op: "sum", field: "value", as: "weekTotal" }], groupby: [xField] },
    { calculate: "datum.weekTotal > 0 ? datum.h1Count / datum.weekTotal : 0", as: "h1Pct" },
    { calculate: "datum.weekTotal > 0 ? datum.h3Count / datum.weekTotal : 0", as: "h3Pct" },
    { calculate: "datum.weekTotal > 0 ? datum.hOtherCount / datum.weekTotal : 0", as: "hOtherPct" },
    { calculate: "datum.weekTotal > 0 ? datum.aValue / datum.weekTotal : 0", as: "aPct" },
    { calculate: "datum.weekTotal > 0 ? datum.bValue / datum.weekTotal : 0", as: "bPct" },
    { calculate: "format(datum.aPct, '.1%')", as: "aPctDisplay" },
    { calculate: "format(datum.bPct, '.1%')", as: "bPctDisplay" },
    {
      calculate: `'Influenza A: ' + datum.aPctDisplay + ' of ${metricLabelLower} (H1: ' + format(datum.h1Pct, '.1%') + ' · H3: ' + format(datum.h3Pct, '.1%') + ' · other: ' + format(datum.hOtherPct, '.1%') + ')'`,
      as: "tooltipLineA",
    },
    {
      calculate: `'Influenza B: ' + datum.bPctDisplay + ' of ${metricLabelLower}'`,
      as: "tooltipLineB",
    },
  ];

  const countsTransform = [
    ...buildABTransforms(colorField, xField, distinctDateCount, maxBandSize),
    {
      joinaggregate: [{ op: "sum", field: "value", as: "weekTotal" }],
      groupby: [xField],
    },
    {
      calculate: "datum.value > 0 ? max(datum.value, datum.weekTotal * 0.03) : 0",
      as: "barValue",
    },
    { calculate: "format(datum.aValue, ',d')", as: "aValueDisplay" },
    { calculate: "format(datum.bValue, ',d')", as: "bValueDisplay" },
    {
      calculate: `'Influenza A: ' + datum.aValueDisplay + ' ${metricLabelLower} (H1: ' + format(datum.h1Count, ',d') + ' · H3: ' + format(datum.h3Count, ',d') + ' · other: ' + format(datum.hOtherCount, ',d') + ')'`,
      as: "tooltipLineA",
    },
    {
      calculate: `'Influenza B: ' + datum.bValueDisplay + ' ${metricLabelLower}'`,
      as: "tooltipLineB",
    },
  ];

  // ── Spec ──────────────────────────────────────────────────────────────────

  const activeLayer = fluView === "proportion" ? proportionBarLayer : countsBarLayer;
  const activeTransform = fluView === "proportion" ? proportionTransform : countsTransform;

  const specTemplate = {
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    title: {
      text: title,
      subtitlePadding: 4,
      fontWeight: "normal",
      anchor: "start",
      fontSize: 14,
      baseline: "top",
      dy: -10,
      subtitleFontSize: 13,
    },
    config: {
      background: colors.white,
      axis: { ...BASE_AXIS_LABEL_CONFIG },
      axisX: { ...BASE_AXIS_X_CONFIG },
      axisY: { ...BASE_AXIS_Y_CONFIG },
      view: { ...BASE_CHART_VIEW },
      legend: {
        ...BASE_LEGEND_CONFIG,
        labelFontSize: 16,
        direction: "horizontal",
        columns: legendColumns,
        columnPadding: 30,
        labelLimit: isMobile ? 160 : 300,
      },
      bar: {
        binSpacing: 0,
        stroke: null,
        continuousBandSize: isMobile ? 20 : 36,
      },
    },
    transform: activeTransform,
    layer: [activeLayer],
  };

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {showFluViewToggle && (
        <div className="flex justify-end mb-3">
          <div
            className="inline-flex border border-[var(--gray-300)] rounded-full overflow-hidden bg-white"
            role="group"
            aria-label="Toggle flu view"
            style={{ "--chart-toggle-active-color": "#387781" }}
          >
            {[
              { value: "proportion", label: "Proportion" },
              { value: "counts",     label: "Counts" },
            ].map(({ value, label }) => {
              const active = fluView === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFluView(value)}
                  aria-pressed={active}
                  className={`appearance-none border-0 py-[0.45rem] px-[0.8rem] cursor-pointer text-sm font-semibold leading-tight outline-none transition-[background-color,color] duration-150 focus:outline-none focus-visible:relative focus-visible:z-[1] focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-[var(--chart-toggle-active-color,#2563eb)] ${active ? "bg-[var(--chart-toggle-active-color,#387781)] text-white" : "bg-transparent text-[var(--gray-700)] hover:bg-[var(--gray-100)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <VegaLiteWrapper data={filtered} specTemplate={specTemplate} onNewView={onNewView} rendererMode="svg" />
    </div>
  );
};

export default YearComparisonChart;
