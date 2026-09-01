import React, { useMemo } from "react";
import PropTypes from "prop-types";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
import { BASE_AXIS_LABEL_CONFIG, BASE_AXIS_Y_CONFIG, BASE_CHART_VIEW } from "../../utils/vegaTheme";
import "./StatCardSparkline.css";

const { colors } = tokens;

/**
 * Sparkline for stat cards — styled to match CombinedVirusChart mini-series panels.
 * Transparent background, dashed grid, labeled axes, area+line+hit-target points.
 */
const StatCardSparkline = ({
  series = [],
  valueKey = "value",
  view = "visits",
  color = colors.bluePrimary,
  height = 72,
  tall = false,
  referenceValue = null,   // dashed horizontal rule at this value (e.g. season average)
  referenceLabel = "avg",  // label shown beside the rule
  showXAxis = true,        // set false to hide date labels (e.g. compact overview rows)
  showYAxis = true,        // set false to hide the %-axis (e.g. compact overview rows)
  yAxisFormat = ".1f",     // tick label format — e.g. ".2f" for series that need 2 decimal places
  yTickCount = 1,          // number of y-axis ticks — compact rows use 1 (just the max), expanded/modal views want more
  yDomain = null,          // [min, max] — set to force a shared y-scale across sibling sparklines (e.g. the by-virus small multiples); leave null for independent auto-scaling
  onNewView,               // optional — exposes the underlying Vega view instance (e.g. for PNG/clipboard export)
}) => {
  const data = useMemo(() => {
    if (!Array.isArray(series) || series.length < 2) return [];
    return series
      .map((d) => {
        const raw = d[valueKey];
        const v =
          typeof raw === "string"
            ? Number(raw.replace(/[%\s,]+/g, ""))
            : Number(raw);
        return { date: d.date, value: Number.isFinite(v) ? v : null };
      })
      .filter((d) => d.value !== null);
  }, [series, valueKey]);

  if (data.length < 2) return null;

  // Set virus name for tooltips
  const virusName = series[0]?.metric.includes("Respiratory illness")
    ? "Overall respiratory illness"
    : series[0]?.metric.includes("COVID-19")
    ? "COVID-19"
    : series[0]?.metric.includes("Influenza")
    ? "Flu"
    : "RSV";

  const minDate = data[0].date;
  const maxDate = data[data.length - 1].date;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

// Explicit tick values (rather than tickCount) so Vega-Lite's "nice"
// rounding never snaps a tick to 0 when the real data doesn't include it.
// Ticks are spaced evenly from 0 (not the data's min) to the max, so multiple
// tick charts get a consistent, evenly-spaced axis rather than one anchored
// to an arbitrary local minimum. Compact rows just show the max.
const yTickValues = yTickCount > 1
  ? Array.from(
      { length: yTickCount },
      (_, i) => (maxVal * i) / (yTickCount - 1)
    )
  : [maxVal];

  const yAxis = showYAxis ? {
    title: null,
    values: yTickValues,
    format: yAxisFormat,
    labelExpr: "datum.value === 0 ? '' : datum.label + '%'",
    grid: true,
    gridDash: [2],
  } : null;

  const xAxis = showXAxis ? {
    title: null,
    format: "%m/%d",
    tickCount: 6,
    labelAngle: 0,
    labelOverlap: "parity",
    labelPadding: 6,
    labelColor: colors.gray600,
    domain: false,
    ticks: true,
    grid: false,
  } : null;

  const tooltipTitle = view === "hosps" ? "% of hospitalizations" : "% of ED visits";

  // When a shared domain is supplied (by-virus small multiples), every
  // sibling sparkline plots against the same y range so their heights are
  // directly comparable. Otherwise each card auto-scales to its own data.
  const yScale = yDomain ? { zero: false, domain: yDomain } : { zero: false };

  const specTemplate = {
    width: "container",
    height,
    // NOTE: no `resize: true` here — Vega's autosize re-runs its layout
    // (including axis tick placement) on every signal change, not just on
    // real container resizes. With the hover point-selection param below,
    // that meant hovering the primary (ORI) row's chart — the only row
    // with a visible x-axis — would re-fit and appear to add/shift date
    // ticks. Container-width responsiveness is already handled by
    // VegaLiteWrapper's ResizeObserver + full re-embed on width change, so
    // this isn't needed for resizing and only introduced the hover jitter.
    autosize: { type: "fit", contains: "padding" },
    config: {
      background: "transparent",
      view: { ...BASE_CHART_VIEW },
      // Font/color pulled from the shared axis config; domain/tick colors and
      // the axisX hidden-ticks style stay local — this sparkline is deliberately
      // more minimal than the full-size charts (no x domain line, tighter y ticks).
      axis: {
        ...BASE_AXIS_LABEL_CONFIG,
        domainColor: "#E5E7EB",
        tickColor: "#E5E7EB",
      },
      axisX: { ticks: false, domain: false, grid: false },
      axisY: { ...BASE_AXIS_Y_CONFIG, tickCount: 2 },
      legend: { disable: true },
    },
    transform: [
      {
        calculate: `format(datum.value, '.2f') + '${tooltipTitle}'`,
        as: "valueLabel",
      },
    ],
    layer: [
      {
        mark: {
          type: "area",
          interpolate: "linear",
          opacity: tall ? 0.2 : 0.15,
          color,
        },
        encoding: {
          x: { field: "date", type: "temporal", axis: xAxis, scale: { padding: 10 } },
          y: { field: "value", type: "quantitative", axis: yAxis, scale: yScale },
        },
      },
      {
        mark: {
          type: "line",
          interpolate: "linear",
          strokeWidth: tall ? 3 : 2,
          color,
        },
        encoding: {
          x: { field: "date", type: "temporal", axis: xAxis, scale: { padding: 10 } },
          y: { field: "value", type: "quantitative", axis: yAxis, scale: yScale },
          /*
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "valueLabel", type: "nominal", format: ".2f", title: virusName },
          ],
          */
        },
      },
      {
        params: [
        {
          name: "hover",
          select: {
            type: "point",
            on: "pointerover",
            clear: "pointerout",
            nearest: true
          }
        }
      ],
        mark: { type: "point",  filled: true, color },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative", scale: yScale },
          color: { value: color },
          size: {
            condition: {param: "hover", empty: false, value: 150},
            value: 60
        },

          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "valueLabel", type: "nominal", title: virusName },
          ],
        },
      },
      // ── Seasonal reference line (hidden when no referenceValue) ───────────
      ...(referenceValue != null ? [
        {
          data: { values: [{ avg: referenceValue, start: minDate, end: maxDate }] },
          mark: {
            type: "rule",
            strokeDash: [5, 3],
            strokeWidth: 1.5,
            color: colors.gray500,
            opacity: 0.75,
          },
          encoding: {
            x: { field: "start", type: "temporal", scale: { padding: 10 } },
            x2: { field: "end" },
            y: { field: "avg", type: "quantitative", scale: yScale },
          },
        },
        {
          data: { values: [{ avg: referenceValue, end: maxDate, label: `${referenceLabel} ${referenceValue.toFixed(1)}%` }] },
          mark: {
            type: "text",
            align: "right",
            baseline: "bottom",
            fontSize: tall ? 13 : 11,
            color: colors.gray500,
            dx: -3,
            dy: -3,
          },
          encoding: {
            y: { field: "avg", type: "quantitative", scale: yScale },
            x: { field: "end", type: "temporal", scale: { padding: 10 } },
            text: { field: "label" },
          },
        },
      ] : []),
    ],
  };

  return (
    <div className="stat-card-sparkline">
      <VegaLiteWrapper
        data={data}
        specTemplate={specTemplate}
        rendererMode="svg"
        actions={false}
        onNewView={onNewView}
      />
    </div>
  );

};

StatCardSparkline.propTypes = {
  series:         PropTypes.arrayOf(PropTypes.object),
  valueKey:       PropTypes.string,
  view:           PropTypes.oneOf(["visits", "hosps"]),
  color:          PropTypes.string,
  height:         PropTypes.number,
  tall:           PropTypes.bool,
  referenceValue: PropTypes.number,
  referenceLabel: PropTypes.string,
  showXAxis:      PropTypes.bool,
  showYAxis:      PropTypes.bool,
  yAxisFormat:    PropTypes.string,
  yTickCount:     PropTypes.number,
  onNewView:      PropTypes.func,
};


export default StatCardSparkline;
