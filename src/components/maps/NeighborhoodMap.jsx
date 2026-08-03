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
 * Data: placeholder — swap CD_DATA for real API/CSV values when available.
 * Map:  GeoJSON from NYC Health EHDP repository (Community Districts).
 * Tiles: CartoDB Positron no-labels (per RPU request: no city names).
 * Leaflet loaded dynamically from unpkg CDN to avoid bundling it.
 *
 * Map lifecycle, GeoJSON fetch, feature click/hover, search suggestions,
 * and the linked bar chart's view lifecycle are shared with
 * LabCasesNeighborhoodMap via useChoroplethMap — see that file for the
 * common behavior. Pin-to-compare (PinIcon + CompareRows pattern) is also
 * shared in spirit with LabCasesNeighborhoodMap, just with pct/rate swapped
 * for that map's rate/count fields. This component owns the parts unique to
 * the home page: fixed (non-virus) color scale and arrow-key navigation.
 */

import React, { useEffect, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";
import DataAsOf from "../charts/DataAsOf";
import AccessibleTable from "../accessibility/AccessibleTable";
import useChoroplethMap, { WEEK_ENDING } from "./useChoroplethMap";
import { buildChoroplethBarSpec } from "./choroplethBarSpec";
import { makeColorScale, domainFromValues, stopsToCssGradient } from "../../utils/colorScale";
import PinIcon from "./PinIcon";

// ── Constants ─────────────────────────────────────────────────────────────────

const CITYWIDE_PCT = 8.4;

// ── Placeholder data (keyed by GEOCODE integer) ───────────────────────────────
// pct  = % of ED visits with respiratory illness diagnosis
// rate = rate per 100,000 residents

const CD_DATA = {
  101: { name: "Financial District",           pct:  7.2, rate: 11.8 },
  102: { name: "Greenwich Village/SoHo",       pct:  6.8, rate: 10.2 },
  103: { name: "Lower East Side/Chinatown",    pct:  9.4, rate: 16.1 },
  104: { name: "Chelsea/Hell's Kitchen",       pct:  7.5, rate: 12.3 },
  105: { name: "Midtown",                      pct:  6.1, rate:  9.4 },
  106: { name: "Stuyvesant Town/Turtle Bay",   pct:  7.0, rate: 11.0 },
  107: { name: "Upper West Side",              pct:  7.3, rate: 11.5 },
  108: { name: "Upper East Side",              pct:  6.5, rate:  9.8 },
  109: { name: "Morningside Hts/Hamilton Hts", pct:  9.8, rate: 17.2 },
  110: { name: "Central Harlem",               pct: 11.2, rate: 20.8 },
  111: { name: "East Harlem",                  pct: 12.1, rate: 23.4 },
  112: { name: "Washington Heights/Inwood",    pct: 10.7, rate: 19.6 },
  201: { name: "Mott Haven/Port Morris",       pct: 14.3, rate: 28.1 },
  202: { name: "Hunts Point/Longwood",         pct: 15.8, rate: 31.9 },
  203: { name: "Morrisania/Crotona",           pct: 13.9, rate: 27.0 },
  204: { name: "Concourse/Highbridge",         pct: 12.4, rate: 23.8 },
  205: { name: "Fordham/University Heights",   pct: 11.7, rate: 22.0 },
  206: { name: "Belmont/East Tremont",         pct: 12.8, rate: 24.7 },
  207: { name: "Kingsbridge Hts/Mosholu",      pct: 10.3, rate: 18.4 },
  208: { name: "Riverdale/Fieldston",          pct:  7.6, rate: 12.2 },
  209: { name: "Parkchester/Soundview",        pct: 13.1, rate: 25.3 },
  210: { name: "Throgs Neck/Co-op City",       pct:  9.8, rate: 17.5 },
  211: { name: "Morris Park/Bronxdale",        pct: 10.4, rate: 18.9 },
  212: { name: "Williamsbridge/Baychester",    pct: 11.2, rate: 20.5 },
  301: { name: "Williamsburg/Greenpoint",      pct:  8.7, rate: 14.8 },
  302: { name: "Brooklyn Hts/Fort Greene",     pct:  7.4, rate: 11.9 },
  303: { name: "Bedford Stuyvesant",           pct: 11.8, rate: 22.3 },
  304: { name: "Bushwick",                     pct: 12.3, rate: 23.7 },
  305: { name: "East New York/Starrett City",  pct: 14.7, rate: 29.1 },
  306: { name: "Park Slope/Carroll Gardens",   pct:  6.9, rate: 10.6 },
  307: { name: "Sunset Park",                  pct:  9.2, rate: 15.8 },
  308: { name: "Crown Heights North",          pct: 11.5, rate: 21.4 },
  309: { name: "Crown Heights South",          pct: 10.8, rate: 19.7 },
  310: { name: "Bay Ridge/Dyker Heights",      pct:  8.4, rate: 13.9 },
  311: { name: "Bensonhurst/Bath Beach",       pct:  8.9, rate: 14.7 },
  312: { name: "Borough Park",                 pct:  9.7, rate: 16.8 },
  313: { name: "Coney Island/Gravesend",       pct: 10.2, rate: 18.1 },
  314: { name: "Flatbush/Midwood",             pct:  9.5, rate: 16.4 },
  315: { name: "Sheepshead Bay",               pct:  8.6, rate: 14.3 },
  316: { name: "Brownsville/Ocean Hill",       pct: 14.1, rate: 27.8 },
  317: { name: "East Flatbush/Farragut",       pct: 12.6, rate: 24.1 },
  318: { name: "Canarsie/Flatlands",           pct: 10.9, rate: 19.9 },
  401: { name: "Astoria",                      pct:  8.3, rate: 13.6 },
  402: { name: "Woodside/Sunnyside",           pct:  8.7, rate: 14.5 },
  403: { name: "Jackson Heights",              pct:  9.1, rate: 15.6 },
  404: { name: "Elmhurst/Corona",              pct: 10.4, rate: 18.8 },
  405: { name: "Ridgewood/Maspeth",            pct:  8.8, rate: 14.9 },
  406: { name: "Rego Park/Forest Hills",       pct:  7.9, rate: 12.8 },
  407: { name: "Flushing/Whitestone",          pct:  8.5, rate: 14.1 },
  408: { name: "Hillcrest/Fresh Meadows",      pct:  8.2, rate: 13.3 },
  409: { name: "Ozone Park/Woodhaven",         pct:  9.6, rate: 16.6 },
  410: { name: "Howard Beach/Rockaway Park",   pct:  8.9, rate: 15.0 },
  411: { name: "Bayside/Douglaston",           pct:  7.6, rate: 12.0 },
  412: { name: "Jamaica/Hollis",               pct: 12.8, rate: 24.9 },
  413: { name: "Queens Village",               pct: 11.3, rate: 21.1 },
  414: { name: "Rockaway/Broad Channel",       pct: 11.9, rate: 22.7 },
  501: { name: "St. George/Stapleton",         pct:  9.4, rate: 16.2 },
  502: { name: "South Beach/Willowbrook",      pct:  8.7, rate: 14.6 },
  503: { name: "Tottenville/Great Kills",      pct:  7.8, rate: 12.5 },
};

// Mean rate across all 58 CDs — used as a reference line on the bar chart so
// the bars have a benchmark to read against instead of floating unlabeled.
const CD_RATE_VALUES = Object.values(CD_DATA).map((d) => d.rate);
const AVG_RATE = +(CD_RATE_VALUES.reduce((sum, r) => sum + r, 0) / CD_RATE_VALUES.length).toFixed(1);

// ── Choropleth color scale (ARI blue-teal gradient) ──────────────────────────
// Continuous interpolation across these stops (low → high), scaled to the
// actual min/max rate in CD_DATA — no hardcoded breakpoints, so two
// neighborhoods a point apart never get bucketed into the same flat color.

const COLORS = ["#cde8ec", "#629FAA", "#387781", "#1E5A6B", "#0D3D4D"];
const HIGHLIGHT_STROKE = "#1E40AF";

const RATE_DOMAIN = domainFromValues(Object.values(CD_DATA).map((d) => d.rate));
const GRADIENT_CSS = stopsToCssGradient(COLORS);

// Fixed fill opacity across all states (default/hover/selected). Previously
// selection bumped this to 1.0 (from 0.72), which reads as a color/value
// change rather than a "this one is selected" cue — a district could look
// like it jumped up a category next to an unselected neighbor in the same
// bin. Selection is now communicated only via stroke (color + weight) plus
// the existing fly-to-selection zoom, so fill color stays a true read of
// the underlying rate regardless of interaction state.
const FILL_OPACITY = 0.82;

const getColor = makeColorScale(COLORS, RATE_DOMAIN);

function featureStyle(geocode, selectedGeocode) {
  const d   = CD_DATA[geocode];
  const sel = geocode === selectedGeocode;
  return {
    fillColor:   getColor(d?.rate),
    fillOpacity: FILL_OPACITY,
    color:       sel ? HIGHLIGHT_STROKE : "#ffffff",
    weight:      sel ? 2.5 : 0.8,
  };
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────
// Column orientation: neighborhoods run left→right along X, rate runs up the
// Y axis. Reads like a skyline beneath the map instead of a narrow vertical
// leaderboard. Shared with LabCasesNeighborhoodMap via buildChoroplethBarSpec
// — see choroplethBarSpec.js for the hover/selection param mechanics.
const HISTO_SPEC = buildChoroplethBarSpec([
  { field: "name", title: "Neighborhood" },
  { field: "rate", title: "Rate per 100,000" },
]);

// ── At-a-Glance snapshot rows ─────────────────────────────────────────────────

function SnapshotRows({ data }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);

  const diff      = data.pct - CITYWIDE_PCT;
  const diffLabel = diff > 0 ? `+${diff.toFixed(1)} pts vs. citywide` : `${diff.toFixed(1)} pts vs. citywide`;
  const diffColor = diff > 0 ? "#b91c1c" : "#065f46";
  const diffBg    = diff > 0 ? "#fef2f2" : "#f0fdf4";

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
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">% of ED visits</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.pct}%</span>
        </div>
        <div style={rowStyle("rate")} onMouseEnter={() => setHoveredRow("rate")} onMouseLeave={() => setHoveredRow(null)}>
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">Rate per 100,000</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.rate}</span>
        </div>
        <div style={rowStyle("diff")} onMouseEnter={() => setHoveredRow("diff")} onMouseLeave={() => setHoveredRow(null)}>
          <span
            className="text-2xs font-medium px-1.5 py-0.5 rounded-full leading-snug"
            style={{ color: diffColor, backgroundColor: diffBg }}
          >
            {diffLabel}
          </span>
        </div>
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

// ── Comparison rows (side-by-side with delta) ─────────────────────────────────

function CompareRows({ pinned, current }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);

  const metrics = [
    {
      key:    "pct",
      label:  "% of ED visits",
      aVal:   `${pinned.pct}%`,
      bVal:   `${current.pct}%`,
      delta:  +(current.pct - pinned.pct).toFixed(1),
      suffix: " pts",
    },
    {
      key:    "rate",
      label:  "Rate / 100k",
      aVal:   pinned.rate,
      bVal:   current.rate,
      delta:  +(current.rate - pinned.rate).toFixed(1),
      suffix: "",
    },
  ];

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
        const positive  = delta > 0;
        const deltaStr  = `${positive ? "+" : ""}${delta}${suffix}`;
        const dColor    = delta === 0 ? "var(--gray-600)" : positive ? "#b91c1c" : "#065f46";

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

// ── Component ─────────────────────────────────────────────────────────────────

const NeighborhoodMap = () => {
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
  } = useChoroplethMap({
    dataByGeocode: CD_DATA,
    getFeatureStyle: featureStyle,
    hoverStrokeColor: "#555",
    initialChartHeight: 388,
    logPrefix: "[NeighborhoodMap]",
  });

  const [pinnedGeocode, setPinnedGeocode] = React.useState(null);
  const [pinHovered, setPinHovered]       = React.useState(false);

  // ── Arrow-key neighborhood navigation ──────────────────────────────────────
  // Geocodes sorted borough-first (hundreds digit) then district (ones/tens)
  const sortedGeocodes = useMemo(
    () => Object.keys(CD_DATA).map(Number).sort((a, b) => a - b),
    []
  );

  useEffect(() => {
    if (selectedGeocode == null) return;
    const handleKeyDown = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      // Only intercept when not typing in an input
      if (document.activeElement?.tagName === "INPUT") return;
      e.preventDefault();
      const idx = sortedGeocodes.indexOf(selectedGeocode);
      if (idx === -1) return;
      const delta = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : -1;
      const next  = sortedGeocodes[(idx + delta + sortedGeocodes.length) % sortedGeocodes.length];
      setSelectedGeocode(next);
      setSearch(CD_DATA[next]?.name ?? "");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGeocode, sortedGeocodes, setSelectedGeocode, setSearch]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedData    = selectedGeocode != null ? CD_DATA[selectedGeocode] : null;
  const previewGeocode  = hoveredBar ?? mapHoveredGeocode;
  const previewData     = previewGeocode != null ? CD_DATA[previewGeocode] : null;
  const showHoverLayer  = Boolean(previewData && previewGeocode !== selectedGeocode);

  // Vega-Lite chart data — static (doesn't depend on selection/hover state
  // anymore). Selected/hover highlighting is handled natively inside the
  // Vega spec via params (see HISTO_SPEC + useChoroplethMap's selectedSig
  // effect), so this never needs to be recomputed on interaction.
  const chartData = useMemo(
    () =>
      Object.entries(CD_DATA).map(([geocode, d]) => ({
        geocode,
        name:       d.name,
        pct:        d.pct,
        rate:       d.rate,
        fillColor:  getColor(d.rate),
        barOpacity: 0.82,
      })),
    []
  );

  // Same data as chartData, sorted for the AccessibleTable fallback (the
  // Vega bar chart is visually pre-sorted by its spec; the table needs that
  // order explicitly since it doesn't go through Vega's sort transform).
  const rankedTableData = useMemo(
    () => [...chartData].sort((a, b) => b.rate - a.rate),
    [chartData]
  );

  // Comparison mode: pinned + a different CD is selected/hovered
  const compareData    = pinnedGeocode != null && pinnedGeocode !== selectedGeocode
    ? CD_DATA[pinnedGeocode] : null;
  const inCompareMode  = Boolean(compareData && selectedData);

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
            What&rsquo;s happening in your neighborhood?
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
              ↑ ↓ ← → to navigate neighborhoods
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
            neighborhood. Once a neighborhood is selected, use the arrow keys
            to move to an adjacent one. A full ranked data table is also
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
            <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide mb-1">
              Rate per 100k
            </p>
            <div
              className="w-28 h-2 rounded-sm"
              style={{ background: GRADIENT_CSS }}
              aria-hidden="true"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {RATE_DOMAIN[0].toFixed(0)}
              </span>
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {RATE_DOMAIN[1].toFixed(0)}
              </span>
            </div>
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
              min-h-[170px] pins the card to the height of its "full" content
              (header + SnapshotRows) at all times, including the empty/
              unselected placeholder. Without this, hovering a bar with
              nothing selected grew the card (short placeholder → tall
              preview), which pushed the bar chart down out from under the
              cursor, firing mouseout, shrinking the card back, moving the
              chart back up under the cursor, mouseover again — a genuine
              hover/layout feedback loop. */}
          <div
            className="grid min-h-[170px] rounded-lg overflow-hidden transition-all duration-200 flex-shrink-0"
            style={{
              border: inCompareMode
                ? "1.5px solid #f59e0b"
                : showHoverLayer
                ? "1.5px solid #93c5fd"
                : "1px solid var(--gray-300)",
              boxShadow: inCompareMode ? "0 0 0 3px #fef3c766" : "none",
            }}
          >
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
            {previewData && <SnapshotRows data={previewData} />}
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
                    />
                  </>
                ) : (
                  <SnapshotRows data={selectedData} />
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

        {/* Dynamic caption — natural height, stays the width of this narrow
            column (not stretched to the full-width bar chart below). */}
        <div className="flex-shrink-0 rounded-md bg-[var(--gray-100)] border border-[var(--gray-200)] px-md py-md text-sm font-body text-[var(--gray-700)] leading-relaxed">
          {selectedData ? (
            <>
              <p>
                In <strong>{selectedData.name}</strong>, respiratory illnesses
                accounted for{" "}
                <strong className="text-[var(--blue-primary)]">{selectedData.pct}%</strong>{" "}
                of ED visits for the week ending <strong>{WEEK_ENDING}</strong>.
              </p>
              <p className="mt-sm">
                This is{" "}
                <strong>
                  {selectedData.pct > CITYWIDE_PCT ? "more than"
                    : selectedData.pct < CITYWIDE_PCT ? "less than"
                    : "equal to"}
                </strong>{" "}
                the Citywide value of <strong>{CITYWIDE_PCT}%</strong>.
              </p>
            </>
          ) : (
            <p className="text-[var(--gray-600)]">
              Click a neighborhood on the map or search above to see local data.
            </p>
          )}
        </div>

        {/* ── Bar chart — moved into the right column, beneath the dynamic
             caption, flipped to column bars, with a dashed citywide-average
             reference line. Fixed (not flex-1) so its size is predictable
             regardless of how tall the card/caption above it get. ── */}
        <div
          className="w-full flex-shrink-0 sm:mt-auto rounded-md border border-[var(--gray-200)] flex flex-col"
          style={{ height: "190px" }}
          aria-label={`Neighborhood rates ranked, highest to lowest, with a dashed line at the citywide average of ${AVG_RATE} per 100,000 — hover for details, click to highlight on map`}
        >
          {/* Header */}
          <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide leading-tight">
                Rate per 100,000 · Click to select
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="inline-block w-3 border-t border-dashed" style={{ borderColor: "#6b7280" }} aria-hidden="true" />
              <span className="text-2xs font-body text-[var(--gray-600)] whitespace-nowrap">
                NYC avg ({AVG_RATE})
              </span>
            </div>
          </div>

          {/* Vega-Lite chart — decorative/visual only; the equivalent ranked
              data is exposed to screen readers via the AccessibleTable below,
              since neither this chart's bars nor the map's polygons are
              keyboard- or screen-reader-operable. */}
          <div ref={chartAreaRef} className="flex-1 min-h-0 overflow-hidden" aria-hidden="true">
            <VegaLiteWrapper
              data={chartData}
              specTemplate={HISTO_SPEC}
              dynamicFields={{
                chartHeight: chartAreaHeight,
                selectedColor: "#1E40AF",
                hoverColor: "#387781",
                benchmarkValue: AVG_RATE,
                benchmarkLabel: `NYC average: ${AVG_RATE} / 100,000`,
              }}
              rendererMode="svg"
              onNewView={handleChartNewView}
            />
          </div>

          {/* Non-visual fallback — full ranked list, reachable by keyboard/
              screen reader regardless of map or chart interaction. */}
          <AccessibleTable
            data={rankedTableData}
            columns={[
              { key: "name", header: "Neighborhood", format: "text" },
              { key: "rate", header: "Rate per 100,000", format: "number" },
            ]}
            caption="Neighborhood respiratory illness ED-visit rates, ranked highest to lowest"
            srOnly
            allowToggleForSighted
          />
        </div>
        </div>
      </div>
    </div>
  );
};

export default NeighborhoodMap;
