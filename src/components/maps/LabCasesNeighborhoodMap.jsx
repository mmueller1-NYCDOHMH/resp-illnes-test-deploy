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
 * Data: real (as of 2026-08-19) — UHF42 neighborhood case rates built from
 * RPU's staged caseData.csv via useNeighborhoodGeoCsv + buildUhfDataByGeocode
 * (src/utils/neighborhoodGeoData.js), one metric per virus ("COVID-19 case
 * rate per 100,000 by neighborhood" / "Flu case rate..." / "RSV case
 * rate..."). RPU's file has no by-neighborhood case *count* (only the
 * per-100k rate), so the old placeholder's `count` field ("Est. weekly
 * cases") is gone — there's nothing real to source it from yet. COVID has
 * no masked neighborhoods in RPU's current file; Flu and (heavily) RSV do
 * — see isSuppressed/StatValue below for how a masked neighborhood renders.
 * Map: GeoJSON from NYC Health EHDP (UHF42 neighborhoods).
 * Tiles: CartoDB Positron no-labels.
 *
 * Map lifecycle, GeoJSON fetch, feature click/hover, search suggestions,
 * and the linked bar chart's view lifecycle are shared with NeighborhoodMap
 * (the home page map) via useChoroplethMap — see that file for the common
 * behavior. Pin-to-compare (PinIcon + CompareRows) mirrors NeighborhoodMap's
 * implementation, swapped to this map's rate field. This component owns the
 * parts unique to data pages: per-virus color scales and the
 * section-title-in-header layout.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";
import DataAsOf from "../charts/DataAsOf";
import { tokens } from "../../styles/tokens";
import useChoroplethMap, { WEEK_ENDING } from "./useChoroplethMap";
import { buildChoroplethBarSpec } from "./choroplethBarSpec";
import {
  makeColorScale,
  domainFromValues,
  stopsToCssGradient,
} from "../../utils/colorScale";
import useNeighborhoodGeoCsv from "../hooks/useNeighborhoodGeoCsv";
import {
  buildUhfDataByGeocode,
  averageAcrossNeighborhoods,
  groupedWithNote,
} from "../../utils/neighborhoodGeoData";
import PinIcon from "./PinIcon";
import CompareRows from "./CompareRows";

// Fallback citywide reference (used only until real data loads) — replaced
// by an unweighted average of the loaded neighborhoods' rate once available
// (see averageAcrossNeighborhoods; not an official DOHMH citywide figure).
const CITYWIDE_RATE_FALLBACK = 9.8;

// ── Color scales per virus ────────────────────────────────────────────────────
// Each array is a set of continuous gradient stops (low → high) — values are
// interpolated smoothly across them rather than snapped into fixed bins.

const HIGHLIGHT_STROKE = "#1a1a1a";
const PIN_STROKE = "#f59e0b"; // amber — matches the compare-mode accent used in the At-a-Glance card border

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

const FALLBACK_COLORS = [
  "#c6dbef",
  "#6baed6",
  "#2171b5",
  "#08519c",
  "#08306b",
];

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

