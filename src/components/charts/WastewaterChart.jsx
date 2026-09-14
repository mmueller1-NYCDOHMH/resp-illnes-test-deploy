/**
 * WastewaterChart
 *
 * Self-fetching component for wastewater normalized viral load data.
 * Rendered on the Wastewater tab of each virus data page.
 *
 * - COVID-19 → single line (SARS-CoV-2)
 * - RSV      → single line (RSV)
 * - Flu      → two panels side-by-side (Flu A / Flu B small multiples)
 *
 * Receives `virus` prop interpolated from section config via textVars.
 * Data: public/data/wastewaterData.csv — RPU's standard long-format schema
 * (date, metric, submetric, display, value), same shape as caseData.csv /
 * emergencyDeptData.csv. Filters on metric (e.g. "SARS-CoV-2 viral load")
 * and submetric === "Citywide average".
 * Y-axis label: "Normalized viral load" (copies/mL normalized to sewage
 * volume and population — framing copy TBD from RPU).
 *
 * Per RPU (Hilary Parton, "RPU webpage - new long files for staging"
 * email, 2026-08-19): weeks below the wastewater lab's limit of detection
 * are reported as the literal string "< LOD", and weeks with no reported
 * result are blank. Both plot as zero here — a deliberate, wastewater-
 * specific rule, distinct from the "suppressed/gray" treatment used for
 * masked case-rate data elsewhere on the site (see neighborhoodGeoData.js).
 * loadCSVData already turns both into `valueNum: null`; the transform below
 * converts that to a plotted 0 while keeping the tooltip text honest about
 * which case it was ("< LOD" vs "No data reported").
 */

import React, { useEffect, useMemo, useState } from "react";
import { loadCSVData } from "../../utils/loadCSVData";
import VegaLiteWrapper from "./VegaLiteWrapper";
import ChartFooter from "./ChartFooter";
import ToggleGroup from "../controls/ToggleGroup";
import { tokens } from "../../styles/tokens";
import { resolveAsset } from "../../utils/pathUtils";
import { buildTooltipLineCalc, tooltipLineEntry, hideZeroLabelExpr, escapeForVegaString } from "../../utils/tooltipUtils";
import {
  BASE_AXIS_LABEL_CONFIG,
  BASE_AXIS_X_CONFIG,
  BASE_AXIS_Y_CONFIG,
  BASE_CHART_VIEW,
} from "../../utils/vegaTheme";

const { typography, colors } = tokens;

// ── Metric map ────────────────────────────────────────────────────────────────
// `metric` matches the CSV's `metric` column exactly; `label` drives the
// panel title, end-of-line marker, and tooltip series name (kept consistent
// with each other, unlike the old pathogen-code-keyed version of this file).

const VIRUS_METRICS = {
  "COVID-19": [
    { metric: "SARS-CoV-2 viral load", label: "SARS-CoV-2 (COVID-19)", color: tokens.colorScales.covid[2] },
  ],
  "Flu": [
    { metric: "Flu A viral load", label: "Influenza A", color: tokens.colorScales.flu[2] },
    { metric: "Flu B viral load", label: "Influenza B", color: tokens.colorScales.flu[4] },
  ],
  "RSV": [
    { metric: "RSV viral load", label: "RSV", color: tokens.colorScales.rsv[2] },
  ],
};

const CITYWIDE_SUBMETRIC = "Citywide average";

// ── Vega-Lite spec builder ────────────────────────────────────────────────────
// Shared axis/view boilerplate lives in vegaTheme.js (BASE_AXIS_LABEL_CONFIG
// etc.) — see that file for why the top-level config.axis/axisX/axisY/view
// values here are harmless but not actually load-bearing (VegaLiteWrapper's
// theme merge always wins), while the per-encoding axis spreads below are.

