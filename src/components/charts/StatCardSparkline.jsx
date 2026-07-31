import React, { useMemo } from "react";
import PropTypes from "prop-types";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
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

  const minDate = data[0].date;
  const maxDate = data[data.length - 1].date;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  // Explicit tick values (rather than tickCount) so Vega-Lite's "nice"
  // rounding never snaps a tick to 0 when the real data doesn't include it.
  // Compact rows just show the max; expanded/modal charts spread evenly
  // across the data range for more reference points.
  const yTickValues = yTickCount > 1
    ? Array.from(
        { length: yTickCount },
        (_, i) => minVal + ((maxVal - minVal) * i) / (yTickCount - 1)
      )
    : [maxVal];

  const yAxis = showYAxis ? {
    title: null,
    values: yTickValues,
    format: yAxisFormat,
    labelExpr: "datum.label + '%'",
    grid: true,
    gridDash: [2],
  } : null;

  const xAxis = showXAxis ? {
    title: null,
    format: "%b %d",
    tickCount: 6,
    labelAngle: 0,
    labelOverlap: "parity",
    labelPadding: 6,
    labelColor: colors.gray600,
    domain: false,
    ticks: false,
    grid: false,
  } : null;

  const tooltipTitle = view === "hosps" ? "Percent of hospitalizations" : "Percent of ED visits";

  const specTemplate = {
    width: "container",
    height,
    autosize: { type: "fit", contains: "padding", resize: true },
    config: {
      background: "transparent",
      view: { stroke: "transparent" },
      axis: {
        labelFontSize: 12,
        labelColor: colors.gray700,
        titleColor: colors.gray800,
        domainColor: "#E5E7EB",
        tickColor: "#E5E7EB",
      },
      axisX: { ticks: false, domain: false, grid: false },
      axisY: { domain: false, ticks: false, tickCount: 2, orient: "left", zindex: 0 },
      legend: { disable: true },
    },
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
          y: { field: "value", type: "quantitative", axis: yAxis, scale: { zero: false } },
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
          y: { field: "value", type: "quantitative", axis: yAxis, scale: { zero: false } },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "value", type: "quantitative", format: ".2f", title: tooltipTitle },
          ],
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
          y: { field: "value", type: "quantitative", scale: { zero: false } },
          color: { value: color },
          size: {
            condition: {param: "hover", empty: false, value: 150},
            value: 60
        },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "value", type: "quantitative", format: ".2f", title: tooltipTitle },
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
            y: { field: "avg", type: "quantitative", scale: { zero: false } },
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
            y: { field: "avg", type: "quantitative", scale: { zero: false } },
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
};

export default StatCardSparkline;