function featureStyle(
  geocode,
  selectedGeocode,
  pinnedGeocode,
  dataByGeocode,
  colors,
  rateDomain
) {
  const d = dataByGeocode[geocode];
  const sel = geocode === selectedGeocode;

  // Pinned district gets its own outline so both halves of a comparison are
  // visible on the map at once — skipped if it's also the current selection,
  // since the selected stroke already takes visual priority there.
  const pinned =
    !sel &&
    pinnedGeocode != null &&
    geocode === pinnedGeocode;

  return {
    fillColor: makeColorScale(colors, rateDomain)(d?.rate),
    fillOpacity: FILL_OPACITY,
    color: sel
      ? HIGHLIGHT_STROKE
      : pinned
      ? PIN_STROKE
      : "#ffffff",
    weight: sel || pinned ? 2.5 : 0.8,
  };
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────
// Column orientation (neighborhoods left→right, rate up the Y axis) with a
// light y-axis for scale and a dashed rule at the citywide reference value
// for context — matches the home-page NeighborhoodMap chart. Shared via
// buildChoroplethBarSpec — see choroplethBarSpec.js.
//
// The virus is supplied when the component renders, so the tooltip title
// can be "Flu", "COVID-19", or "RSV" rather than being hardcoded at module
// scope.
//
// `rateTooltip` is calculated by buildChoroplethBarSpec from the `rate`
// field. The chart data itself therefore only needs to provide `rate`.
const buildHistoSpec = (virus) =>
  buildChoroplethBarSpec([
    { field: "name", title: "Neighborhood" },
    { field: "rateTooltip", title: virus },
  ]);

// ── At-a-Glance snapshot rows ─────────────────────────────────────────────────

// Renders a rate, or "Suppressed" (with a title tooltip explaining why) when
// RPU has masked it for a small numerator — real and common for Flu/RSV in
// the current file, rare for COVID-19.
function StatValue({ value, suffix = "" }) {
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
    <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

function SnapshotRows({ data, groupNote }) {
  return (
    <>
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <StatValue value={data.rate} />
          <span className="text-xs font-body text-[var(--gray-600)] leading-snug">
            cases per 100,000 people
          </span>
        </div>

        {/* RPU reports 15 of the 42 UHF42 neighborhoods as part of a
            combined UHF34 group (see neighborhoodGeoData.js's
            groupedWithNote) — this rate isn't independent of its
            group-mates', so say so rather than let identical numbers
            across 2-3 neighborhoods look like a coincidence. */}
        {groupNote && (
          <p className="text-2xs font-body text-[var(--gray-600)] italic leading-snug">
            {groupNote}
          </p>
        )}
      </div>

      <div
        className="px-3 pb-2.5 flex justify-between gap-2"
        style={{ color: "var(--footnote-gray)" }}
      >
        <div className="flex-1" />
        <p className="text-2xs font-body whitespace-nowrap">
          <DataAsOf date={WEEK_ENDING} />
        </p>
      </div>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
// Comparison rows (side-by-side with delta) now live in the shared
// CompareRows.jsx, used with the rate field here vs. NeighborhoodMap's
// pct/hospPct fields.

const LabCasesNeighborhoodMap = ({
  virus = "Flu",
  sectionTitle,
}) => {
  const [pinnedGeocode, setPinnedGeocode] = React.useState(null);
  const [pinHovered, setPinHovered] = React.useState(false);

  // Build the chart spec from the current virus so the tooltip title is
  // dynamically set to "Flu", "COVID-19", or "RSV".
  const histoSpec = useMemo(
    () => buildHistoSpec(virus),
    [virus]
  );

  // ── Real UHF neighborhood data ────────────────────────────────────────────
  // Loads RPU's staged caseData.csv (see useNeighborhoodGeoCsv for why this
  // reads from public/data instead of the live DATA_PATHS.lab feed for
  // now) and pulls this virus's "case rate per 100,000 by neighborhood"
  // metric — the `virus` prop ("COVID-19" / "Flu" / "RSV") matches RPU's
  // metric-name prefix exactly, so no separate mapping table is needed.
  const { caseRows } = useNeighborhoodGeoCsv();

  const dataByGeocode = useMemo(
    () =>
      buildUhfDataByGeocode(caseRows, [
        {
          key: "rate",
          metric: `${virus} case rate per 100,000 by neighborhood`,
        },
      ]),
    [caseRows, virus]
  );

  const colors = useMemo(
    () => getColors(virus),
    [virus]
  );

  // Domain/color scale depend on the loaded data, so — unlike the old
  // hardcoded LAB_CD_DATA version — these can no longer be module-level
  // constants. Falls back to a [0, 1] domain before any data has loaded
  // (or if every neighborhood happens to be suppressed) so
  // makeColorScale never divides by an Infinity/-Infinity range.
  const rateDomain = useMemo(() => {
    const values = Object.values(dataByGeocode)
      .map((d) => d.rate)
      .filter((v) => v != null);

    return values.length
      ? domainFromValues(values)
      : [0, 1];
  }, [dataByGeocode]);

  const getFeatureStyle = useCallback(
    (geocode, selectedGeocode, pinned) =>
      featureStyle(
        geocode,
        selectedGeocode,
        pinned,
        dataByGeocode,
        colors,
        rateDomain
      ),
    [dataByGeocode, colors, rateDomain]
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
    hoverStrokeColor: "#333",
    initialChartHeight: 150,
    pinnedGeocode,
    logPrefix: "[LabCasesNeighborhoodMap]",
  });

  // ── Arrow-key neighborhood navigation ──────────────────────────────────────
  // Same geography-aware navigation as the home page map (see
  // NeighborhoodMap.jsx and useChoroplethMap's getNeighborInDirection) —
  // added here for parity, since this map previously had no keyboard
  // navigation at all.
  useEffect(() => {
    if (selectedGeocode == null) return;

    const handleKeyDown = (e) => {
      if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
      if (document.activeElement?.tagName === "INPUT") return;

      const next = getNeighborInDirection(
        selectedGeocode,
        e.key
      );

      if (next == null) return;

      e.preventDefault();
      setSelectedGeocode(next);
      setSearch(dataByGeocode[next]?.name ?? "");
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedGeocode,
    getNeighborInDirection,
    setSelectedGeocode,
    setSearch,
    dataByGeocode,
  ]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const citywideRate =
    averageAcrossNeighborhoods(dataByGeocode, "rate") ??
    CITYWIDE_RATE_FALLBACK;

  const selectedData =
    selectedGeocode != null
      ? dataByGeocode[selectedGeocode]
      : null;

  const previewGeocode =
    hoveredBar ?? mapHoveredGeocode;

  const previewData =
    previewGeocode != null
      ? dataByGeocode[previewGeocode]
      : null;

  const showHoverLayer = Boolean(
    previewData &&
    previewGeocode !== selectedGeocode
  );

  const compareWord =
    selectedData && selectedData.rate != null
      ? selectedData.rate > citywideRate
        ? "more than"
        : selectedData.rate < citywideRate
        ? "less than"
        : "equal to"
      : null;

  const compareColor =
    selectedData && selectedData.rate != null
      ? selectedData.rate > citywideRate
        ? "#b91c1c"
        : selectedData.rate < citywideRate
        ? "#065f46"
        : "inherit"
      : "inherit";

  // Comparison mode: pinned + a different CD is selected/hovered — same
  // pattern as NeighborhoodMap's pin-to-compare.
  const compareData =
    pinnedGeocode != null &&
    pinnedGeocode !== selectedGeocode
      ? dataByGeocode[pinnedGeocode]
      : null;

  const inCompareMode = Boolean(
    compareData && selectedData
  );

  const compareGroupNote = inCompareMode
    ? (() => {
        const n = groupedWithNote(
          compareData,
          dataByGeocode
        );
        return n
          ? `${compareData.name}: ${n}`
          : null;
      })()
    : null;

  const currentGroupNote = inCompareMode
    ? (() => {
        const d =
          previewData ?? selectedData;

        const n = groupedWithNote(
          d,
          dataByGeocode
        );

        return n
          ? `${d.name}: ${n}`
          : null;
      })()
    : null;

  // Vega-Lite chart data. Neighborhoods with a suppressed (null) rate are
  // left out of the ranked bar chart / table entirely rather than plotted
  // as zero — RSV in particular has this for most of the city right now.
  const chartData = useMemo(
    () =>
      Object.entries(dataByGeocode)
        .filter(([, d]) => d.rate != null)
        .map(([geocode, d]) => ({
          geocode,
          name: d.name,
          rate: d.rate,
          fillColor: makeColorScale(
            colors,
            rateDomain
          )(d.rate),
          barOpacity: 0.82,
        })),
    [dataByGeocode, colors, rateDomain]
  );

  const suppressedCount =
    Object.keys(dataByGeocode).length -
    chartData.length;

  const gradientCss = useMemo(
    () => stopsToCssGradient(colors),
    [colors]
  );

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
            dangerouslySetInnerHTML={{
              __html: sectionTitle,
            }}
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
              if (val.trim() === "") {
                setSelectedGeocode(null);
              }
            }}
            onSelect={([geocode, data]) => {
              setSelectedGeocode(
                parseInt(geocode, 10)
              );
              setSearch(data.name);
            }}
            selectedGeocode={selectedGeocode}
            suggestions={suggestions}
          />

          {/* Keyboard nav hint — shown only after a CD is selected, same as
              the home page map */}
          {selectedGeocode != null && (
            <p className="mt-xs text-2xs font-body text-[var(--gray-600)] leading-tight text-right">
              ↑ ↓ to navigate neighborhoods
            </p>
          )}
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
          {/* The map itself isn't keyboard-operable (Leaflet polygon click/hover
              only) — this note gives keyboard and screen-reader users the actual
              accessible path: the search box + arrow-key navigation below. */}
          <p
            id="lab-neighborhood-map-instructions"
            className="sr-only"
          >
            Interactive map of NYC neighborhoods. This map is not operable by
            keyboard — use the search box below to find and select a
            neighborhood by name or ZIP code. Once a neighborhood is
            selected, use the arrow keys to move to an adjacent one.
          </p>

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
            aria-describedby="lab-neighborhood-map-instructions"
            style={{
              display:
                leafletReady &&
                geojson &&
                !mapError
                  ? "block"
                  : "none",
            }}
          />

          {/* Legend — top-left overlay */}
          <div
            className="absolute top-2 left-2 bg-white rounded border border-[var(--gray-200)] px-2 py-1.5 shadow-sm"
            style={{ zIndex: 1000 }}
          >
            <div
              className="w-28 h-2 rounded-sm"
              style={{
                background: gradientCss,
              }}
              aria-hidden="true"
            />

            <div className="flex justify-between mt-0.5">
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {rateDomain[0].toFixed(1)}
              </span>
              <span className="text-2xs font-body text-[var(--gray-600)]">
                {rateDomain[1].toFixed(1)}
              </span>
            </div>
            <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide mb-1">
              per 100,000 people
            </p>
          </div>
        </div>

        {/* At a Glance + dynamic caption + bar chart */}
        <div className="w-full sm:w-96 flex-shrink-0 flex flex-col gap-md sm:h-[520px] sm:overflow-y-auto">

          {/* At a Glance panel */}
          <div
            className="flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
            style={{
              border: inCompareMode
                ? "1.5px solid #f59e0b"
                : showHoverLayer
                ? "1.5px solid #93c5fd"
                : "1px solid var(--gray-300)",
              boxShadow: inCompareMode
                ? "0 0 0 3px #fef3c766"
                : "none",
            }}
          >
            {/* Hover + base layers */}
            <div className="grid min-h-[170px]">

              {/* Hover layer */}
              <div
                className="col-start-1 row-start-1 flex flex-col bg-white transition-opacity duration-200 z-10"
                style={{
                  opacity: showHoverLayer ? 1 : 0,
                  pointerEvents: showHoverLayer
                    ? "auto"
                    : "none",
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

                {previewData && (
                  <SnapshotRows
                    data={previewData}
                    groupNote={groupedWithNote(
                      previewData,
                      dataByGeocode
                    )}
                  />
                )}
              </div>

              {/* Base layer */}
              <div
                className="col-start-1 row-start-1 flex flex-col bg-white transition-opacity duration-200"
                style={{
                  opacity: showHoverLayer ? 0 : 1,
                }}
              >
                {selectedData ? (
                  <>
                    <div className="px-3 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-100)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-widest mb-0.5">
                          {inCompareMode
                            ? "Comparing"
                            : "At a Glance"}
                        </p>

                        <p className="text-sm font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                          {selectedData.name}
                        </p>
                      </div>

                      {/* Pin button */}
                      {(() => {
                        const isPinned =
                          pinnedGeocode ===
                          selectedGeocode;

                        return (
                          <button
                            onClick={() =>
                              setPinnedGeocode(
                                isPinned
                                  ? null
                                  : selectedGeocode
                              )
                            }
                            onMouseEnter={() =>
                              setPinHovered(true)
                            }
                            onMouseLeave={() =>
                              setPinHovered(false)
                            }
                            className="flex-shrink-0 flex items-center gap-1 rounded px-1.5 py-1 transition-all duration-150"
                            style={{
                              cursor: "pointer",
                              backgroundColor: isPinned
                                ? "#fef3c7"
                                : pinHovered
                                ? "var(--gray-200)"
                                : "transparent",
                              color: isPinned
                                ? "#b45309"
                                : pinHovered
                                ? "var(--gray-700)"
                                : "var(--gray-600)",
                              border: isPinned
                                ? "1px solid #fde68a"
                                : "1px solid transparent",
                            }}
                            aria-label={
                              isPinned
                                ? "Unpin neighborhood"
                                : "Pin for comparison"
                            }
                            title={
                              isPinned
                                ? "Unpin"
                                : "Pin to compare with another neighborhood"
                            }
                          >
                            <PinIcon
                              filled={isPinned}
                              size={12}
                            />

                            <span className="text-2xs font-semibold font-body whitespace-nowrap">
                              {isPinned
                                ? "Pinned"
                                : "Pin to compare"}
                            </span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Either the normal single-neighborhood snapshot, or
                        while comparing, the delta table. */}
                    {inCompareMode ? (
                      <>
                        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
                          <p className="text-2xs font-body text-[var(--gray-600)] truncate">
                            vs{" "}
                            <span className="font-semibold text-amber-700">
                              {compareData.name}
                            </span>
                          </p>

                          <button
                            onClick={() =>
                              setPinnedGeocode(null)
                            }
                            className="flex-shrink-0 text-[var(--gray-600)] hover:text-[var(--gray-700)] transition-colors text-2xs leading-none"
                            style={{
                              cursor: "pointer",
                            }}
                            aria-label="Exit comparison"
                            title="Exit comparison"
                          >
                            ✕
                          </button>
                        </div>

                        <CompareRows
                          pinned={compareData}
                          current={
                            previewData ??
                            selectedData
                          }
                          fields={[
                            {
                              key: "rate",
                              label:
                                "Cases per 100,000 people",
                              decimals: 1,
                            },
                          ]}
                        />

                        {(compareGroupNote ||
                          currentGroupNote) && (
                          <p className="px-3 pb-1.5 text-2xs font-body text-[var(--gray-600)] italic leading-snug">
                            {[
                              compareGroupNote,
                              currentGroupNote,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <SnapshotRows
                        data={selectedData}
                        groupNote={groupedWithNote(
                          selectedData,
                          dataByGeocode
                        )}
                      />
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

            {/* Dynamic caption */}
            {selectedData && (
              <div className="border-t border-[var(--gray-200)] bg-[var(--gray-100)] px-md py-md text-sm font-body text-[var(--gray-700)] leading-relaxed">
                {selectedData.rate == null ? (
                  <p>
                    RPU has suppressed this week's{" "}
                    {virus} case rate for{" "}
                    <strong>
                      {selectedData.name}
                    </strong>{" "}
                    — the underlying case count is too
                    small to report reliably.
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {selectedData.rate}
                      </strong>{" "}
                      cases per 100,000 people in{" "}
                      <strong>
                        {selectedData.name}
                      </strong>{" "}
                      for the week ending{" "}
                      <strong>{WEEK_ENDING}</strong>.

                      This is{" "}
                      <strong
                        style={{
                          color: compareColor,
                        }}
                      >
                        {compareWord}
                      </strong>{" "}
                      the Citywide rate of{" "}
                      <strong>
                        {citywideRate}
                      </strong>{" "}
                      per 100,000 people.
                    </p>
                  </>
                )}

                {groupedWithNote(
                  selectedData,
                  dataByGeocode
                ) && (
                  <p className="mt-sm text-xs italic">
                    {groupedWithNote(
                      selectedData,
                      dataByGeocode
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div
            className="w-full flex-shrink-0 sm:mt-auto rounded-md border border-[var(--gray-200)] flex flex-col"
            style={{ height: "190px" }}
            aria-label={`Neighborhood ${virus} case rates ranked, highest to lowest, with a dashed line at the citywide rate of ${citywideRate} per 100,000${
              suppressedCount
                ? `. ${suppressedCount} neighborhood(s) omitted — data suppressed`
                : ""
            } — hover for details, click to highlight on map`}
          >
            {/* Header */}
            <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide leading-tight">
                  Click to select
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  className="inline-block w-3 border-t border-dashed"
                  style={{
                    borderColor: "#6b7280",
                  }}
                  aria-hidden="true"
                />

                <span className="text-2xs font-body text-[var(--gray-600)] whitespace-nowrap">
                  Citywide ({citywideRate})
                </span>
              </div>
            </div>

            {/* Vega-Lite chart */}
            <div
              ref={chartAreaRef}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <VegaLiteWrapper
                data={chartData}
                specTemplate={histoSpec}
                dynamicFields={{
                  chartHeight: chartAreaHeight,
                  selectedColor: colors[4],
                  hoverColor: colors[2],
                  benchmarkValue: citywideRate,
                  benchmarkLabel: `Citywide: ${citywideRate} / 100,000`,
                }}
                rendererMode="svg"
                onNewView={handleChartNewView}
              />
            </div>

            {suppressedCount > 0 && (
              <p className="sr-only">
                {suppressedCount} additional neighborhood(s)
                omitted — RPU has suppressed their {virus} case
                rate because the underlying case count is too small
                to report reliably.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabCasesNeighborhoodMap;