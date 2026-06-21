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
  return {
    title: titleText
      ? {
          text: titleText,
          anchor: "start",
          fontSize: 14,
          fontWeight: "normal",
          font: typography.heading,
          color: colors.gray800,
          dy: -6,
        }
      : undefined,
    mark: {
      type: "line",
      point: { filled: true, size: 36, fill: color },
      color,
      strokeWidth: 2,
    },
    encoding: {
      x: {
        field: "date",
        type: "temporal",
        axis: {
          title: null,
          format: "%b %Y",
          tickCount: 8,
          labelAngle: -30,
          ...AXIS_CONFIG,
        },
      },
      y: {
        field: "valueNum",
        type: "quantitative",
        title: "Normalized viral load",
        axis: {
          format: "~s",
          gridDash: [2],
          tickCount: 5,
          domain: false,
          ticks: false,
          ...AXIS_CONFIG,
        },
      },
      tooltip: [
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
      ],
    },
    config: {
      background: colors.white,
      view:  { stroke: "transparent" },
      axisX: { ticks: true, domain: true, grid: false },
      axisY: { orient: "left", zindex: 0 },
    },
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