function buildLineSpec(color, label, titleText = "", yDomain = null) {
  // Same shared-scale convention as StatCardSparkline's yDomain prop (the
  // by-virus small multiples on the home page): when a domain is supplied,
  // every sibling panel is forced onto it so their heights are directly
  // comparable; otherwise each panel auto-scales to its own data.
  const vegaScale = yDomain ? { zero: false, domain: yDomain } : { zero: false };
  const title = titleText
    ? {
        text: titleText,
        anchor: "start",
        fontSize: 14,
        fontWeight: "normal",
        font: typography.heading,
        color: colors.gray800,
        dy: -6,
      }
    : undefined;

  // Tooltip:
const standardTooltipLineCalc = buildTooltipLineCalc({
  seriesField: "pathogenLabel",
  seriesLabel: label,
  valueField: "valueDisplay",
  metricLabel: "normalized viral load",
  isPercent: false,
  includeSeriesInValue: false,
});

const tooltipLineCalc = `
  datum.valueRaw === '< LOD'
    ? 'Normalized viral load below level of detection'
    : (!isValid(datum.valueNum)
        ? 'No data reported'
        : ${standardTooltipLineCalc})
`;

  const tooltip = [
    {
      field: "date",
      type: "temporal",
      format: "%b %d, %Y",
      title: "Week ending",
    },
    tooltipLineEntry("tooltipLine", label),
  ];

  return {
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    // No default fallback title here — the card's own H3 (rendered by
    // ContentContainer from section.title, "Normalized viral load") already
    // labels the chart, so an in-chart title would just duplicate it in a
    // smaller weight right underneath. Flu still passes an explicit
    // `titleText` per panel (e.g. "Influenza A") since those labels are load-
    // bearing — they're the only thing distinguishing the two side-by-side
    // panels — so `title` stays undefined only when no titleText is given.
    title,
    config: {
      background: colors.white,
      axis: { ...BASE_AXIS_LABEL_CONFIG },
      axisX: { ...BASE_AXIS_X_CONFIG },
      axisY: { ...BASE_AXIS_Y_CONFIG },
      view: { ...BASE_CHART_VIEW },
    },
    transform: [
      // < LOD or blank → plot as zero (see file header note).
      {
        calculate: "isValid(datum.valueNum) ? datum.valueNum : 0",
        as: "plotValue",
      },

      {
        calculate:
          "datum.valueRaw === '< LOD' ? '< LOD' : (isValid(datum.valueNum) ? format(datum.valueNum, ',d') : 'No data reported')",
        as: "valueDisplay",
      },

      {
        calculate: `'${escapeForVegaString(label)}'`,
        as: "pathogenLabel",
      },

      {
        calculate: tooltipLineCalc,
        as: "tooltipLine",
      },
    ],
    layer: [
      {
        mark: { type: "line", interpolate: "linear", strokeWidth: 3, point: false },
        encoding: {
          x: {
            field: "date",
            type: "temporal",
            axis: {
              title: null,
              format: "%b %Y",
              tickCount: 8,
              ...BASE_AXIS_LABEL_CONFIG,
            },
          },
          y: {
            field: "plotValue",
            type: "quantitative",
            title: null,
            scale: vegaScale,
            axis: {
              format: "~s",
              labelExpr: hideZeroLabelExpr("format(datum.value, '~s')"),
              gridDash: [2],
              tickCount: 5,
              domain: false,
              ticks: false,
              ...BASE_AXIS_LABEL_CONFIG,
            },
          },
          color: { value: color },
        },
      },
      {
        params: [
          {
            name: "pointHover",
            select: {
              type: "point",
              on: "pointerover",
              clear: "pointerout",
              nearest: false,
            },
          },
        ],
        mark: { type: "point", filled: true, strokeWidth: 1.5 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "plotValue", type: "quantitative", scale: vegaScale },
          color: { value: color },
          tooltip,
          size: {
            condition: { param: "pointHover", empty: false, value: 220 },
            value: 60,
          },
        },
      },
      {
        transform: [
          {
            joinaggregate: [
              { op: "max", field: "date", as: "maxDate" },
            ],
          },
          {
            filter: "datum.date === datum.maxDate",
          },
        ],
        mark: {
          type: "text",
          align: "left",
          dx: 8,
          dy: 0,
          fontSize: 12,
          fontWeight: "bold",
        },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "plotValue", type: "quantitative", scale: vegaScale },
          text: { field: "pathogenLabel", type: "nominal" },
          color: { value: color },
        },
      },
    ],
    height: 280,
  };
}

// ── Export-grid spec builder (Flu's two side-by-side panels only) ───────────
// Flu renders two independent Vega views (Influenza A / B) — there's no
// single view that represents "both panels" for onNewView-based PNG/copy-
// image capture. Same fix as WastewaterVariantChart's per-variant grid: build
// one combined Vega-Lite `concat` spec on demand instead. See
// exportChartImage.js's renderSpecToCanvas.
const EXPORT_PANEL_WIDTH = 340;

