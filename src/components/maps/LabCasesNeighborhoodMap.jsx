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
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";
import { tokens } from "../../styles/tokens";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nychealth/EHDP-data/refs/heads/production/geography/CD.geojson";

const CITYWIDE_RATE = 9.8; // cases per 100,000 — placeholder
const WEEK_ENDING   = "MM/DD"; // placeholder

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

const COLOR_BREAKS = [8, 11, 14, 18];
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

function getColors(virus) {
  return VIRUS_COLORS[virus] || FALLBACK_COLORS;
}

function getColor(rate, colors) {
  if (rate == null) return "#e5e7eb";
  for (let i = 0; i < COLOR_BREAKS.length; i++) {
    if (rate < COLOR_BREAKS[i]) return colors[i];
  }
  return colors[colors.length - 1];
}

function featureStyle(geocode, selectedGeocode, colors) {
  const d   = LAB_CD_DATA[geocode];
  const sel = geocode === selectedGeocode;
  return {
    fillColor:   getColor(d?.rate, colors),
    fillOpacity: sel ? 1.0 : 0.72,
    color:       sel ? HIGHLIGHT_STROKE : "#ffffff",
    weight:      sel ? 2.5 : 0.8,
  };
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────
// Column orientation (neighborhoods left→right, rate up the Y axis) with a
// light y-axis for scale and a dashed rule at CITYWIDE_RATE for context —
// matches the redesigned NeighborhoodMap chart on the home page.
//
// Hover + selection highlight are handled *inside* Vega via params instead
// of by recomputing `chartData` in React on every mouseover. Previously,
// hover state fed back into the data array passed to Vega, which changed
// the spec's `data` on every mouseover and forced react-vega to tear down
// and fully re-create the view (see computeSpecChanges/isExpensive in
// react-vega) — including replaying the bar entrance animation — on every
// single hover. With 58 narrow bars packed into this column, a normal
// mouse sweep crosses several of them a second, so that showed up as a
// visible flicker/"glitch". `hoverSel` is a native point selection (cheap,
// no React round-trip); `selectedSig` is a plain reactive value kept in
// sync with React's selectedGeocode via view.signal() (see the useEffect
// in the component). selectedColor/hoverColor are per-virus, so they're
// passed in via dynamicFields rather than hardcoded.
const HISTO_SPEC = {
  params: [
    { name: "selectedSig", value: null },
  ],
  layer: [
    {
      params: [
        {
          name: "hoverSel",
          select: { type: "point", on: "mouseover", clear: "mouseout", fields: ["geocode"] },
        },
      ],
      mark: { type: "bar", cursor: "pointer" },
      encoding: {
        x: {
          field: "name",
          type: "ordinal",
          sort: { field: "rate", order: "descending" },
          axis: { title: null, labels: false, ticks: false, domain: false },
        },
        y: {
          field: "rate",
          type: "quantitative",
          scale: { zero: true },
          axis: {
            title: "Cases / 100k",
            titleFontSize: 9,
            labelFontSize: 9,
            tickCount: 3,
            domain: false,
            ticks: false,
            gridOpacity: 0.25,
          },
        },
        color: {
          condition: [
            { test: "datum.geocode === selectedSig", value: "{selectedColor}" },
            { param: "hoverSel", empty: false, value: "{hoverColor}" },
          ],
          field: "fillColor", type: "nominal", scale: null, legend: null,
        },
        opacity: {
          condition: [
            { test: "datum.geocode === selectedSig", value: 1 },
            { param: "hoverSel", empty: false, value: 1 },
          ],
          field: "barOpacity", type: "quantitative", scale: null, legend: null,
        },
        tooltip: [
          { field: "name",  title: "Neighborhood" },
          { field: "rate",  title: "Cases per 100,000" },
          { field: "count", title: "Est. weekly cases" },
        ],
      },
    },
    {
      // Single dashed reference line at the citywide rate.
      data: { values: [{}] },
      mark: { type: "rule", strokeDash: [4, 3], color: "#6b7280", size: 1 },
      encoding: {
        y: { datum: CITYWIDE_RATE, type: "quantitative" },
        tooltip: { value: `Citywide: ${CITYWIDE_RATE} / 100,000` },
      },
    },
  ],
  height: "{chartHeight}",
  padding: { top: 6, right: 8, bottom: 4, left: 4 },
  config: {
    view: { stroke: null },
    scale: { bandPaddingInner: 0.1 },
  },
};

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
      <div className="px-3 pb-2.5">
        <p className="text-2xs font-body text-[var(--gray-600)]">Week ending {WEEK_ENDING}</p>
      </div>
    </>
  );
}

