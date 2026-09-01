/**
 * NeighborhoodMap
 *
 * "What's happening in your neighborhood?" section on the home page.
 * Renders a Leaflet choropleth of NYC Community Districts, a search input,
 * dynamic neighborhood text, and a sorted bar chart.
 *
 * LAYOUT (v2.1 — "map + stacked right rail"):
 * Header row (title + inline search) → map (legend top-left, narrowed a bit)
 * alongside a right column holding the At-a-Glance/compare card, the caption
 * sentence, and the ranked bar chart stacked underneath it.
 *
 * Data: real (as of 2026-08-19) — UHF42 neighborhood values built from
 * RPU's staged emergencyDeptData.csv via useNeighborhoodGeoCsv +
 * buildUhfDataByGeocode (src/utils/neighborhoodGeoData.js). Two fields per
 * neighborhood: `pct` ("Respiratory illness visits by neighborhood") drives
 * both the map color scale and the primary displayed stat; `hospPct`
 * ("Respiratory illness hospitalizations by neighborhood") is a secondary
 * stat, both percents (not per-100,000 rates — RPU's file doesn't carry a
 * population-rate version of these two metrics, only percent-of-ED-visits).
 * Neither metric is currently masked in RPU's file (unlike the per-virus
 * case-rate metrics), but null-safe handling is still in place in case that
 * changes.
 * Map:  GeoJSON from NYC Health EHDP repository (UHF42 neighborhoods).
 * Tiles: CartoDB Positron no-labels (per RPU request: no city names).
 * Leaflet loaded dynamically from unpkg CDN to avoid bundling it.
 *
 * Map lifecycle, GeoJSON fetch, feature click/hover, search suggestions,
 * and the linked bar chart's view lifecycle are shared with
 * LabCasesNeighborhoodMap via useChoroplethMap — see that file for the
 * common behavior. Pin-to-compare (PinIcon + CompareRows pattern) is also
 * shared in spirit with LabCasesNeighborhoodMap, just with pct/hospPct
 * swapped for that map's rate field. This component owns the parts unique
 * to the home page: fixed (non-virus) color scale and arrow-key navigation.
 */

