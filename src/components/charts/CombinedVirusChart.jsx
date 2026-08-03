// src/components/charts/CombinedVirusChart.jsx
import React, { useMemo, useState, useContext } from "react";
import PropTypes from "prop-types";
import { tokens } from "../../styles/tokens";
import ChartFooter from "./ChartFooter";
import ChartModal from "../popups/ChartModal";
import VegaLiteWrapper, { VegaThemeContext } from "./VegaLiteWrapper";
import { buildSeasonBands } from "../../utils/seasonUtils";
import { buildTooltipLineCalc, tooltipLineEntry, hideZeroLabelExpr } from "../../utils/tooltipUtils";
import {
  BASE_AXIS_LABEL_CONFIG,
  BASE_AXIS_X_CONFIG,
  BASE_AXIS_Y_CONFIG,
  BASE_CHART_VIEW,
} from "../../utils/vegaTheme";

import { toDisplayVirus, coerceRowVirus } from "../../utils/virusMap";


/** Robust date coercion: supports date, week, end_date, etc. */
function coerceDate(row) {
  const d =
    row?.date ??
    row?.week ??
    row?.Week ??
    row?.week_end ??
    row?.weekEnd ??
    row?.week_ending ??
    row?.weekEnding ??
    row?.end_date ??
    row?.endDate ??
    row?.timestamp ??
    null;
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.valueOf()) ? null : dt;
}