// ── Leaflet loader ────────────────────────────────────────────────────────────

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }

    const css = document.createElement("link");
    css.rel  = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload  = () => resolve(window.L);
    script.onerror = (e) => {
      console.error("[LabCasesNeighborhoodMap] Leaflet CDN load failed:", e);
      reject(new Error("Leaflet unavailable"));
    };
    document.head.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const LabCasesNeighborhoodMap = ({ virus = "Flu", sectionTitle }) => {
  const colors = useMemo(() => getColors(virus), [virus]);

  const mapContainerRef    = useRef(null);
  const mapInstanceRef     = useRef(null);
  const geoLayerRef        = useRef(null);
  const selectedGeocodeRef = useRef(null);
  const chartAreaRef       = useRef(null);
  const chartViewRef       = useRef(null); // Vega view, for pushing selectedSig without a re-embed

  const [leafletReady, setLeafletReady]             = useState(false);
  const [geojson, setGeojson]                       = useState(null);
  const [selectedGeocode, setSelectedGeocode]       = useState(null);
  const [hoveredBar, setHoveredBar]                 = useState(null);
  const [mapHoveredGeocode, setMapHoveredGeocode]   = useState(null);
  const [search, setSearch]                         = useState("");
  const [mapError, setMapError]                     = useState(false);
  const [loadingStatus, setLoadingStatus]           = useState("Loading map library…");
  const [chartAreaHeight, setChartAreaHeight]       = useState(150);

  useEffect(() => {
    selectedGeocodeRef.current = selectedGeocode;
  }, [selectedGeocode]);

  // Clear any lingering hover state when a selection is committed
  useEffect(() => {
    setMapHoveredGeocode(null);
    setHoveredBar(null);
  }, [selectedGeocode]);

  // Track chart area height for the dynamic Vega spec
  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setChartAreaHeight(Math.floor(h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load Leaflet
  useEffect(() => {
    loadLeaflet()
      .then(() => {
        setLeafletReady(true);
        setLoadingStatus("Loading neighborhood boundaries…");
      })
      .catch(() => setMapError(true));
  }, []);

  // Fetch GeoJSON
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setGeojson(data);
        setLoadingStatus("Rendering map…");
      })
      .catch((err) => {
        console.error("[LabCasesNeighborhoodMap] GeoJSON fetch failed:", err);
        setMapError(true);
      });
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletReady || !geojson || !mapContainerRef.current || mapInstanceRef.current) return;

    const L   = window.L;
    const map = L.map(mapContainerRef.current, {
      zoomControl:        false,
      scrollWheelZoom:    false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const geoLayer = L.geoJSON(geojson, {
      style: (feature) =>
        featureStyle(feature.properties.GEOCODE, selectedGeocodeRef.current, colors),

      onEachFeature: (feature, layer) => {
        const geocode = feature.properties.GEOCODE;

        layer.on("click", () => {
          const d = LAB_CD_DATA[geocode];
          if (d) {
            setSelectedGeocode(geocode);
            setSearch(d.name);
          }
        });

        layer.on("mouseover", (e) => {
          if (geocode !== selectedGeocodeRef.current) {
            e.target.setStyle({ weight: 2, color: "#333", fillOpacity: 0.92 });
            e.target.bringToFront();
          }
          setMapHoveredGeocode(geocode);
        });

        layer.on("mouseout", (e) => {
          e.target.setStyle(featureStyle(geocode, selectedGeocodeRef.current, colors));
          setMapHoveredGeocode(null);
        });
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;
    map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      geoLayerRef.current    = null;
    };
  }, [leafletReady, geojson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-style on selection or virus change
  useEffect(() => {
    if (!geoLayerRef.current) return;
    geoLayerRef.current.eachLayer((layer) => {
      const geocode = layer.feature.properties.GEOCODE;
      layer.setStyle(featureStyle(geocode, selectedGeocode, colors));
      if (geocode === selectedGeocode) layer.bringToFront();
    });
  }, [selectedGeocode, colors]);

  // Fly to selected — and back out to the full citywide view when the
  // selection is cleared (e.g. search box emptied out).
  useEffect(() => {
    if (!mapInstanceRef.current || !geoLayerRef.current) return;
    if (selectedGeocode == null) {
      mapInstanceRef.current.fitBounds(geoLayerRef.current.getBounds(), { padding: [10, 10] });
      return;
    }
    geoLayerRef.current.eachLayer((layer) => {
      if (layer.feature.properties.GEOCODE === selectedGeocode) {
        mapInstanceRef.current.fitBounds(layer.getBounds(), {
          padding: [40, 40],
          maxZoom: 13,
        });
      }
    });
  }, [selectedGeocode]);

  // Keep the bar chart's native "selected" signal in sync with React state.
  // Cheap (view.signal + partial run) — does not touch `data`, so it never
  // triggers a re-embed of the chart.
  useEffect(() => {
    const view = chartViewRef.current;
    if (!view) return;
    view.signal("selectedSig", selectedGeocode != null ? String(selectedGeocode) : null);
    view.runAsync();
  }, [selectedGeocode]);

  // ── Search ────────────────────────────────────────────────────────────────

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return Object.entries(LAB_CD_DATA);
    return Object.entries(LAB_CD_DATA)
      .filter(([, d]) => d.name.toLowerCase().includes(q));
  }, [search]);

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

  // Vega-Lite chart data — static aside from the base per-rate color, which
  // depends on the virus's color scale. Selected/hover highlighting is
  // handled natively inside the Vega spec via params (see HISTO_SPEC + the
  // selectedSig effect above), so this no longer needs to be recomputed on
  // interaction.
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

  const legendItems = [
    { label: `< ${COLOR_BREAKS[0]}`,                    color: colors[0] },
    { label: `${COLOR_BREAKS[0]}–${COLOR_BREAKS[1]}`,   color: colors[1] },
    { label: `${COLOR_BREAKS[1]}–${COLOR_BREAKS[2]}`,   color: colors[2] },
    { label: `${COLOR_BREAKS[2]}–${COLOR_BREAKS[3]}`,   color: colors[3] },
    { label: `≥ ${COLOR_BREAKS[3]}`,                    color: colors[4] },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  // Same layout as NeighborhoodMap on the home page: title left / search
  // right in one row (title passed in via sectionTitle — see titleInComponent
  // in CaseDataPage.config.js — since ContentContainer's own header row is
  // suppressed for this section so title and search can share a row) → map
  // (narrowed a bit) alongside a right column with the At-a-Glance card, the
  // caption, and the ranked bar chart stacked underneath it.
  // Original layout is in .backups/LabCasesNeighborhoodMap.jsx.pre-redesign.bak.

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
            <div className="flex flex-col gap-[2px]">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-2xs font-body text-[var(--gray-600)]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* At a Glance + dynamic caption + bar chart — widened a bit from
            the original narrow rail so the chart has room now that it
            lives in this column. max-h (not a forced h) caps this column
            at the map's height without forcing it there — the normal/
            unselected state stays its natural (shorter) height, nothing
            gets squeezed. 520px comfortably fits the card + caption + bar
            chart in the normal selected state with no scrolling; the
            scroll only kicks in for unusually long content. */}
        <div className="w-full sm:w-96 flex-shrink-0 flex flex-col gap-md sm:max-h-[520px] sm:overflow-y-auto">

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
            className="flex-shrink-0 grid min-h-[170px] rounded-lg border overflow-hidden transition-colors duration-200"
            style={{ borderColor: showHoverLayer ? "#bfdbfe" : "var(--gray-300)" }}
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
                  <div className="px-3 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-100)]">
                    <p className="text-2xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-widest mb-0.5">
                      At a Glance
                    </p>
                    <p className="text-sm font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                      {selectedData.name}
                    </p>
                  </div>
                  <SnapshotRows data={selectedData} />
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
            className="w-full flex-shrink-0 rounded-md border border-[var(--gray-200)] flex flex-col"
            style={{ height: "190px" }}
            aria-label={`Neighborhood case rates ranked, highest to lowest, with a dashed line at the citywide rate of ${CITYWIDE_RATE} per 100,000 — hover for details, click to highlight on map`}
          >
            {/* Header */}
            <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold font-body text-[var(--gray-600)] uppercase tracking-wide leading-tight">
                  Cases per 100,000 · 58 community districts
                </p>
                <p className="text-xs font-body text-[var(--gray-600)] mt-[2px] leading-tight">
                  Highest → Lowest · Click to select
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
                }}
                rendererMode="svg"
                onNewView={(view) => {
                  chartViewRef.current = view;
                  // Seed the native "selected" signal — this view may have
                  // just been (re)created (mount, or a width/theme/virus
                  // change), so it starts from the param's default (null)
                  // otherwise.
                  view.signal("selectedSig", selectedGeocode != null ? String(selectedGeocode) : null);
                  view.runAsync();

                  view.addEventListener("click", (_, item) => {
                    const code = item?.datum?.geocode;
                    if (code != null) {
                      const numCode = parseInt(code, 10);
                      setSelectedGeocode(numCode);
                      setSearch(LAB_CD_DATA[numCode]?.name ?? "");
                    }
                  });
                  view.addEventListener("mouseover", (_, item) => {
                    const code = item?.datum?.geocode;
                    setHoveredBar(code != null ? parseInt(code, 10) : null);
                  });
                  view.addEventListener("mouseout", () => {
                    setHoveredBar(null);
                  });

                  // Staggered bar entrance — scaleY from 0→1, growing up from
                  // the baseline (column orientation; was scaleX before).
                  // Only replays when the view is actually (re)created now —
                  // hover no longer touches `data`, so it no longer forces a
                  // re-embed here.
                  requestAnimationFrame(() => {
                    const bars = view.container()?.querySelectorAll("rect.mark-rect");
                    bars?.forEach((bar, i) => {
                      bar.style.transformOrigin = "center bottom";
                      bar.style.transform       = "scaleY(0)";
                      bar.style.transition      = `transform 220ms ease-out ${i * 5}ms`;
                      requestAnimationFrame(() => { bar.style.transform = "scaleY(1)"; });
                    });
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabCasesNeighborhoodMap;
