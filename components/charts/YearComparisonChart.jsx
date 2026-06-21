// YearComparisonChart.jsx
import React from "react";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";

const { colors, typography } = tokens;

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

// Flu B on bottom (#2F8F9D), Flu A on top (#002B35) — consistent across both views
const AB_COLOR_SCALE = {
  domain: ["Influenza B", "Influenza A"],
  range: ["#2F8F9D", "#002B35"],
};

// Shared transforms for both views:
// captures per-subtype counts, collapses A subtypes → "Influenza A", assigns stackOrder (B=0 → bottom)
const buildABTransforms = (colorField, xField) => [
  // Capture subtype buckets BEFORE collapsing
  { calculate: `datum['${colorField}'] === 'Influenza A H1' ? datum.value : 0`, as: "_h1" },
  { calculate: `datum['${colorField}'] === 'Influenza A H3' ? datum.value : 0`, as: "_h3" },
  {
    calculate: `indexof(datum['${colorField}'], 'Influenza A') >= 0 && datum['${colorField}'] !== 'Influenza A H1' && datum['${colorField}'] !== 'Influenza A H3' ? datum.value : 0`,
    as: "_hOther",
  },
  // Collapse A subtypes
  {
    calculate: `indexof(datum['${colorField}'], 'Influenza A') >= 0 ? 'Influenza A' : datum['${colorField}']`,
    as: colorField,
  },
  // Aggregate value + subtype buckets together
  {
    aggregate: [
      { op: "sum", field: "value",   as: "value"       },
      { op: "sum", field: "_h1",     as: "h1Count"     },
      { op: "sum", field: "_h3",     as: "h3Count"     },
      { op: "sum", field: "_hOther", as: "hOtherCount" },
    ],
    groupby: [xField, colorField],
  },
  // Flu B = 0 (bottom), Flu A = 1 (top)
  { calculate: `datum['${colorField}'] === 'Influenza B' ? 0 : 1`, as: "stackOrder" },
];

const YearComparisonChart = ({
  data,
  xField = "date",
  yField = "value",
  colorField = "submetric",
  metricName,
  title,
  display,
  legendTitle,
  showRollingAvg = false,
  showFluViewToggle = false,
  columnLabels = {},
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
        axis: { format: ".0%" },
      },
      color: colorEncoding,
      order: orderEncoding,
      tooltip: [
        { field: "date",         type: "temporal",     format: "%b %d, %Y", title: columnLabels.date || "Date" },
        { field: colorField,     type: "nominal",                            title: columnLabels[colorField] || legendTitle || "Type" },
        { field: "value",        type: "quantitative",  format: ",d",        title: columnLabels.value || "Cases" },
        { field: "pct",          type: "quantitative",  format: ".1%",       title: "% of cases" },
        { field: "h1Count",      type: "quantitative",  format: ",d",        title: "A H1" },
        { field: "h3Count",      type: "quantitative",  format: ",d",        title: "A H3" },
        { field: "hOtherCount",  type: "quantitative",  format: ",d",        title: "A (other)" },
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
      },
      color: colorEncoding,
      order: orderEncoding,
      tooltip: [
        { field: "date",        type: "temporal",    format: "%b %d, %Y", title: columnLabels.date || "Date" },
        { field: colorField,    type: "nominal",                           title: columnLabels[colorField] || legendTitle || "Type" },
        { field: "value",       type: "quantitative", format: ",d",        title: columnLabels.value || "Cases" },
        { field: "h1Count",     type: "quantitative", format: ",d",        title: "A H1" },
        { field: "h3Count",     type: "quantitative", format: ",d",        title: "A H3" },
        { field: "hOtherCount", type: "quantitative", format: ",d",        title: "A (other)" },
      ],
    },
  };

  // ── Transforms ────────────────────────────────────────────────────────────

  const proportionTransform = [
    ...buildABTransforms(colorField, xField),
    { joinaggregate: [{ op: "sum", field: "value", as: "weekTotal" }], groupby: [xField] },
    { calculate: "datum.weekTotal > 0 ? datum.value / datum.weekTotal : 0", as: "pct" },
  ];

  const countsTransform = [
    ...buildABTransforms(colorField, xField),
    {
      joinaggregate: [{ op: "sum", field: "value", as: "weekTotal" }],
      groupby: [xField],
    },
    {
      calculate: "datum.value > 0 ? max(datum.value, datum.weekTotal * 0.03) : 0",
      as: "barValue",
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
      subtitlePadding: 10,
      fontWeight: "normal",
      anchor: "start",
      fontSize: 14,
      baseline: "top",
      dy: -10,
      subtitleFontSize: 13,
    },
    config: {
      background: colors.white,
      axis: {
        labelFont: typography.body,
        titleFont: typography.heading,
        labelColor: colors.gray700,
        titleColor: colors.gray800,
        labelFontSize: 12,
      },
      axisX: { ticks: true, domain: true, grid: false },
      axisY: { domain: false, ticks: false, tickCount: 3, orient: "left", zindex: 0, gridDash: [2] },
      view: { stroke: "transparent" },
      legend: {
        labelFont: typography.body,
        titleFont: typography.heading,
        labelColor: colors.gray600,
        titleColor: colors.gray700,
        symbolSize: 100,
        symbolStrokeWidth: 5,
        orient: "bottom",
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
      <VegaLiteWrapper data={filtered} specTemplate={specTemplate} onNewView={onNewView} />
    </div>
  );
};

export default YearComparisonChart;