import React, { useEffect, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";
import DataAsOf from "../charts/DataAsOf";
import AccessibleTable from "../accessibility/AccessibleTable";
import useChoroplethMap, { WEEK_ENDING } from "./useChoroplethMap";
import { buildChoroplethBarSpec } from "./choroplethBarSpec";
import { makeColorScale, domainFromValues, stopsToCssGradient } from "../../utils/colorScale";
import useNeighborhoodGeoCsv from "../hooks/useNeighborhoodGeoCsv";
import { buildUhfDataByGeocode, averageAcrossNeighborhoods, groupedWithNote } from "../../utils/neighborhoodGeoData";
import PinIcon from "./PinIcon";
import CompareRows from "./CompareRows";

// ── Field specs for this map's two ED "by neighborhood" metrics ──────────────
const FIELD_SPECS = [
  { key: "pct", metric: "Respiratory illness visits by neighborhood" },
  { key: "hospPct", metric: "Respiratory illness hospitalizations by neighborhood" },
];

// Fallback citywide reference (used only until real data loads) — replaced
// by an unweighted average of the loaded neighborhoods' pct once available
// (see averageAcrossNeighborhoods; not an official DOHMH citywide figure).
const CITYWIDE_PCT_FALLBACK = 8.4;

// ── Choropleth color scale (ARI blue gradient) ────────────────────────────────
// Continuous interpolation across these stops (low → high), scaled to the
// actual min/max pct across loaded neighborhoods — no hardcoded
// breakpoints, so two neighborhoods a point apart never get bucketed into
// the same flat color.
//
// Previously this was ["#cde8ec", "#629FAA", "#387781", "#1E5A6B", "#0D3D4D"]
// — the middle three stops were Flu's teal scale (tokens.colorScales.flu[3]
// = #629FAA, flu[2] = #387781), not blue, which is why the map read as
// green/teal instead of matching the blue used everywhere else for "Overall
// respiratory illness" (colors.blueAccent = #1E40AF, e.g. the selected-
// district stroke and the bar chart's selectedColor below). Replaced with a
// blue gradient anchored on that same blueAccent.
const COLORS = ["#dbe7fb", "#8fa8e8", "#3f5fc9", "#24399e", "#0D1F5C"];
const HIGHLIGHT_STROKE = "#1E40AF";
const PIN_STROKE = "#f59e0b"; // amber — matches the compare-mode accent used in the At-a-Glance card border

// Fixed fill opacity across all states (default/hover/selected). Previously
// selection bumped this to 1.0 (from 0.72), which reads as a color/value
// change rather than a "this one is selected" cue — a district could look
// like it jumped up a category next to an unselected neighbor in the same
// bin. Selection is now communicated only via stroke (color + weight) plus
// the existing fly-to-selection zoom, so fill color stays a true read of
// the underlying rate regardless of interaction state.
const FILL_OPACITY = 0.82;

function featureStyle(geocode, selectedGeocode, pinnedGeocode, dataByGeocode, getColor) {
  const d      = dataByGeocode[geocode];
  const sel    = geocode === selectedGeocode;
  // Pinned district gets its own outline so both halves of a comparison are
  // visible on the map at once — skipped if it's also the current selection,
  // since the selected stroke already takes visual priority there.
  const pinned = !sel && pinnedGeocode != null && geocode === pinnedGeocode;
  return {
    fillColor:   getColor(d?.pct),
    fillOpacity: FILL_OPACITY,
    color:       sel ? HIGHLIGHT_STROKE : pinned ? PIN_STROKE : "#ffffff",
    weight:      sel || pinned ? 2.5 : 0.8,
  };
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────
// Column orientation: neighborhoods run left→right along X, % of ED visits
// runs up the Y axis. Reads like a skyline beneath the map instead of a
// narrow vertical leaderboard. Shared with LabCasesNeighborhoodMap via
// buildChoroplethBarSpec — see choroplethBarSpec.js for the hover/selection
// param mechanics. Plots "pct" (not a "rate") since this is ED-visit share,
// not a per-100k rate — see FIELD_SPECS / buildUhfDataByGeocode above for
// where the pct field comes from.
const HISTO_SPEC = buildChoroplethBarSpec(
  [
    { field: "name", title: "Neighborhood" },
    { field: "pctTooltip", title: "Overall respiratory illness" },
  ],
  "pct"
);

// ── At-a-Glance snapshot rows ─────────────────────────────────────────────────

// Renders a stat value, or "Suppressed" (with a title tooltip explaining
// why) when RPU has masked it for a small numerator. Neither of this map's
// two metrics is currently masked in RPU's file, but per-neighborhood
// suppression is a normal condition for this kind of data (see the
// per-virus case-rate maps, which do have masked values today), so this
// stays null-safe rather than assuming a number is always present.
function StatValue({ value }) {
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
  return <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{value}%</span>;
}

function SnapshotRows({ data, groupNote }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);

  const rowStyle = (key) => ({
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "8px",
    padding: "4px 6px",
    borderRadius: "4px",
    cursor: "text",
    userSelect: "text",
    backgroundColor: hoveredRow === key ? "var(--gray-100)" : "transparent",
    transition: "background-color 100ms",
  });

  return (
    <>
      <div className="px-2 py-2 flex flex-col gap-0.5">
        <div style={rowStyle("pct")} onMouseEnter={() => setHoveredRow("pct")} onMouseLeave={() => setHoveredRow(null)}>
          <StatValue value={data.pct} /> 
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">of ED visits</span>

        </div>
        <div style={rowStyle("hospPct")} onMouseEnter={() => setHoveredRow("hospPct")} onMouseLeave={() => setHoveredRow(null)}>
          <StatValue value={data.hospPct} /> 
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">of hospitalizations from the ED</span>
        </div>
        {/* RPU reports 15 of the 42 UHF42 neighborhoods as part of a
            combined UHF34 group (see neighborhoodGeoData.js's
            groupedWithNote) — this value isn't independent of its
            group-mates', so say so rather than let identical numbers
            across 2-3 neighborhoods look like a coincidence. */}
        {groupNote && (
          <p className="px-1.5 pt-0.5 text-2xs font-body text-[var(--gray-600)] italic leading-snug">
            {groupNote}
          </p>
        )}
      </div>
      <div
        className="px-3 pb-2 flex justify-between gap-2"
        style={{ color: "var(--footnote-gray)" }}
      >
        <div className="flex-1" />
        <p className="text-2xs font-body whitespace-nowrap"><DataAsOf date={WEEK_ENDING} /></p>
      </div>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const NeighborhoodMap = () => {
  const [pinnedGeocode, setPinnedGeocode] = React.useState(null);
  const [pinHovered, setPinHovered]       = React.useState(false);

  // ── Real UHF neighborhood data ────────────────────────────────────────────
  // Loads RPU's staged emergencyDeptData.csv (see useNeighborhoodGeoCsv for
  // why this reads from public/data instead of the live DATA_PATHS.ed feed
  // for now) and turns its "by neighborhood" rows into a geocode-keyed
  // lookup, splitting the 7 combined-UHF34 submetrics into their component
  // UHF42 codes along the way (see neighborhoodGeoData.js).
  const { edRows } = useNeighborhoodGeoCsv();
  const dataByGeocode = useMemo(
    () => buildUhfDataByGeocode(edRows, FIELD_SPECS),
    [edRows]
  );

  // Domain/color scale depend on the loaded data, so — unlike the old
  // hardcoded CD_DATA version — these can no longer be module-level
  // constants. Falls back to a [0, 1] domain before any data has loaded so
  // makeColorScale never divides by an Infinity/-Infinity range.
  const pctDomain = useMemo(() => {
    const values = Object.values(dataByGeocode)
      .map((d) => d.pct)
      .filter((v) => v != null);
    return values.length ? domainFromValues(values) : [0, 1];
  }, [dataByGeocode]);
  const getColor = useMemo(() => makeColorScale(COLORS, pctDomain), [pctDomain]);
  const gradientCss = useMemo(() => stopsToCssGradient(COLORS), []);

  // Unweighted average of loaded neighborhoods' pct — see
  // averageAcrossNeighborhoods's doc comment for why this isn't a true
  // citywide statistic.
  const citywidePct = averageAcrossNeighborhoods(dataByGeocode, "pct") ?? CITYWIDE_PCT_FALLBACK;

  const getFeatureStyle = React.useCallback(
    (geocode, selectedGeocode, pinned) => featureStyle(geocode, selectedGeocode, pinned, dataByGeocode, getColor),
    [dataByGeocode, getColor]
  );

  const {
    mapContainerRef,
    chartAreaRef,
    leafletReady,
    geojson,
    mapError,
    loadingStatus,
    selectedGeocode,
    setSelectedGeocode,
    mapHoveredGeocode,
    hoveredBar,
    search,
    setSearch,
    suggestions,
    chartAreaHeight,
    handleChartNewView,
    getNeighborInDirection,
  } = useChoroplethMap({
    dataByGeocode,
    getFeatureStyle,
    hoverStrokeColor: "#555",
    initialChartHeight: 388,
    pinnedGeocode,
    logPrefix: "[NeighborhoodMap]",
  });

  // ── Arrow-key neighborhood navigation ──────────────────────────────────────
  // Moves to the nearest district whose centroid actually lies in the
  // pressed direction (see useChoroplethMap's getNeighborInDirection).
  // Previously this stepped ±1 through geocodes sorted borough-first, which
  // meant crossing a borough boundary could jump somewhere geographically
  // unrelated regardless of which arrow was pressed — e.g. Left from
  // Williamsburg/Greenpoint (301) landed on Williamsbridge/Baychester (212,
  // the last Bronx district before Brooklyn's start in that sort), and Right
  // landed on Brooklyn Hts/Fort Greene (302) — both just "previous/next in
  // the list," not actually left or right of Williamsburg.
  useEffect(() => {
    if (selectedGeocode == null) return;
    const handleKeyDown = (e) => {
      if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
      // Only intercept when not typing in an input
      if (document.activeElement?.tagName === "INPUT") return;
      const next = getNeighborInDirection(selectedGeocode, e.key);
      if (next == null) return;
      e.preventDefault();
      setSelectedGeocode(next);
      setSearch(dataByGeocode[next]?.name ?? "");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGeocode, getNeighborInDirection, setSelectedGeocode, setSearch, dataByGeocode]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedData    = selectedGeocode != null ? dataByGeocode[selectedGeocode] : null;
  const previewGeocode  = hoveredBar ?? mapHoveredGeocode;
  const previewData     = previewGeocode != null ? dataByGeocode[previewGeocode] : null;
  const showHoverLayer  = Boolean(previewData && previewGeocode !== selectedGeocode);

  // Vega-Lite chart data. Neighborhoods with a suppressed (null) pct are
  // left out of the ranked bar chart / table entirely rather than plotted
  // as zero — matches how the per-virus case-rate maps handle RPU's masked
  // values. Recomputed when dataByGeocode or the color scale change (was
  // `[]` when this read a static CD_DATA constant; now both are derived
  // from the loaded CSV).
  const chartData = useMemo(
    () =>
      Object.entries(dataByGeocode)
        .filter(([, d]) => d.pct != null)
        .map(([geocode, d]) => ({
          geocode,
          name:       d.name,
          pct:        d.pct,
          hospPct:    d.hospPct,
          fillColor:  getColor(d.pct),
          barOpacity: 0.82,
        })),
    [dataByGeocode, getColor]
  );

  const suppressedCount = Object.keys(dataByGeocode).length - chartData.length;

  // Same data as chartData, sorted for the AccessibleTable fallback (the
  // Vega bar chart is visually pre-sorted by its spec; the table needs that
  // order explicitly since it doesn't go through Vega's sort transform).
  const rankedTableData = useMemo(
    () => [...chartData].sort((a, b) => b.pct - a.pct),
    [chartData]
  );

  // Comparison mode: pinned + a different CD is selected/hovered
  const compareData    = pinnedGeocode != null && pinnedGeocode !== selectedGeocode
    ? dataByGeocode[pinnedGeocode] : null;
  const inCompareMode  = Boolean(compareData && selectedData);
  const compareGroupNote = inCompareMode
    ? (() => { const n = groupedWithNote(compareData, dataByGeocode); return n ? `${compareData.name}: ${n}` : null; })()
    : null;
  const currentGroupNote = inCompareMode
    ? (() => { const d = previewData ?? selectedData; const n = groupedWithNote(d, dataByGeocode); return n ? `${d.name}: ${n}` : null; })()
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  // v2 layout: header (title + inline search) → [map | At-a-Glance + caption]
  // row, both narrow and natural-height on the right → full-width bar chart
  // beneath the whole row.
  return (
    <div className="w-full">
      {/* Header row — title left, search inline top-right */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-md mb-md">
        <div>
          <h3 className="text-[var(--content-title-size)] font-heading font-semibold tracking-tight text-[var(--content-title-color,var(--gray-900))]">
            What&rsquo;s happening in your neighborhood
          </h3>
          <p className="text-md font-body text-[var(--gray-700)] mt-xs">
            Overall respiratory illness ED visits in the past week
          </p>
        </div>

        <div className="w-full sm:w-96 flex-shrink-0">
          <NeighborhoodSearchInput
            id="home-neighborhood-search"
            value={search}
            onChange={(val) => {
              setSearch(val);
              // Search box emptied out — clear the selection and let the
              // map effect above fly back out to the full citywide view.
              if (val.trim() === "") setSelectedGeocode(null);
            }}
            onSelect={([geocode, data]) => {
              setSelectedGeocode(parseInt(geocode, 10));
              setSearch(data.name);
            }}
            selectedGeocode={selectedGeocode}
            suggestions={suggestions}
          />
          {/* Keyboard nav hint — shown only after a CD is selected */}
          {selectedGeocode != null && (
            <p className="mt-xs text-2xs font-body text-[var(--gray-600)] leading-tight text-right">
              ↑ ↓ to navigate neighborhoods
            </p>
          )}
        </div>
      </div>

      {/* ── Map + At-a-Glance/caption row (both narrow, natural height) ── */}
      <div className="flex flex-col sm:flex-row gap-md items-start">

        {/* Map — sized to comfortably fit the right column's content
             (At-a-Glance card + caption + bar chart) at 384px wide without
             the column needing to scroll in the normal selected state. */}
        <div className="flex-1 min-w-0 rounded-md overflow-hidden border border-[var(--gray-200)] relative"
             style={{ height: "520px" }}>
          {/* The map itself isn't keyboard-operable (Leaflet polygon click/hover
              only) — this note gives keyboard and screen-reader users the actual
              accessible path: the search box + arrow-key navigation below, and
              the ranked data table further down. */}
          <p id="neighborhood-map-instructions" className="sr-only">
            Interactive map of NYC neighborhoods. This map is not operable by
            keyboard — use the search box below to find and select a
            neighborhood by name or ZIP code. Once a neighborhood is
            selected, use the arrow keys to move to an adjacent one. A full
            ranked data table is also
            available below the chart.
          </p>
          {mapError ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-600)]">
              Map could not be loaded. Please check your connection and try refreshing.
            </div>
          ) : !leafletReady || !geojson ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-600)]">
              {loadingStatus}
            </div>
          ) : null}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            aria-describedby="neighborhood-map-instructions"
            style={{ display: (leafletReady && geojson && !mapError) ? "block" : "none" }}
          />

          {/* Legend — top-left overlay (sits over NJ / open water on this extent) */}
          <div
            className="absolute top-2 left-2 bg-white rounded border border-[var(--gray-200)] px-2 py-1.5 shadow-sm"
            style={{ zIndex: 1000 }}
          >
            <div
              className="w-28 h-2 rounded-sm"
              style={{ background: gradientCss }}
              aria-hidden="true"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {pctDomain[0].toFixed(1)}%
              </span>
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {pctDomain[1].toFixed(1)}%
              </span>
            </div>
            <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide mb-1">
              of ED visits
            </p>
          </div>
        </div>

        {/* ── Right: At-a-Glance card, dynamic caption, then the bar chart —
             widened a bit from the original narrow rail so the chart has
             room to breathe now that it lives in this column. Fixed height
             (matches the map's 520px) with the bar chart pinned to the
             bottom via sm:mt-auto below, so the chart's vertical position
             stays flush with the bottom of the map regardless of small
             height changes in the card/caption above it. overflow-y-auto
             remains as a safety net for unusually long content (e.g.
             compare mode with long names). ── */}
        <div className="w-full sm:w-96 flex-shrink-0 flex flex-col gap-md sm:h-[520px] sm:overflow-y-auto">

          {/* At a Glance / compare card — hover and base layers are stacked
              via CSS Grid (both in the same grid cell) instead of absolute
              positioning, so the card auto-sizes to whichever layer is
              taller. (Absolute+inset-0 previously forced the hover
              "Preview" layer to match the base layer's — usually shorter —
              height, clipping its content via overflow-hidden.)
              min-h-[170px] pins the stats area to the height of its "full"
              content (header + SnapshotRows) at all times, including the
              empty/unselected placeholder. Without this, hovering a bar with
              nothing selected grew the card (short placeholder → tall
              preview), which pushed the bar chart down out from under the
              cursor, firing mouseout, shrinking the card back, moving the
              chart back up under the cursor, mouseover again — a genuine
              hover/layout feedback loop.

              The dynamic caption paragraph used to be its own separate
              bordered box below this card; it's now a second section inside
              the same outer border so the stats + narrative read as one
              card. It stays outside the hover/base grid swap above (i.e. it
              doesn't flicker to a "preview" version on hover) since it's
              describing the selection, not whatever's being hovered. */}
          <div
            className="rounded-lg overflow-hidden transition-all duration-200 flex-shrink-0"
            style={{
              border: inCompareMode
                ? "1.5px solid #f59e0b"
                : showHoverLayer
                ? "1.5px solid #93c5fd"
                : "1px solid var(--gray-300)",
              boxShadow: inCompareMode ? "0 0 0 3px #fef3c766" : "none",
            }}
          >
          <div className="grid min-h-[170px]">
          {/* Hover layer — fades in when previewing a different CD */}
          <div
            className="col-start-1 row-start-1 flex flex-col bg-white transition-opacity duration-200 z-10"
            style={{
              opacity:       showHoverLayer ? 1 : 0,
              pointerEvents: showHoverLayer ? "auto" : "none",
            }}
            aria-hidden={!showHoverLayer}
          >
            <div className="px-3 py-2.5 border-b border-blue-100 bg-blue-50">
              <p className="text-2xs font-semibold font-body text-blue-600 uppercase tracking-widest mb-0.5">
                Preview
              </p>
              <p className="text-sm font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                {previewData?.name ?? ""}
              </p>
            </div>
            {previewData && <SnapshotRows data={previewData} groupNote={groupedWithNote(previewData, dataByGeocode)} />}
          </div>

          {/* Base layer */}
          <div
            className="col-start-1 row-start-1 flex flex-col bg-white transition-opacity duration-200"
            style={{ opacity: showHoverLayer ? 0 : 1 }}
          >
            {selectedData ? (
              <>
                <div className="px-3 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-100)] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-widest mb-0.5">
                      {inCompareMode ? "Comparing" : "At a Glance"}
                    </p>
                    <p className="text-sm font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                      {selectedData.name}
                    </p>
                  </div>
                  {/* Pin button */}
                  {(() => {
                    const isPinned = pinnedGeocode === selectedGeocode;
                    return (
                      <button
                        onClick={() => setPinnedGeocode(isPinned ? null : selectedGeocode)}
                        onMouseEnter={() => setPinHovered(true)}
                        onMouseLeave={() => setPinHovered(false)}
                        className="flex-shrink-0 flex items-center gap-1 rounded px-1.5 py-1 transition-all duration-150"
                        style={{
                          cursor: "pointer",
                          backgroundColor: isPinned
                            ? "#fef3c7"
                            : pinHovered ? "var(--gray-200)" : "transparent",
                          color: isPinned ? "#b45309" : pinHovered ? "var(--gray-700)" : "var(--gray-600)",
                          border: isPinned ? "1px solid #fde68a" : "1px solid transparent",
                        }}
                        aria-label={isPinned ? "Unpin neighborhood" : "Pin for comparison"}
                        title={isPinned ? "Unpin" : "Pin to compare with another neighborhood"}
                      >
                        <PinIcon filled={isPinned} size={12} />
                        <span className="text-2xs font-semibold font-body whitespace-nowrap">
                          {isPinned ? "Pinned" : "Pin to compare"}
                        </span>
                      </button>
                    );
                  })()}
                </div>

                {/* Either the normal single-neighborhood snapshot, or — while
                    comparing — the delta table instead of both stacked
                    (the "Selected" column already covers the current stats, so
                    showing SnapshotRows too was pure duplication). */}
                {inCompareMode ? (
                  <>
                    <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
                      <p className="text-2xs font-body text-[var(--gray-600)] truncate">
                        vs <span className="font-semibold text-amber-700">{compareData.name}</span>
                      </p>
                      <button
                        onClick={() => setPinnedGeocode(null)}
                        className="flex-shrink-0 text-[var(--gray-600)] hover:text-[var(--gray-700)] transition-colors text-2xs leading-none"
                        style={{ cursor: "pointer" }}
                        aria-label="Exit comparison"
                        title="Exit comparison"
                      >✕</button>
                    </div>
                    <CompareRows
                      pinned={compareData}
                      current={previewData ?? selectedData}
                      fields={[
                        { key: "pct", label: "ED visits", suffix: " pts", format: (v) => `${v}%` },
                        { key: "hospPct", label: "Hospitalizations", suffix: " pts", format: (v) => `${v}%` },
                      ]}
                    />
                    {/* Either side of a comparison can be one of the 15
                        grouped neighborhoods — flag it so a "these two
                        match exactly" read isn't mistaken for coincidence
                        when it's actually the same underlying RPU value. */}
                    {(compareGroupNote || currentGroupNote) && (
                      <p className="px-3 pb-1.5 text-2xs font-body text-[var(--gray-600)] italic leading-snug">
                        {[compareGroupNote, currentGroupNote].filter(Boolean).join(" ")}
                      </p>
                    )}
                  </>
                ) : (
                  <SnapshotRows data={selectedData} groupNote={groupedWithNote(selectedData, dataByGeocode)} />
                )}
              </>
            ) : (
              <div className="px-3 py-4 bg-[var(--gray-100)]">
                <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-widest mb-1.5">
                  At a Glance
                </p>
                <p className="text-xs font-body text-[var(--gray-600)] leading-relaxed">
                  Click a neighborhood on the map or search above.
                </p>
              </div>
            )}
          </div>
          </div>

          {/* Dynamic caption — same card, second section. Only rendered once
              something is selected; the empty-state placeholder above
              already covers the "click a neighborhood" prompt, so repeating
              it here would just duplicate that message within one card. */}
          {selectedData && (
            <div className="border-t border-[var(--gray-200)] bg-[var(--gray-100)] px-md py-md text-sm font-body text-[var(--gray-700)] leading-relaxed">
              {selectedData.pct == null ? (
                <p>
                  RPU has suppressed this week's ED-visit rate for{" "}
                  <strong>{selectedData.name}</strong> — the underlying case
                  count is too small to report reliably.
                </p>
              ) : (
                <>
                  <p>
                    In <strong>{selectedData.name}</strong>, respiratory illnesses
                    were <strong>{selectedData.pct}%</strong> of ED
                    visits for the week ending <strong>{WEEK_ENDING}</strong>.

                    This is{" "}
                    <strong
                      style={{
                        color:
                          selectedData.pct > citywidePct ? "#b91c1c"
                            : selectedData.pct < citywidePct ? "#065f46"
                            : "inherit",
                      }}
                    >
                      {selectedData.pct > citywidePct ? "more than"
                        : selectedData.pct < citywidePct ? "less than"
                        : "equal to"}
                    </strong>{" "}
                    the Citywide value of <strong>{citywidePct}%</strong>.
                  </p>
                </>
              )}
              {groupedWithNote(selectedData, dataByGeocode) && (
                <p className="mt-sm text-xs italic">
                  {groupedWithNote(selectedData, dataByGeocode)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Bar chart — moved into the right column, beneath the dynamic
             caption, flipped to column bars, with a dashed citywide-average
             reference line. Fixed (not flex-1) so its size is predictable
             regardless of how tall the card/caption above it get. ── */}
        <div
          className="w-full flex-shrink-0 sm:mt-auto rounded-md border border-[var(--gray-200)] flex flex-col"
          style={{ height: "190px" }}
          aria-label={`Neighborhoods ranked by percent of ED visits, highest to lowest, with a dashed line at the citywide value of ${citywidePct}%${suppressedCount ? `. ${suppressedCount} neighborhood(s) omitted — data suppressed` : ""} — hover for details, click to highlight on map`}
        >
          {/* Header */}
          <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide leading-tight">
                Click to select
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="inline-block w-3 border-t border-dashed" style={{ borderColor: "#6b7280" }} aria-hidden="true" />
              <span className="text-2xs font-body text-[var(--gray-600)] whitespace-nowrap">
                Citywide ({citywidePct}%)
              </span>
            </div>
          </div>

          {/* Vega-Lite chart — decorative/visual only; the equivalent ranked
              data is exposed to screen readers via the AccessibleTable below,
              since neither this chart's bars nor the map's polygons are
              keyboard- or screen-reader-operable. Suppressed neighborhoods
              (null pct) are already filtered out of chartData, so they
              simply don't appear as bars rather than plotting as 0. */}
          <div ref={chartAreaRef} className="flex-1 min-h-0 overflow-hidden" aria-hidden="true">
            <VegaLiteWrapper
              data={chartData}
              specTemplate={HISTO_SPEC}
              dynamicFields={{
                chartHeight: chartAreaHeight,
                selectedColor: "#1E40AF",
                hoverColor: "#3f5fc9",
                benchmarkValue: citywidePct,
                benchmarkLabel: `Citywide: ${citywidePct}%`,
              }}
              rendererMode="svg"
              onNewView={handleChartNewView}
            />
          </div>

          {/* Non-visual fallback — full ranked list, reachable by keyboard/
              screen reader regardless of map or chart interaction. Mirrors
              the chart in excluding suppressed neighborhoods from the
              ranking (rather than a screen-reader user seeing entries the
              sighted chart doesn't show), with a plain-text note below
              instead so the omission isn't silent either way. */}
          <AccessibleTable
            data={rankedTableData}
            columns={[
              { key: "name", header: "Neighborhood", format: "text" },
              { key: "pct", header: "Percent of ED visits", format: "percent" },
              { key: "hospPct", header: "percent of hospitalizations from the ED that are for ORI", format: "percent" },
            ]}
            caption="Neighborhood respiratory illness, percent of ED visits, ranked highest to lowest"
            srOnly
            allowToggleForSighted
          />
          {suppressedCount > 0 && (
            <p className="sr-only">
              {suppressedCount} additional neighborhood(s) omitted — RPU has
              suppressed their ED-visit rate because the underlying case
              count is too small to report reliably.
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default NeighborhoodMap;
