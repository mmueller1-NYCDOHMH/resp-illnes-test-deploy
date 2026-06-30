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
  color = colors.bluePrimary,
  height = 72,
  tall = false,
  referenceValue = null,   // dashed horizontal rule at this value (e.g. season average)
  referenceLabel = "avg",  // label shown beside the rule
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

  const yAxis = {
    title: null,
    tickCount: tall ? 4 : 3,
    format: ".1f",
    labelExpr: "datum.label + '%'",
    grid: true,
    gridDash: [2],
  };

  const xAxis = {
    title: null,
    format: "%b %d",
    tickCount: tall ? 8 : 6,
    labelAngle: 0,
  };

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
      axisX: { ticks: true, domain: true, domainColor: "#E5E7EB", grid: false },
      axisY: { domain: false, ticks: false, tickCount: 3, orient: "left", zindex: 0 },
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
          y: { field: "value", type: "quantitative", axis: yAxis, scale: { zero: true } },
        },
      },
      {
        mark: {
          type: "line",
          interpolate: "linear",
          strokeWidth: tall ? 3 : 2,
          color,
          point: { filled: true, size: tall ? 60 : 40, color },
        },
        encoding: {
          x: { field: "date", type: "temporal", axis: xAxis, scale: { padding: 10 } },
          y: { field: "value", type: "quantitative", axis: yAxis, scale: { zero: true } },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "value", type: "quantitative", format: ".2f", title: "ED visits %" },
          ],
        },
      },
      {
        mark: { type: "point", size: 300, opacity: 0.001 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative", scale: { zero: true } },
          color: { value: color },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            { field: "value", type: "quantitative", format: ".2f", title: "ED visits %" },
          ],
        },
      },
      // ── Seasonal reference line (hidden when no referenceValue) ───────────
      ...(referenceValue != null ? [
        {
          data: { values: [{ avg: referenceValue }] },
          mark: {
            type: "rule",
            strokeDash: [5, 3],
            strokeWidth: 1.5,
            color: colors.gray500,
            opacity: 0.75,
          },
          encoding: {
            y: { field: "avg", type: "quantitative", scale: { zero: true } },
          },
        },
        {
          data: { values: [{ avg: referenceValue, label: `${referenceLabel} ${referenceValue.toFixed(1)}%` }] },
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
            y: { field: "avg", type: "quantitative", scale: { zero: true } },
            x: { value: { expr: "width" } },
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
      />
    </div>
  );
};

StatCardSparkline.propTypes = {
  series:         PropTypes.arrayOf(PropTypes.object),
  valueKey:       PropTypes.string,
  color:          PropTypes.string,
  height:         PropTypes.number,
  tall:           PropTypes.bool,
  referenceValue: PropTypes.number,
  referenceLabel: PropTypes.string,
};

export default StatCardSparkline;
