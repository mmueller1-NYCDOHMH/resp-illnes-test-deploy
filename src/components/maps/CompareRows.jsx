import React from "react";
import DataAsOf from "../charts/DataAsOf";
import { WEEK_ENDING } from "./useChoroplethMap";

/**
 * Shared "pinned vs. selected" comparison table for the pin-to-compare
 * feature on both neighborhood choropleth maps (NeighborhoodMap's pct/rate
 * fields, LabCasesNeighborhoodMap's rate/count fields). Previously this JSX
 * was duplicated near-verbatim in both files with only the metric labels
 * and field keys differing — see SITE-AUDIT.md §3 "Component duplication".
 *
 * `fields` describes which values to compare; the component handles the
 * shared render/hover/delta-coloring logic.
 *
 * @param {object} pinned - Data row for the pinned neighborhood.
 * @param {object} current - Data row for the currently selected/hovered neighborhood.
 * @param {{ key: string, label: string, suffix?: string, decimals?: number, format?: (v: number) => string|number }[]} fields
 */
export default function CompareRows({ pinned, current, fields }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);

  const metrics = fields.map(
    ({ key, label, suffix = "", decimals = 1, format = (v) => v }) => {
      const aRaw = pinned[key];
      const bRaw = current[key];
      const delta = +(bRaw - aRaw).toFixed(decimals);
      return {
        key,
        label,
        aVal: format(aRaw),
        bVal: format(bRaw),
        delta,
        suffix,
      };
    }
  );

  return (
    <div className="px-3 py-1.5">
      {/* Column headers */}
      <div className="flex text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide pb-1">
        <span className="flex-[2] min-w-0" />
        <span className="w-16 text-right text-amber-700">Pinned</span>
        <span className="w-9 text-center">Δ</span>
        <span className="w-16 text-right text-blue-600">Selected</span>
      </div>

      {metrics.map(({ key, label, aVal, bVal, delta, suffix }) => {
        const isHovered = hoveredRow === key;
        const positive = delta > 0;
        const deltaStr = `${positive ? "+" : ""}${delta}${suffix}`;
        const dColor = delta === 0 ? "var(--gray-600)" : positive ? "#b91c1c" : "#065f46";

        return (
          <div
            key={key}
            className="flex items-center gap-1 py-1 rounded transition-colors duration-100"
            style={{ backgroundColor: isHovered ? "var(--gray-100)" : "transparent", cursor: "text", userSelect: "text" }}
            onMouseEnter={() => setHoveredRow(key)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <span className="flex-[2] text-xs font-body text-[var(--gray-600)] min-w-0 truncate">{label}</span>
            <span className="w-16 text-right text-xs font-semibold font-body tabular-nums text-amber-700">{aVal}</span>
            <span
              className="w-9 text-center text-2xs font-semibold font-body tabular-nums transition-opacity duration-100"
              style={{ color: dColor, opacity: isHovered ? 1 : 0.85 }}
            >
              {deltaStr}
            </span>
            <span className="w-16 text-right text-xs font-semibold font-body tabular-nums text-blue-700">{bVal}</span>
          </div>
        );
      })}
      <div
        className="pt-1 pb-0.5 flex justify-between gap-2"
        style={{ color: "var(--footnote-gray)" }}
      >
        <p className="text-2xs font-body">Δ = selected − pinned</p>
        <p className="text-2xs font-body whitespace-nowrap"><DataAsOf date={WEEK_ENDING} /></p>
      </div>
    </div>
  );
}
