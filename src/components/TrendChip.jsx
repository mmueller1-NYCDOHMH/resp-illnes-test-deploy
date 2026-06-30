/**
 * TrendChip
 *
 * Shared pill badge used by StatCard and StatCardBottom.
 * Colors come from semantic CSS tokens → tailwind.config → tokens.css,
 * so dark-mode and theme changes flow through automatically.
 *
 * To change the chip colors: update the --trend-chip-* variables in tokens.css.
 */

import React from "react";

const arrowRotation = { up: "-45deg", down: "45deg", same: "0deg" };

const styleMap = {
  up:   "bg-trend-chip-inc-bg text-trend-chip-inc-text",
  down: "bg-trend-chip-dec-bg text-trend-chip-dec-text",
  same: "bg-trend-chip-neutral-bg text-trend-chip-neutral-text",
};

const labelMap = {
  up:   "Increased",
  down: "Decreased",
  same: "Stable",
};

const TrendChip = ({ dir, size = "base" }) => {
  if (!dir) return null;

  const padding  = size === "sm" ? "px-4 py-1.5" : "px-5 py-2";
  const textSize = size === "sm" ? "text-base"   : "text-lg";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full",
        "font-semibold leading-tight whitespace-nowrap",
        "transition-colors duration-300",
        padding,
        textSize,
        styleMap[dir] ?? styleMap.same,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          transform: `rotate(${arrowRotation[dir] ?? "0deg"})`,
          transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        →
      </span>
      {labelMap[dir] ?? labelMap.same}
    </span>
  );
};

export default TrendChip;
