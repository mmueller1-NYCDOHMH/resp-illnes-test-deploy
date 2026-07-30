/**
 * TrendChip
 *
 * Shared pill badge used by StatCardRow (all rows in the homepage stat table).
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

/** Thin-stroke SVG chevron — reads as a real icon rather than a bold glyph. */
const Arrow = ({ dir, size = 14 }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      display: "inline-block",
      flexShrink: 0,
      transform: `rotate(${arrowRotation[dir] ?? "0deg"})`,
      transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1)",
    }}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
);

/**
 * TrendArrowBadge
 *
 * Circular icon-only badge showing just the direction arrow — meant to sit
 * inline next to the previous/current value numbers. Pulls from the same
 * `styleMap` as TrendChip so the arrow badge and the label pill below it
 * always share the same background/text color for a given direction.
 */
export const TrendArrowBadge = ({ dir, size = "base" }) => {
  if (!dir) return null;

  const box = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const iconSize = size === "sm" ? 12 : 15;

  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex items-center justify-center flex-shrink-0 rounded-full",
        box,
        styleMap[dir] ?? styleMap.same,
      ].join(" ")}
    >
      <Arrow dir={dir} size={iconSize} />
    </span>
  );
};

/**
 * TrendChip
 *
 * Pill badge. Pass `showArrow={false}` to render a label-only pill (used
 * beneath a TrendArrowBadge so the arrow isn't shown twice).
 */
const TrendChip = ({ dir, size = "base", showArrow = true }) => {
  if (!dir) return null;

  const padding  = size === "sm" ? "px-3.5 py-1"   : "px-4 py-1.5";
  const textSize = size === "sm" ? "text-sm"       : "text-base";
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full",
        "font-medium leading-tight whitespace-nowrap",
        "transition-colors duration-300",
        padding,
        textSize,
        styleMap[dir] ?? styleMap.same,
      ].join(" ")}
    >
      {showArrow && <Arrow dir={dir} size={iconSize} />}
      {labelMap[dir] ?? labelMap.same}
    </span>
  );
};

export default TrendChip;
