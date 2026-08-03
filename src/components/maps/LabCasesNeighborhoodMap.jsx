/**
 * LabCasesNeighborhoodMap
 *
 * Neighborhood-level choropleth for lab-reported cases on virus data pages.
 * Appears after "cases by season" on the Flu, COVID-19, and RSV subpages.
 *
 * Receives `virus` prop (interpolated from section config via textVars).
 * Title is rendered by ContentContainer from the section config — this
 * component does NOT render its own title.
 *
 * Data: placeholder — swap LAB_CD_DATA for real API/CSV values per virus.
 * Map:  GeoJSON from NYC Health EHDP (Community Districts).
 * Tiles: CartoDB Positron no-labels.
 *
 * Map lifecycle, GeoJSON fetch, feature click/hover, search suggestions,
 * and the linked bar chart's view lifecycle are shared with NeighborhoodMap
 * (the home page map) via useChoroplethMap — see that file for the common
 * behavior. Pin-to-compare (PinIcon + CompareRows) mirrors NeighborhoodMap's
 * implementation, swapped to this map's rate/count fields. This component
 * owns the parts unique to data pages: per-virus color scales and the
 * section-title-in-header layout.
 */

import React, { useCallback, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";
import DataAsOf from "../charts/DataAsOf";
import { tokens } from "../../styles/tokens";
import useChoroplethMap, { WEEK_ENDING } from "./useChoroplethMap";
import { buildChoroplethBarSpec } from "./choroplethBarSpec";
import { makeColorScale, domainFromValues, stopsToCssGradient } from "../../utils/colorScale";
import PinIcon from "./PinIcon";

const CITYWIDE_RATE = 9.8; // cases per 100,000 — placeholder

// ── Placeholder lab case data (rate per 100k + estimated weekly count) ────────

const LAB_CD_DATA = {
  101: { name: "Financial District",           rate:  6.1, count:  8 },
  102: { name: "Greenwich Village/SoHo",       rate:  5.4, count:  9 },
  103: { name: "Lower East Side/Chinatown",    rate:  8.7, count: 18 },
  104: { name: "Chelsea/Hell's Kitchen",       rate:  6.9, count: 14 },
  105: { name: "Midtown",                      rate:  5.2, count:  7 },
  106: { name: "Stuyvesant Town/Turtle Bay",   rate:  6.3, count: 11 },
  107: { name: "Upper West Side",              rate:  7.0, count: 21 },
  108: { name: "Upper East Side",              rate:  5.8, count: 20 },
  109: { name: "Morningside Hts/Hamilton Hts", rate:  9.1, count: 16 },
  110: { name: "Central Harlem",               rate: 11.4, count: 19 },
  111: { name: "East Harlem",                  rate: 13.2, count: 17 },
  112: { name: "Washington Heights/Inwood",    rate: 10.8, count: 29 },
  201: { name: "Mott Haven/Port Morris",       rate: 17.6, count: 22 },
  202: { name: "Hunts Point/Longwood",         rate: 21.3, count: 19 },
  203: { name: "Morrisania/Crotona",           rate: 16.4, count: 24 },
  204: { name: "Concourse/Highbridge",         rate: 14.1, count: 31 },
  205: { name: "Fordham/University Heights",   rate: 12.9, count: 33 },
  206: { name: "Belmont/East Tremont",         rate: 15.2, count: 21 },
  207: { name: "Kingsbridge Hts/Mosholu",      rate: 11.7, count: 26 },
  208: { name: "Riverdale/Fieldston",          rate:  7.4, count: 14 },
  209: { name: "Parkchester/Soundview",        rate: 14.8, count: 28 },
  210: { name: "Throgs Neck/Co-op City",       rate: 10.3, count: 32 },
  211: { name: "Morris Park/Bronxdale",        rate: 11.1, count: 24 },
  212: { name: "Williamsbridge/Baychester",    rate: 12.0, count: 30 },
  301: { name: "Williamsburg/Greenpoint",      rate: 13.24, count: 29 },
  302: { name: "Brooklyn Hts/Fort Greene",     rate:  7.1, count: 15 },
  303: { name: "Bedford Stuyvesant",           rate: 13.6, count: 28 },
  304: { name: "Bushwick",                     rate: 14.1, count: 22 },
  305: { name: "East New York/Starrett City",  rate: 18.3, count: 34 },
  306: { name: "Park Slope/Carroll Gardens",   rate:  6.2, count: 13 },
  307: { name: "Sunset Park",                  rate: 10.5, count: 24 },
  308: { name: "Crown Heights North",          rate: 13.0, count: 25 },
  309: { name: "Crown Heights South",          rate: 11.9, count: 22 },
  310: { name: "Bay Ridge/Dyker Heights",      rate:  8.1, count: 20 },
  311: { name: "Bensonhurst/Bath Beach",       rate:  9.2, count: 26 },
  312: { name: "Borough Park",                 rate: 10.4, count: 31 },
  313: { name: "Coney Island/Gravesend",       rate: 11.7, count: 27 },
  314: { name: "Flatbush/Midwood",             rate: 10.0, count: 29 },
  315: { name: "Sheepshead Bay",               rate:  8.8, count: 22 },
  316: { name: "Brownsville/Ocean Hill",       rate: 17.0, count: 26 },
  317: { name: "East Flatbush/Farragut",       rate: 14.7, count: 31 },
  318: { name: "Canarsie/Flatlands",           rate: 11.5, count: 30 },
  401: { name: "Astoria",                      rate:  8.4, count: 19 },
  402: { name: "Woodside/Sunnyside",           rate:  8.9, count: 16 },
  403: { name: "Jackson Heights",              rate:  9.7, count: 21 },
  404: { name: "Elmhurst/Corona",              rate: 11.6, count: 27 },
  405: { name: "Ridgewood/Maspeth",            rate:  9.0, count: 20 },
  406: { name: "Rego Park/Forest Hills",       rate:  7.6, count: 18 },
  407: { name: "Flushing/Whitestone",          rate:  8.2, count: 23 },
  408: { name: "Hillcrest/Fresh Meadows",      rate:  7.9, count: 20 },
  409: { name: "Ozone Park/Woodhaven",         rate: 10.1, count: 22 },
  410: { name: "Howard Beach/Rockaway Park",   rate:  9.3, count: 18 },
  411: { name: "Bayside/Douglaston",           rate:  7.2, count: 15 },
  412: { name: "Jamaica/Hollis",               rate: 14.4, count: 32 },
  413: { name: "Queens Village",               rate: 12.1, count: 28 },
  414: { name: "Rockaway/Broad Channel",       rate: 13.3, count: 24 },
  501: { name: "St. George/Stapleton",         rate: 10.2, count: 18 },
  502: { name: "South Beach/Willowbrook",      rate:  9.4, count: 20 },
  503: { name: "Tottenville/Great Kills",      rate:  7.8, count: 19 },
};

// ── Color scales per virus ────────────────────────────────────────────────────
// Each array is a set of continuous gradient stops (low → high) — values are
// interpolated smoothly across them rather than snapped into fixed bins.

const HIGHLIGHT_STROKE = "#1a1a1a";

const VIRUS_COLORS = {
  "Flu": [
    "#d4eaec",
    tokens.colorScales.flu[3],
    tokens.colorScales.flu[2],
    tokens.colorScales.flu[0],
    tokens.colorScales.flu[1],
  ],
  "COVID-19": [
    "#ead5f7",
    tokens.colorScales.covid[3],
    tokens.colorScales.covid[2],
    tokens.colorScales.covid[0],
    tokens.colorScales.covid[1],
  ],
  "RSV": [
    "#f7d5cc",
    tokens.colorScales.rsv[3],
    tokens.colorScales.rsv[2],
    tokens.colorScales.rsv[1],
    tokens.colorScales.rsv[0],
  ],
};

const FALLBACK_COLORS = ["#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"];

// Shared across all viruses since they currently all read from the same
// placeholder LAB_CD_DATA — swap to a per-virus domain once each virus has
// its own real rate data.
const RATE_DOMAIN = domainFromValues(Object.values(LAB_CD_DATA).map((d) => d.rate));

// Fixed fill opacity across all states (default/hover/selected). Previously
// selection bumped this to 1.0 (from 0.72), which reads as a color/value
// change rather than a "this one is selected" cue — a district could look
// like it jumped up a category next to an unselected neighbor in the same
// bin. Selection is now communicated only via stroke (color + weight) plus
// the existing fly-to-selection zoom, so fill color stays a true read of
// the underlying rate regardless of interaction state.
const FILL_OPACITY = 0.82;

function getColors(virus) {
  return VIRUS_COLORS[virus] || FALLBACK_COLORS;
}

function getColor(rate, colors) {
  return makeColorScale(colors, RATE_DOMAIN)(rate);
}

function featureStyle(geocode, selectedGeocode, colors) {
  const d   = LAB_CD_DATA[geocode];
  const sel = geocode === selectedGeocode;
  return {
    fillColor:   getColor(d?.rate, colors),
    fillOpacity: FILL_OPACITY,
    color:       sel ? HIGHLIGHT_STROKE : "#ffffff",
    weight:      sel ? 2.5 : 0.8,
  };
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────
// Column orientation (neighborhoods left→right, rate up the Y axis) with a
// light y-axis for scale and a dashed rule at CITYWIDE_RATE for context —
// matches the home-page NeighborhoodMap chart. Shared via
// buildChoroplethBarSpec — see choroplethBarSpec.js. selectedColor/hoverColor
// are per-virus, so they're passed in via dynamicFields rather than hardcoded.
const HISTO_SPEC = buildChoroplethBarSpec([
  { field: "name",  title: "Neighborhood" },
  { field: "rate",  title: "Cases per 100,000" },
  { field: "count", title: "Est. weekly cases" },
]);

// ── At-a-Glance snapshot rows ─────────────────────────────────────────────────

function SnapshotRows({ data }) {
  const diff      = data.rate - CITYWIDE_RATE;
  const diffLabel = diff > 0
    ? `+${diff.toFixed(1)} vs. citywide`
    : `${diff.toFixed(1)} vs. citywide`;
  const diffColor = diff > 0 ? "#b91c1c" : "#065f46";
  const diffBg    = diff > 0 ? "#fef2f2" : "#f0fdf4";

  return (
    <>
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">Cases per 100,000</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.rate}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">Est. weekly cases</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.count}</span>
        </div>
        <span
          className="self-start text-2xs font-medium px-1.5 py-0.5 rounded-full leading-snug"
          style={{ color: diffColor, backgroundColor: diffBg }}
        >
          {diffLabel}
        </span>
      </div>
      <div
        className="px-3 pb-2.5 flex justify-between gap-2"
        style={{ color: "var(--footnote-gray)" }}
      >
        <div className="flex-1" />
        <p className="text-2xs font-body whitespace-nowrap"><DataAsOf date={WEEK_ENDING} /></p>
      </div>
    </>
  );
}

// ── Comparison rows (side-by-side with delta) ─────────────────────────────────
// Same pattern as NeighborhoodMap's CompareRows, with rate/count in place of
// that map's pct/rate fields.

function CompareRows({ pinned, current }) {
  const [hoveredRow, setHoveredRow] = React.useState(null);

  const metrics = [
    {
      key:    "rate",
      label:  "Cases / 100k",
      aVal:   pinned.rate,
      bVal:   current.rate,
      delta:  +(current.rate - pinned.rate).toFixed(1),
      suffix: "",
    },
    {
      key:    "count",
      label:  "Est. weekly cases",
      aVal:   pinned.count,
      bVal:   current.count,
      delta:  current.count - pinned.count,
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

const LabCasesNeighborhoodMap = ({ virus = "Flu", sectionTitle }) => {
  const colors = useMemo(() => getColors(virus), [virus]);
  const getFeatureStyle = useCallback(
    (geocode, selectedGeocode) => featureStyle(geocode, selectedGeocode, colors),
    [colors]
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
  } = useChoroplethMap({
    dataByGeocode: LAB_CD_DATA,
    getFeatureStyle,
    hoverStrokeColor: "#333",
    initialChartHeight: 150,
    logPrefix: "[LabCasesNeighborhoodMap]",
  });

  const [pinnedGeocode, setPinnedGeocode] = React.useState(null);
  const [pinHovered, setPinHovered]       = React.useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedData   = selectedGeocode != null ? LAB_CD_DATA[selectedGeocode] : null;
  const previewGeocode = hoveredBar ?? mapHoveredGeocode;
  const previewData    = previewGeocode != null ? LAB_CD_DATA[previewGeocode] : null;
  const showHoverLayer = Boolean(previewData && previewGeocode !== selectedGeocode);

  const compareWord = selectedData
    ? selectedData.rate > CITYWIDE_RATE ? "more than"
      : selectedData.rate < CITYWIDE_RATE ? "less than"
      : "equal to"
    : null;

  // Comparison mode: pinned + a different CD is selected/hovered — same
  // pattern as NeighborhoodMap's pin-to-compare.
  const compareData   = pinnedGeocode != null && pinnedGeocode !== selectedGeocode
    ? LAB_CD_DATA[pinnedGeocode] : null;
  const inCompareMode = Boolean(compareData && selectedData);

  // Vega-Lite chart data — static aside from the base per-rate color, which
  // depends on the virus's color scale. Selected/hover highlighting is
  // handled natively inside the Vega spec via params (see HISTO_SPEC +
  // useChoroplethMap's selectedSig effect), so this no longer needs to be
  // recomputed on interaction.
  const chartData = useMemo(
    () =>
      Object.entries(LAB_CD_DATA).map(([geocode, d]) => ({
        geocode,
        name:       d.name,
        rate:       d.rate,
        count:      d.count,
        fillColor:  getColor(d.rate, colors),
        barOpacity: 0.82,
      })),
    [colors]
  );

  const gradientCss = useMemo(() => stopsToCssGradient(colors), [colors]);

  // ── Render ────────────────────────────────────────────────────────────────
  // Same layout as NeighborhoodMap on the home page: title left / search
  // right in one row (title passed in via sectionTitle — see titleInComponent
  // in CaseDataPage.config.js — since ContentContainer's own header row is
  // suppressed for this section so title and search can share a row) → map
  // (narrowed a bit) alongside a right column with the At-a-Glance card, the
  // caption, and the ranked bar chart stacked underneath it.

  return (
    <div className="w-full">
      {/* Header row — title left, search inline top-right. Always a row
          (not gated behind the sm: breakpoint) so title and search sit
          side by side regardless of viewport, with the search box fixed
          at the same width as the right column (w-96) below; flex-wrap is
          just a safety net for extremely narrow screens. */}
      <div className="flex flex-row flex-wrap items-center justify-between gap-md mb-md">
        {sectionTitle && (
          // sectionTitle is pre-resolved HTML (virus-colored spans, etc. —
          // see titleInComponent handling in CustomSection.jsx), same as
          // ContentContainer's own title rendering — must use
          // dangerouslySetInnerHTML, not plain text children, or the markup
          // shows up as literal escaped text instead of being rendered.
          <h3
            className="flex-1 min-w-[160px] text-[var(--content-title-size,var(--font-size-lg))] text-[var(--content-title-color,var(--gray-900))] font-semibold tracking-tight m-0"
            dangerouslySetInnerHTML={{ __html: sectionTitle }}
          />
        )}

        <div className="w-96 max-w-full flex-shrink-0">
          <NeighborhoodSearchInput
            id="lab-neighborhood-search"
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
        </div>
      </div>

      {/* Map + At-a-Glance/caption row */}
      <div className="flex flex-col sm:flex-row gap-md items-start">

        {/* Map — sized to comfortably fit the right column's content
             (At-a-Glance card + caption + bar chart) at 384px wide without
             the column needing to scroll in the normal selected state. */}
        <div
          className="flex-1 min-w-0 rounded-md overflow-hidden border border-[var(--gray-200)] relative"
          style={{ height: "520px" }}
        >
          {mapError ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-600)]">
              Map could not be loaded. Please check your connection and try refreshing.
            </div>
          ) : (!leafletReady || !geojson) ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-600)]">
              {loadingStatus}
            </div>
          ) : null}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ display: (leafletReady && geojson && !mapError) ? "block" : "none" }}
          />
          {/* Legend — top-left overlay */}
          <div
            className="absolute top-2 left-2 bg-white rounded border border-[var(--gray-200)] px-2 py-1.5 shadow-sm"
            style={{ zIndex: 1000 }}
          >
            <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide mb-1">
              Cases per 100k
            </p>
            <div
              className="w-28 h-2 rounded-sm"
              style={{ background: gradientCss }}
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

        {/* At a Glance + dynamic caption + bar chart — widened a bit from
            the original narrow rail so the chart has room now that it
            lives in this column. Fixed height (matches the map's 520px)
            with the bar chart pinned to the bottom via sm:mt-auto below,
            so the chart's vertical position stays flush with the bottom
            of the map regardless of small height changes in the card/
            caption above it. overflow-y-auto remains as a safety net for
            unusually long content. */}
        <div className="w-full sm:w-96 flex-shrink-0 flex flex-col gap-md sm:h-[520px] sm:overflow-y-auto">

          {/* At a Glance panel — hover and base layers are stacked via CSS
              Grid (both in the same grid cell) instead of absolute
              positioning, so the panel auto-sizes to whichever layer is
              taller. (Absolute+inset-0 previously forced the hover
              "Preview" layer to match the base layer's — usually shorter —
              height, clipping its content via overflow-hidden.)
              min-h-[170px] pins the panel to the height of its "full"
              content (header + SnapshotRows) at all times, including the
              empty/unselected placeholder. Without this, hovering a bar
              with nothing selected grew the panel (short placeholder →
              tall preview), which pushed the bar chart down out from under
              the cursor, firing mouseout, shrinking the panel back, moving
              the chart back up under the cursor, mouseover again — a
              genuine hover/layout feedback loop. */}
          <div
            className="flex-shrink-0 grid min-h-[170px] rounded-lg overflow-hidden transition-all duration-200"
            style={{
              border: inCompareMode
                ? "1.5px solid #f59e0b"
                : showHoverLayer
                ? "1.5px solid #93c5fd"
                : "1px solid var(--gray-300)",
              boxShadow: inCompareMode ? "0 0 0 3px #fef3c766" : "none",
            }}
          >
            {/* Hover layer */}
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

                  {/* Either the normal single-neighborhood snapshot, or —
                      while comparing — the delta table instead of both
                      stacked (the "Selected" column already covers the
                      current stats, so showing SnapshotRows too was pure
                      duplication). */}
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

          {/* Dynamic caption — natural height, stays the width of this
              narrow column (not stretched to the full-width bar chart below) */}
          <div className="flex-shrink-0 rounded-md bg-[var(--gray-100)] border border-[var(--gray-200)] px-md py-md text-sm font-body text-[var(--gray-700)] leading-relaxed">
            {selectedData ? (
              <>
                <p>
                  <strong className="text-[var(--blue-primary)]">{selectedData.rate}</strong>{" "}
                  cases per 100,000 people in{" "}
                  <strong>{selectedData.name}</strong> (a total of{" "}
                  <strong>{selectedData.count}</strong> cases) for the week ending{" "}
                  <strong>{WEEK_ENDING}</strong>.
                </p>
                <p className="mt-sm">
                  This is <strong>{compareWord}</strong> the Citywide rate of{" "}
                  <strong>{CITYWIDE_RATE}</strong> per 100,000 people.
                </p>
              </>
            ) : (
              <p className="text-[var(--gray-600)]">
                Click a neighborhood on the map or search above to see local data.
              </p>
            )}
          </div>

          {/* Bar chart — moved into this column, beneath the dynamic
              caption, flipped to column bars, with a dashed citywide-average
              reference line. Fixed (not flex-1) so its size is predictable
              regardless of how tall the card/caption above it get. */}
          <div
            className="w-full flex-shrink-0 sm:mt-auto rounded-md border border-[var(--gray-200)] flex flex-col"
            style={{ height: "190px" }}
            aria-label={`Neighborhood case rates ranked, highest to lowest, with a dashed line at the citywide rate of ${CITYWIDE_RATE} per 100,000 — hover for details, click to highlight on map`}
          >
            {/* Header */}
            <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide leading-tight">
                  Cases per 100,000 · Click to select
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="inline-block w-3 border-t border-dashed" style={{ borderColor: "#6b7280" }} aria-hidden="true" />
                <span className="text-2xs font-body text-[var(--gray-600)] whitespace-nowrap">
                  Citywide ({CITYWIDE_RATE})
                </span>
              </div>
            </div>

            {/* Vega-Lite chart */}
            <div ref={chartAreaRef} className="flex-1 min-h-0 overflow-hidden">
              <VegaLiteWrapper
                data={chartData}
                specTemplate={HISTO_SPEC}
                dynamicFields={{
                  chartHeight: chartAreaHeight,
                  selectedColor: colors[4],
                  hoverColor: colors[2],
                  benchmarkValue: CITYWIDE_RATE,
                  benchmarkLabel: `Citywide: ${CITYWIDE_RATE} / 100,000`,
                }}
                rendererMode="svg"
                onNewView={handleChartNewView}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabCasesNeighborhoodMap;
