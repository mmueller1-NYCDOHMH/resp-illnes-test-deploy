/**
 * WastewaterChart
 *
 * Self-fetching component for wastewater normalized viral load data.
 * Rendered on the Wastewater tab of each virus data page.
 *
 * - COVID-19 → single line (SC2)
 * - RSV      → single line (RSV)
 * - Flu      → two panels side-by-side (Flu A / Flu B small multiples)
 *
 * Receives `virus` prop interpolated from section config via textVars.
 * Data: public/data/wastewaterData.csv (columns: date, pathogen, value)
 * Y-axis label: "Normalized viral load" (copies/mL normalized to sewage
 * volume and population — framing copy TBD from RPU).
 */

import React, { useEffect, useState } from "react";
import { loadCSVData } from "../../utils/loadCSVData";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
import { resolveAsset } from "../../utils/pathUtils";

const { typography, colors } = tokens;

// ── Pathogen map ──────────────────────────────────────────────────────────────

const VIRUS_PATHOGENS = {
  "COVID-19": [
    { key: "SC2",   label: "SARS-CoV-2 (COVID-19)", color: tokens.colorScales.covid[2] },
  ],
  "Flu": [
    { key: "Flu A", label: "Influenza A", color: tokens.colorScales.flu[2]  },
    { key: "Flu B", label: "Influenza B", color: tokens.colorScales.flu[4]  },
  ],
  "RSV": [
    { key: "RSV",   label: "RSV",         color: tokens.colorScales.rsv[2]  },
  ],
};

// ── Vega-Lite spec builder ────────────────────────────────────────────────────

const AXIS_CONFIG = {
  labelFont:    typography.body,
  titleFont:    typography.heading,
  labelColor:   colors.gray700,
  titleColor:   colors.gray800,
  labelFontSize: 12,
};

function buildLineSpec(color, titleText = "") {
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

  const tooltip = [
    {
      field: "date",
      type: "temporal",
      format: "%b %d, %Y",
      title: "Week ending",
    },
    {
      field: "valueNum",
      type: "quantitative",
      format: ",d",
      title: "Normalized viral load",
    },
  ];

  return {
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    title: {
      text: "Normalized viral load",
      fontWeight: "normal",
      anchor: "start",
      fontSize: 13,
      font: "sans-serif",
      baseline: "top",
    },
    config: {
      background: colors.white,
      axis: {
        ...AXIS_CONFIG,
      },
      axisX: { ticks: true, domain: true, domainColor: "lightgray", grid: false },
      axisY: { domain: false, ticks: false, tickCount: 3, orient: "left", zindex: 0, gridDash: [2] },
      view: { stroke: "transparent" },
    },
    transform: [
      {
        calculate: "datum.pathogen === 'SC2' ? 'SARS-CoV-2 (COVID-19)' : datum.pathogen",
        as: "pathogenLabel",
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
              ...AXIS_CONFIG,
            },
          },
          y: {
            field: "valueNum",
            type: "quantitative",
            title: null,
            axis: {
              format: "~s",
              gridDash: [2],
              tickCount: 5,
              domain: false,
              ticks: false,
              ...AXIS_CONFIG,
            },
          },
          color: { value: color },
          tooltip,
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
              nearest: true,
            },
          },
        ],
        mark: { type: "point", filled: true, strokeWidth: 1.5 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "valueNum", type: "quantitative" },
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
          y: { field: "valueNum", type: "quantitative" },
          text: { field: "pathogenLabel", type: "nominal" },
          color: { value: color },
        },
      },
    ],
    height: 280,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const WastewaterChart = ({ virus = "COVID-19" }) => {
  const [allData, setAllData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

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

  const pathogens = VIRUS_PATHOGENS[virus] ?? VIRUS_PATHOGENS["COVID-19"];

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

  // Flu → two side-by-side panels; others → single chart
  const isFlu = virus === "Flu";

  return (
    <div className="w-full">
      {isFlu ? (
        <div className="grid grid-cols-2 gap-lg md:grid-cols-1">
          {pathogens.map(({ key, label, color }) => {
            const filtered = allData.filter((d) => d.pathogen === key);
            return (
              <div key={key}>
                <VegaLiteWrapper
                  data={filtered}
                  specTemplate={buildLineSpec(color, label)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <VegaLiteWrapper
          data={allData.filter((d) => d.pathogen === pathogens[0].key)}
          specTemplate={buildLineSpec(pathogens[0].color)}
        />
      )}
    </div>
  );
};

export default WastewaterChart;