function buildExportGridSpec(pathogens, allData, yDomain = null) {
  if (!pathogens.length) return null;

  const childSpecs = pathogens.map(({ metric, label, color }) => {
    const filtered = allData.filter(
      (d) => d.metric === metric && d.submetric === CITYWIDE_SUBMETRIC
    );
    const { config, autosize, width, ...rest } = buildLineSpec(color, label, label, yDomain);
    return {
      ...rest,
      width: EXPORT_PANEL_WIDTH,
      data: { values: filtered },
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
    columns: pathogens.length,
    spacing: { row: 24, column: 24 },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const WastewaterChart = ({ virus = "COVID-19", onNewView, onExportSpec }) => {
  const [allData, setAllData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  // Flu A/Flu B only (see render below) — "same" (default) forces both
  // panels onto one shared y-domain (sharedFluYDomain below); "group" lets
  // each panel scale to its own data instead, same idea/UI as the ED
  // visits/hospitalizations sidebar toggle elsewhere (ToggleGroup, pill
  // variant).
  const [scaleMode, setScaleMode] = useState("same");

  const dataUrl = resolveAsset('data/wastewaterData.csv');

  useEffect(() => {
    setLoading(true);
    setError(false);
    loadCSVData(dataUrl)
      .then((rows) => {
        setAllData(rows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[WastewaterChart] CSV load failed:", err);
        setError(true);
        setLoading(false);
      });
  }, [dataUrl]);

  const pathogens = VIRUS_METRICS[virus] ?? VIRUS_METRICS["COVID-19"];
  const isFlu = virus === "Flu";

  // Shared y-domain across the Flu A / Flu B panels — same convention as
  // StatGrid.jsx's sharedVirusYDomain for the home-page small multiples:
  // pool every plotted value from both series, pad the min/max by 10%
  // (falling back to 10% of |hi| or a flat 1 when that pad would be zero,
  // e.g. two flat-zero series), so the two panels are directly comparable
  // instead of each auto-scaling to its own peak. Uses `valueNum ?? 0` to
  // match what's actually plotted (buildLineSpec's own transform treats
  // "< LOD"/no-data weeks as 0 too — see file header note).
  const sharedFluYDomain = useMemo(() => {
    if (!isFlu) return null;
    const metrics = new Set(pathogens.map((p) => p.metric));
    const values = allData
      .filter((d) => metrics.has(d.metric) && d.submetric === CITYWIDE_SUBMETRIC)
      .map((d) => d.valueNum ?? 0);
    if (!values.length) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
    return [lo - pad, hi + pad];
  }, [isFlu, pathogens, allData]);

  // What actually gets passed to buildLineSpec: the shared domain when the
  // toggle is on "same", or null (independent auto-scale per panel) when
  // it's on "group".
  const effectiveYDomain = scaleMode === "same" ? sharedFluYDomain : null;

  // Only Flu needs the multi-panel spec-getter (two views, see above) — the
  // single-chart COVID/RSV case already gets an exact capture via onNewView
  // below, so it deliberately never calls onExportSpec.
  useEffect(() => {
    if (!isFlu) return;
    onExportSpec?.(() => buildExportGridSpec(pathogens, allData, effectiveYDomain));
  }, [isFlu, onExportSpec, pathogens, allData, effectiveYDomain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-md font-body text-[var(--gray-400)]">
        Loading wastewater data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-md font-body text-[var(--gray-500)]">
        Wastewater data could not be loaded.
      </div>
    );
  }

  // Flu → two side-by-side panels; others → single chart (isFlu computed above)
  const footnote =
    "Weeks shown as zero were below the wastewater lab's limit of detection or had no reported result that week.";

  const latestUploadDate = allData.reduce((latest, row) => {
    if (!row.date) return latest;
    const rowDate = new Date(row.date);
    if (Number.isNaN(rowDate.getTime())) return latest;
    return !latest || rowDate > latest ? rowDate : latest;
  }, null);

  return (
    <div className="w-full">
      {isFlu ? (
        <>
          <div className="flex justify-end mb-sm">
            <ToggleGroup
              options={[
                { label: "Scale to Group", value: "group" },
                { label: "Same Scale", value: "same" },
              ]}
              value={scaleMode}
              onChange={setScaleMode}
              ariaLabel="Toggle Influenza A/B y-axis between independent and shared scale"
              variant="pill"
            />
          </div>
          <div className="grid grid-cols-2 gap-lg md:grid-cols-1">
            {pathogens.map(({ metric, label, color }) => {
              const filtered = allData.filter(
                (d) => d.metric === metric && d.submetric === CITYWIDE_SUBMETRIC
              );
              return (
                <div key={metric}>
                  <VegaLiteWrapper
                    data={filtered}
                    specTemplate={buildLineSpec(color, label, label, effectiveYDomain)}
                    rendererMode="svg"
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <VegaLiteWrapper
          data={allData.filter(
            (d) => d.metric === pathogens[0].metric && d.submetric === CITYWIDE_SUBMETRIC
          )}
          specTemplate={buildLineSpec(pathogens[0].color, pathogens[0].label)}
          onNewView={onNewView}
          rendererMode="svg"
        />
      )}
      <ChartFooter footnote={footnote} uploadDate={latestUploadDate} />
    </div>
  );
};

export default WastewaterChart;