/** Parse numbers safely (handles %, strings, blanks). */
function coerceNumber(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = typeof raw === "string" ? raw.trim().replace(/%+$/, "") : raw;
  const n = typeof s === "number" ? s : parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Normalize any row into one of: "ARI", "COVID", "Flu", "RSV". */
function toSeriesLabel(row) {
  const src = coerceRowVirus(row); // "Influenza", "COVID-19", "RSV", "ARI", or undefined
  let display = src ? toDisplayVirus(src) : null; // Influenza->Flu (case-insensitive), others preserved
  if (!display) {
    const base = String(row.series || "").replace(/\s+(visits|hospitalizations)$/i, "");
    if (/covid/i.test(base)) display = "COVID";
    else if (/influenza/i.test(base)) display = "Flu";
    else if (/rsv/i.test(base)) display = "RSV";
    else if (/ari/i.test(base)) display = "Respiratory illness"; 
    else if (/resp(iratory)?\s*ill/i.test(base)) display = "Respiratory illness";

    else display = base;
  }
  if (/^COVID-?19$/i.test(display)) display = "COVID";
  return display;
}


const CombinedVirusChart = ({
  data = {},
  view = "visits",
  footnote,
  title,
  columnLabels = {},
  uploadDate,
  onNewView,
}) => {
  const isValidData = !!data && (Array.isArray(data) || typeof data === "object");

  const resolvedTitle = title?.replace("{view}", view);

  // Flatten & normalize. Critical bits:
  //  - coerceDate() picks up `week` for Flu rows
  //  - toSeriesLabel() maps Influenza→Flu (case-insensitive), COVID-19→COVID
  //  - coerceNumber() handles percent strings
  const flattened = useMemo(() => {
    const rows = Array.isArray(data)
      ? data
      : Object.entries(data || {}).flatMap(([seriesName, arr]) =>
          (arr || []).map((row) => ({ ...row, series: seriesName }))
        );

    return rows
      .map((row) => {
        const d = coerceDate(row);
        const s = toSeriesLabel(row);
        const raw = row.value;
        const num = coerceNumber(raw);
        return {
          ...row,
          date: d,
          value: num,
          valueRaw: raw,
          // unify series labels to exactly: "ARI", "COVID", "Flu", or "RSV"
          series: s,
        };
      })
      // Avoid null/invalid dates (Vega temporal domain NaN)
      .filter((r) => r.date instanceof Date && !Number.isNaN(r.date.valueOf()));
  }, [data]);

  const isDark = useContext(VegaThemeContext);
  const ARI_COLOR_BASE = tokens?.colors?.bluePrimary ?? "#1E40AF";
    const lightenHex = (hex, ratio = 0.25) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
      if (!m) return hex;
      const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
      const lift = (ch) => Math.round(ch + (255 - ch) * ratio);
      const toHex = (n) => n.toString(16).padStart(2, "0");
      return `#${toHex(lift(r))}${toHex(lift(g))}${toHex(lift(b))}`;
    };
    const ARI_COLOR = isDark ? lightenHex(ARI_COLOR_BASE, 0.3) : ARI_COLOR_BASE;
  



  const seriesDomain = ["COVID", "Flu", "RSV"];
  const miniSeries = ["COVID", "Flu", "RSV"];
  const baseRange = [
    tokens?.colorScales?.covid?.[1] ?? "#0A84FF",
    tokens?.colorScales?.flu?.[1] ?? "#F43F5E",
    tokens?.colorScales?.rsv?.[1] ?? "#10B981",
  ];
  const seriesRange = isDark ? baseRange.map((c) => lightenHex(c, 0.3)) : baseRange;


  // Combined "[virus]: XX% of [visits/hospitalizations]" tooltip line.
  const viewLabel = view === "hospitalizations" ? "hospitalizations" : "visits";
  const tooltipMetricLabel = columnLabels.value || viewLabel;
  const ariTooltipLineCalc = buildTooltipLineCalc({
    seriesLabel: "Respiratory illness",
    valueField: "valueDisplay",
    metricLabel: tooltipMetricLabel,
    isPercent: true,
  });
  const buildMiniTooltipLineCalc = () =>
    buildTooltipLineCalc({
      seriesField: "series",
      valueField: "valueDisplay",
      metricLabel: tooltipMetricLabel,
      isPercent: true,
    });

  // Shared Y domain for the three minis so scales align
  const miniYDomain = useMemo(() => {
    const vals = flattened
      .filter(
        (d) =>
          miniSeries.includes(d.series) &&
          typeof d.value === "number" &&
          Number.isFinite(d.value)
      )
      .map((d) => d.value);
    if (vals.length === 0) return undefined;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.05 || 1;
    return [
      Math.max(0, Math.floor((min - pad) * 10) / 10),
      Math.ceil((max + pad) * 10) / 10,
    ];
  }, [flattened]);

  /** ---------- Main ARI chart ---------- */
  const ariTopSpec = {
    width: "container",
    autosize: { type: "fit", contains: "padding", resize: true },
    config: {
      background: "#FFFFFF",
      axis: { ...BASE_AXIS_LABEL_CONFIG },
      axisX: { ...BASE_AXIS_X_CONFIG },
      axisY: {
        ...BASE_AXIS_Y_CONFIG,
        format: ".1f",
        labelExpr: hideZeroLabelExpr("datum.label + '%'"),
      },
      view: { ...BASE_CHART_VIEW },
    },
    title: {
      text: resolvedTitle,
      subtitlePadding: 4,
      fontWeight: "normal",
      anchor: "start",
      fontSize: 11,
      baseline: "top",
      dy: -10,
      subtitleFontSize: 13,
    },
    transform: [
      {
        calculate:
          "datum.valueRaw != null ? " +
          "(test(/%$/, '' + datum.valueRaw) ? '' + datum.valueRaw : ('' + datum.valueRaw) + '%') " +
          ": (isValid(datum.value) ? format(datum.value, '.1f') + '%' : 'N/A')",
        as: "valueDisplay",
      },
        { filter: "datum.series === 'Respiratory illness'" },
        { calculate: ariTooltipLineCalc, as: "tooltipLine" },
    ],
    layer: [
      {
        mark: { type: "area", interpolate: "linear", opacity: 0.2, color: ARI_COLOR },
        encoding: {
          x: { 
            field: "date",
             type: "temporal", 
             axis: { 
               title: null, 
               format: "%b %d", 
               tickCount: 12,
               values: {
                signal: "utcSequence('day', utcOffset('day', domain('x')[0], (6 - utcday(domain('x')[0]) + 7) % 7), domain('x')[1], 7)"
            }
              }, 
               scale: { 
                 padding: 10
               } 
              },
          y: { field: "value", type: "quantitative" },
        },
      },
      {
        mark: { type: "line", interpolate: "linear", strokeWidth: 3, point: false },
        encoding: {
          x: { field: "date", type: "temporal", axis: { title: null, format: "%b %d", tickCount: 6 }, scale: { padding: 10 } },
          y: { field: "value", type: "quantitative", axis: { title: null, tickCount: 4, grid: true, gridDash: [2], format: ".1f", labelExpr: hideZeroLabelExpr("datum.label + '%'"), } },
          color: { value: '#1E40AF' },
        },
      },
      {
        params: [
          {
            name: "pointHover",
            select: { type: "point", on: "pointerover", clear: "pointerout", nearest: false },
          },
        ],
        mark: { type: "point", filled: true, strokeWidth: 1.5 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
          color: { value: ARI_COLOR },
          tooltip: [{ field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" }, tooltipLineEntry("tooltipLine")],
          size: {
            condition: { param: "pointHover", empty: false, value: 150 },
            value: 60,
          },
        },
      },
    ],
  };

  /** ---------- Reusable spec builder for mini + modal charts ---------- */
  const baseSmallConfig = {
    width: "container",
    autosize: { type: "fit", contains: "padding", resize: true },
    config: ariTopSpec.config,
  };
  

  const buildSeriesSpec = (series, { tall = false, showYAxis = true, yDomain } = {}) => {
    // Map mini series label → virus registry key for season bands
    const virusKeyMap = { COVID: "COVID-19", Flu: "Flu", RSV: "RSV" };
    const seriesVirus = virusKeyMap[series] ?? null;
    const yTop = yDomain ? yDomain[1] : (miniYDomain ? miniYDomain[1] : 100);
    const seasonBands = seriesVirus ? buildSeasonBands(seriesVirus, flattened) : [];

    return ({
    ...baseSmallConfig,
    height: tall ? 280 : 120,
    transform: [
      { filter: `datum.series === '${series}'` },
      {
        calculate:
          "datum.valueRaw != null ? " +
          "(test(/%$/, '' + datum.valueRaw) ? '' + datum.valueRaw : ('' + datum.valueRaw) + '%') " +
          ": (isValid(datum.value) ? format(datum.value, '.1f') + '%' : 'N/A')",
        as: "valueDisplay",
      },
      { calculate: buildMiniTooltipLineCalc(), as: "tooltipLine" },
    ],
    layer: [
      // ── Peak-season background band ──────────────────────────────────────
      ...(seasonBands.length > 0
        ? [{
            data: { values: seasonBands },
            mark: { type: "rect", opacity: 0.07, color: "#64748B", clip: true },
            encoding: {
              x:  { field: "start", type: "temporal" },
              x2: { field: "end",   type: "temporal" },
              y:  { datum: yDomain ? yDomain[0] : 0 },
              y2: { datum: yTop },
            },
          }]
        : []),
      {
        mark: { type: "area", interpolate: "linear", opacity: 0.15 },
        encoding: {
          x: { field: "date", type: "temporal", axis: { title: null, format: "%b %d", tickCount: tall ? 8 : 6 }, scale: { padding: 10 } },
          y: {
            field: "value", type: "quantitative",
            axis: showYAxis
           ? {
               title: null,
               tickCount: tall ? 6 : 4,
               format: ".1f",
               labelExpr: hideZeroLabelExpr("datum.label + '%'"),
               grid: true,
               gridDash: [2]     // ← keep dashed grid on the mini with axis
             }
           : {
               title: null,
               labels: false,
               ticks: false,
               domain: false,
               grid: true,
               gridDash: [2]     // ← keep dashed grid when using grid-only
             },
            scale: yDomain ? { domain: yDomain } : undefined
          },
          color: {
            field: "series", type: "nominal",
            scale: { domain: seriesDomain, range: seriesRange }, legend: null,
          },
        },
      },
      {
        mark: { type: "line", interpolate: "linear", strokeWidth: tall ? 3 : 2, point: false },
        encoding: {
          x: {
            field: "date",
            type: "temporal",
            axis: {
              title: null,
              format: "%b %d",
              tickCount: tall ? 8 : 6,
              values: {
                signal: "utcSequence('day', utcOffset('day', domain('x')[0], (6 - utcday(domain('x')[0]) + 7) % 7), domain('x')[1], 7)"
            }
             },
              scale: { padding: 10 } },
          y: {
            field: "value", type: "quantitative",
            axis: showYAxis
                       ? {
                           title: null,
                           tickCount: tall ? 6 : 4,
                           format: ".1f",
                           labelExpr: hideZeroLabelExpr("datum.label + '%'"),
                           grid: true,
                           gridDash: [2]
                         }
                       : { title: null, labels: false, ticks: false, domain: false, grid: false },
                        scale: yDomain ? { domain: yDomain } : undefined
          },
          color: {
            field: "series", type: "nominal",
            scale: { domain: seriesDomain, range: seriesRange }, legend: null,
          },
        },
      },
      {
        params: [
          {
            name: "pointHover",
            select: { type: "point", on: "pointerover", clear: "pointerout", nearest: false },
          },
        ],
        mark: { type: "point", filled: true, strokeWidth: 1.5 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative", scale: yDomain ? { domain: yDomain } : undefined },
          color: {
            field: "series", type: "nominal",
            scale: { domain: seriesDomain, range: seriesRange }, legend: null,
          },
          tooltip: [
            { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
            tooltipLineEntry("tooltipLine"),
          ],
          size: {
            condition: { param: "pointHover", empty: false, value: tall ? 220 : 150 },
            value: tall ? 60 : 40,
          },
        },
      },
    ],
  });
  };

  /** ---------- Modal state ---------- */
  const [modalSeries, setModalSeries] = useState(null);
  const openModal = (series) => setModalSeries(series);
  const closeModal = () => setModalSeries(null);

  const seriesLabels = {
    COVID: view === "hospitalizations" ? "COVID-19 Hospitalizations" : "COVID-19 Visits",
    Flu: view === "hospitalizations" ? "Flu Hospitalizations" : "Flu Visits",
    RSV: view === "hospitalizations" ? "RSV Hospitalizations" : "RSV Visits",
  };



  if (!isValidData) return null;

  return (
    <div className="combined-virus-chart w-full min-w-0 overflow-hidden">
      {/* ARI overview */}
      
      <VegaLiteWrapper data={flattened} specTemplate={ariTopSpec} rendererMode="svg"  onNewView={onNewView} />

      {/* Three mini charts with shared y-scale; y-axis only on leftmost */}
      <div
        className="mini-series-row"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginTop: "12px" }}
      >
        {["COVID", "Flu", "RSV"].map((series, idx) => (
          <button
            key={series}
            type="button"
            className="mini-series-card"
            onClick={() => openModal(series)}
            aria-label={`Open large ${seriesLabels[series]} chart`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "8px 8px 4px 8px",
              background: "var(--chart-bg)",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--chart-title-color)", padding: "0 2px" }}>
              {seriesLabels[series]}
            </div>
            <div style={{ width: "100%" }}>
              <VegaLiteWrapper
                data={flattened}
                specTemplate={buildSeriesSpec(series, {
                  tall: false,
                  showYAxis: idx === 0, // only on the leftmost mini
                  yDomain: miniYDomain, // shared y-domain
                })}
                rendererMode="svg"
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--chart-subtitle-color)", padding: "0 2px 4px 2px" }}>
              Tap/click to enlarge
            </div>
          </button>
        ))}
      </div>
    
    <div style={{ marginTop: "12px" }}>
      <ChartFooter uploadDate={uploadDate} footnote={footnote} />
      </div>
      {/* Modal for enlarged chart (uses same domain for consistency) */}
      <ChartModal title={modalSeries ? seriesLabels[modalSeries] : ""} isOpen={!!modalSeries} onClose={closeModal}>
        {modalSeries && (
          <div style={{ padding: "8px 4px 4px 4px" }}>
            <VegaLiteWrapper
              data={flattened}
              specTemplate={buildSeriesSpec(modalSeries, { tall: true, showYAxis: true, yDomain: miniYDomain })}
              rendererMode="svg"
            />
          </div>
        )}
      </ChartModal>
    </div>
  );
};

CombinedVirusChart.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  view: PropTypes.string,
  footnote: PropTypes.string,
  title: PropTypes.string,
  columnLabels: PropTypes.object,
  uploadDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  onNewView: PropTypes.func, 
};

export default CombinedVirusChart;
