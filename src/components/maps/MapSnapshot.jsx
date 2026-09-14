/**
 * MapSnapshot
 *
 * Shared pieces of the "At a Glance" snapshot card and Leaflet feature
 * styling, used by both NeighborhoodMap (home page) and
 * LabCasesNeighborhoodMap (virus data pages). Extracted 2026-09-14 — these
 * two components had grown to 750 and 944 lines respectively, and
 * `featureStyle`, `StatValue`, and `SnapshotRows` were each reimplemented
 * near-verbatim in both files (same logic/markup, differing only in which
 * data field drives them — pct vs rate — and a couple of per-map colors).
 * CompareRows.jsx already got this treatment for the comparison-mode rows;
 * this does the same for the snapshot-card pieces.
 *
 * Every prop that differed between the two original copies is now a
 * parameter here instead — see each export's doc comment.
 */

import React from "react";
import DataAsOf from "../charts/DataAsOf";

const DEFAULT_HIGHLIGHT_STROKE = "#1a1a1a";
const DEFAULT_PIN_STROKE = "#f59e0b"; // amber — matches the compare-mode accent used in the At-a-Glance card border
const DEFAULT_FILL_OPACITY = 0.82;

/**
 * featureStyle
 *
 * Leaflet per-feature style for a choropleth polygon: fill color from the
 * caller's color-scale function, plus selected/pinned outline treatment.
 * `highlightStroke` differs per map (NeighborhoodMap uses the site's blue
 * accent; LabCasesNeighborhoodMap uses near-black) — everything else was
 * already identical between the two original copies.
 */
export function featureStyle({
  geocode,
  selectedGeocode,
  pinnedGeocode,
  dataByGeocode,
  valueField,
  getColor,
  highlightStroke = DEFAULT_HIGHLIGHT_STROKE,
  pinStroke = DEFAULT_PIN_STROKE,
  fillOpacity = DEFAULT_FILL_OPACITY,
}) {
  const d = dataByGeocode[geocode];
  const sel = geocode === selectedGeocode;
  // Pinned district gets its own outline so both halves of a comparison are
  // visible on the map at once — skipped if it's also the current selection,
  // since the selected stroke already takes visual priority there.
  const pinned = !sel && pinnedGeocode != null && geocode === pinnedGeocode;
  return {
    fillColor: getColor(d?.[valueField]),
    fillOpacity,
    color: sel ? highlightStroke : pinned ? pinStroke : "#ffffff",
    weight: sel || pinned ? 2.5 : 0.8,
  };
}

/**
 * StatValue
 *
 * A stat number, or "Suppressed" (with an explanatory tooltip) when RPU has
 * masked it for a small numerator. `size="lg"` is NeighborhoodMap's larger
 * primary-stat treatment; LabCasesNeighborhoodMap uses the default "sm".
 */
export function StatValue({ value, suffix = "", size = "sm" }) {
  if (value == null) {
    return (
      <span
        className="text-xs font-semibold font-body text-[var(--gray-500)] italic"
        title="Rate suppressed — case count too small to report"
      >
        Suppressed
      </span>
    );
  }
  return (
    <span
      className={`${size === "lg" ? "text-lg" : "text-xs"} font-semibold font-body text-[var(--gray-900)] tabular-nums`}
    >
      {value}
      {suffix}
    </span>
  );
}

/**
 * SnapshotRows
 *
 * The "At a Glance" card body: one primary stat row, an optional grouped-
 * neighborhood note, and a footer (data-as-of date, or just a spacer).
 *
 * - `interactive` (NeighborhoodMap only) enables the hover-highlight/
 *   copy-friendly row treatment (cursor: text, background on hover).
 *   LabCasesNeighborhoodMap renders the row statically.
 * - `showDataAsOf` + `weekEnding` control the footer — only
 *   LabCasesNeighborhoodMap shows a date there today.
 * - No grouped-neighborhood note here (per Morgan, 2026-09-14) — the
 *   combined-UHF34-group disclosure ("Reported together with X — data are
 *   not distinguished...") only belongs in the caption below the dynamic
 *   sentence, which both maps build separately via groupedWithNote(); it
 *   used to also render here via a `groupNote` prop, which duplicated that
 *   line in the top At-a-Glance card.
 */
export function SnapshotRows({
  data,
  valueField,
  suffix = "",
  size = "sm",
  label,
  interactive = false,
  showDataAsOf = false,
  weekEnding,
}) {
  const [hovered, setHovered] = React.useState(false);

  const outerClass = interactive
    ? "px-2 py-2 flex flex-col gap-0.5"
    : "px-3 py-2.5 flex flex-col gap-2";

  const rowProps = interactive
    ? {
        style: {
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "8px",
          padding: "4px 6px",
          borderRadius: "4px",
          cursor: "text",
          userSelect: "text",
          backgroundColor: hovered ? "var(--gray-100)" : "transparent",
          transition: "background-color 100ms",
        },
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : { className: "flex items-baseline justify-between gap-2" };

  return (
    <>
      <div className={outerClass}>
        <div {...rowProps}>
          <StatValue value={data[valueField]} suffix={suffix} size={size} />
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">
            {label}
          </span>
        </div>
      </div>

      <div
        className={interactive ? "px-3 pb-2 flex justify-between gap-2" : "px-3 pb-2.5 flex justify-between gap-2"}
        style={{ color: "var(--footnote-gray)" }}
      >
        <div className="flex-1" />
        {showDataAsOf && (
          <p className="text-2xs font-body whitespace-nowrap">
            <DataAsOf date={weekEnding} />
          </p>
        )}
      </div>
    </>
  );
}
