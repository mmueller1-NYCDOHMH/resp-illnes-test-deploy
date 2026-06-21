/**
 * NeighborhoodMap
 *
 * "What's happening in your neighborhood?" section on the home page.
 * Renders a Leaflet choropleth of NYC Community Districts, a search input,
 * dynamic neighborhood text, and a sorted horizontal bar chart.
 *
 * Data: placeholder — swap CD_DATA for real API/CSV values when available.
 * Map:  GeoJSON from NYC Health EHDP repository (Community Districts).
 * Tiles: CartoDB Positron no-labels (per RPU request: no city names).
 * Leaflet loaded dynamically from unpkg CDN to avoid bundling it.
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import NeighborhoodSearchInput from "./NeighborhoodSearchInput";
import VegaLiteWrapper from "../charts/VegaLiteWrapper";

// ── Constants ─────────────────────────────────────────────────────────────────

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nychealth/EHDP-data/refs/heads/production/geography/CD.geojson";

const CITYWIDE_PCT = 8.4;
const WEEK_ENDING  = "MM/DD"; // placeholder — replace with live date

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

// ── Choropleth color scale (ARI blue-teal, 5 classes) ────────────────────────

const COLOR_BREAKS = [12, 16, 20, 25]; // rate thresholds
const COLORS       = ["#cde8ec", "#629FAA", "#387781", "#1E5A6B", "#0D3D4D"];
const HIGHLIGHT_STROKE = "#1E40AF";

function getColor(rate) {
  if (rate == null) return "#e5e7eb";
  for (let i = 0; i < COLOR_BREAKS.length; i++) {
    if (rate < COLOR_BREAKS[i]) return COLORS[i];
  }
  return COLORS[COLORS.length - 1];
}

function featureStyle(geocode, selectedGeocode) {
  const d   = CD_DATA[geocode];
  const sel = geocode === selectedGeocode;
  return {
    fillColor:   getColor(d?.rate),
    fillOpacity: sel ? 1.0 : 0.72,
    color:       sel ? HIGHLIGHT_STROKE : "#ffffff",
    weight:      sel ? 2.5 : 0.8,
  };
}

// ── Dynamic Leaflet loader ────────────────────────────────────────────────────

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }

    const css = document.createElement("link");
    css.rel  = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = (e) => {
      console.error("[NeighborhoodMap] Failed to load Leaflet from unpkg:", e);
      reject(new Error("Leaflet CDN unavailable"));
    };
    document.head.appendChild(script);
  });
}

// ── Vega-Lite histogram spec ──────────────────────────────────────────────────

const HISTO_SPEC = {
  mark: { type: "bar", cursor: "pointer" },
  encoding: {
    x: {
      field: "rate",
      type: "quantitative",
      scale: { zero: true },
      axis: { title: null, labels: false, ticks: false, domain: false, grid: false },
    },
    y: {
      field: "name",
      type: "ordinal",
      sort: { field: "rate", order: "descending" },
      axis: { title: null, labels: false, ticks: false, domain: false },
    },
    color:   { field: "fillColor", type: "nominal", scale: null, legend: null },
    opacity: { field: "barOpacity", type: "quantitative", scale: null, legend: null },
    tooltip: [
      { field: "name", title: "Neighborhood" },
      { field: "rate", title: "Rate per 100,000" },
    ],
  },
  height: "{chartHeight}",
  padding: { top: 6, right: 8, bottom: 4, left: 4 },
  config: {
    view: { stroke: null },
    scale: { bandPaddingInner: 0.1 },
  },
};

// ── SVG Pin icon ──────────────────────────────────────────────────────────────

const PinIcon = ({ filled = false, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {filled ? (
      <path
        d="M9.5 1.5a1 1 0 0 1 1 1v.94l2.06 2.06A1 1 0 0 1 13 6.5v.5a1 1 0 0 1-1 1H9.5v4l-1.5 2-1.5-2V8H4a1 1 0 0 1-1-1v-.5a1 1 0 0 1 .44-.83L5.5 3.44V2.5a1 1 0 0 1 1-1h3Z"
        fill="currentColor"
      />
    ) : (
      <path
        d="M9.5 1.5a1 1 0 0 1 1 1v.94l2.06 2.06A1 1 0 0 1 13 6.5v.5a1 1 0 0 1-1 1H9.5v4l-1.5 2-1.5-2V8H4a1 1 0 0 1-1-1v-.5a1 1 0 0 1 .44-.83L5.5 3.44V2.5a1 1 0 0 1 1-1h3Z"
        stroke="currentColor" strokeWidth="1.2" fill="none"
      />
    )}
  </svg>
);

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
          <span className="text-xs font-body text-[var(--gray-500)] leading-snug">% of ED visits</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.pct}%</span>
        </div>
        <div style={rowStyle("rate")} onMouseEnter={() => setHoveredRow("rate")} onMouseLeave={() => setHoveredRow(null)}>
          <span className="text-xs font-body text-[var(--gray-500)] leading-snug">Rate per 100,000</span>
          <span className="text-xs font-semibold font-body text-[var(--gray-900)] tabular-nums">{data.rate}</span>
        </div>
        <div style={rowStyle("diff")} onMouseEnter={() => setHoveredRow("diff")} onMouseLeave={() => setHoveredRow(null)}>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-snug"
            style={{ color: diffColor, backgroundColor: diffBg }}
          >
            {diffLabel}
          </span>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-[10px] font-body text-[var(--gray-400)]">Week ending {WEEK_ENDING}</p>
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
    <div className="px-0 py-1">
      {/* Column headers */}
      <div className="flex text-[9px] font-semibold font-body text-[var(--gray-400)] uppercase tracking-wide px-3 pb-1">
        <span className="flex-[2] min-w-0" />
        <span className="flex-1 text-right text-amber-600">Pinned</span>
        <span className="w-8 text-center">Δ</span>
        <span className="flex-1 text-right text-blue-600">Now</span>
      </div>

      {metrics.map(({ key, label, aVal, bVal, delta, suffix }) => {
        const isHovered = hoveredRow === key;
        const positive  = delta > 0;
        const deltaStr  = `${positive ? "+" : ""}${delta}${suffix}`;
        const dColor    = delta === 0 ? "var(--gray-400)" : positive ? "#b91c1c" : "#065f46";

        return (
          <div
            key={key}
            className="flex items-center gap-1 px-2 py-1 rounded mx-1 transition-colors duration-100"
            style={{ backgroundColor: isHovered ? "var(--gray-100)" : "transparent", cursor: "text", userSelect: "text" }}
            onMouseEnter={() => setHoveredRow(key)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <span className="flex-[2] text-[10px] font-body text-[var(--gray-500)] min-w-0 truncate">{label}</span>
            <span className="flex-1 text-right text-[11px] font-semibold font-body tabular-nums text-amber-700">{aVal}</span>
            <span
              className="w-8 text-center text-[10px] font-semibold font-body tabular-nums transition-opacity duration-100"
              style={{ color: dColor, opacity: isHovered ? 1 : 0.55 }}
            >
              {deltaStr}
            </span>
            <span className="flex-1 text-right text-[11px] font-semibold font-body tabular-nums text-blue-700">{bVal}</span>
          </div>
        );
      })}
      <div className="px-3 pt-1 pb-2">
        <p className="text-[9px] font-body text-[var(--gray-400)]">Week ending {WEEK_ENDING} · Δ = now − pinned</p>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const NeighborhoodMap = () => {
  const mapContainerRef    = useRef(null);
  const mapInstanceRef     = useRef(null);
  const geoLayerRef        = useRef(null);
  const selectedGeocodeRef = useRef(null); // stable ref for Leaflet closures
  const chartAreaRef       = useRef(null);

  const [leafletReady, setLeafletReady]       = useState(false);
  const [geojson, setGeojson]                 = useState(null);
  const [selectedGeocode, setSelectedGeocode]       = useState(null);
  const [pinnedGeocode, setPinnedGeocode]           = useState(null);
  const [pinHovered, setPinHovered]                 = useState(false);
  const [hoveredBar, setHoveredBar]                 = useState(null);
  const [mapHoveredGeocode, setMapHoveredGeocode]   = useState(null);
  const [search, setSearch]                         = useState("");
  const [mapError, setMapError]               = useState(false);
  const [loadingStatus, setLoadingStatus]     = useState("Initializing…");
  const [chartAreaHeight, setChartAreaHeight] = useState(388);

  // Keep ref in sync for use inside Leaflet event closures
  useEffect(() => {
    selectedGeocodeRef.current = selectedGeocode;
  }, [selectedGeocode]);

  // Clear any lingering hover state when a selection is committed
  useEffect(() => {
    setMapHoveredGeocode(null);
    setHoveredBar(null);
  }, [selectedGeocode]);

  // Track chart area height for dynamic Vega spec
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

  // Load Leaflet from CDN
  useEffect(() => {
    setLoadingStatus("Loading map library…");
    loadLeaflet()
      .then(() => {
        setLeafletReady(true);
        setLoadingStatus("Loading neighborhood boundaries…");
      })
      .catch((err) => {
        console.error("[NeighborhoodMap] Leaflet load failed:", err);
        setMapError(true);
      });
  }, []);

  // Fetch GeoJSON
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setGeojson(data);
        setLoadingStatus("Rendering map…");
      })
      .catch((err) => {
        console.error("[NeighborhoodMap] GeoJSON fetch failed:", err);
        setMapError(true);
      });
  }, []);

  // Initialise Leaflet map once both are ready
  useEffect(() => {
    if (!leafletReady || !geojson || !mapContainerRef.current || mapInstanceRef.current) return;

    const L   = window.L;
    const map = L.map(mapContainerRef.current, {
      zoomControl:        false,
      scrollWheelZoom:    false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // CartoDB Positron — no city-name labels (RPU request)
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
        featureStyle(feature.properties.GEOCODE, selectedGeocodeRef.current),

      onEachFeature: (feature, layer) => {
        const geocode = feature.properties.GEOCODE;

        layer.on("click", () => {
          const d = CD_DATA[geocode];
          if (d) {
            setSelectedGeocode(geocode);
            setSearch(d.name);
          }
        });

        layer.on("mouseover", (e) => {
          if (geocode !== selectedGeocodeRef.current) {
            e.target.setStyle({ weight: 2, color: "#555", fillOpacity: 0.92 });
            e.target.bringToFront();
          }
          setMapHoveredGeocode(geocode);
        });

        layer.on("mouseout", (e) => {
          e.target.setStyle(featureStyle(geocode, selectedGeocodeRef.current));
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

  // Re-style all features when selection changes
  useEffect(() => {
    if (!geoLayerRef.current) return;
    geoLayerRef.current.eachLayer((layer) => {
      const geocode = layer.feature.properties.GEOCODE;
      layer.setStyle(featureStyle(geocode, selectedGeocode));
      if (geocode === selectedGeocode) layer.bringToFront();
    });
  }, [selectedGeocode]);

  // Fly map to selected feature
  useEffect(() => {
    if (!mapInstanceRef.current || !geoLayerRef.current || !selectedGeocode) return;
    geoLayerRef.current.eachLayer((layer) => {
      if (layer.feature.properties.GEOCODE === selectedGeocode) {
        mapInstanceRef.current.fitBounds(layer.getBounds(), {
          padding: [40, 40],
          maxZoom: 13,
        });
      }
    });
  }, [selectedGeocode]);

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
  }, [selectedGeocode, sortedGeocodes]);

  // ── Search suggestions ──────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return Object.entries(CD_DATA);
    return Object.entries(CD_DATA)
      .filter(([, d]) => d.name.toLowerCase().includes(q));
  }, [search]);


  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedData    = selectedGeocode != null ? CD_DATA[selectedGeocode] : null;
  const previewGeocode  = hoveredBar ?? mapHoveredGeocode;
  const previewData     = previewGeocode != null ? CD_DATA[previewGeocode] : null;
  const showHoverLayer  = Boolean(previewData && previewGeocode !== selectedGeocode);

  // Vega-Lite chart data — recomputed when selection/hover changes
  const chartData = useMemo(() => {
    const previewCode = hoveredBar ?? mapHoveredGeocode;
    return Object.entries(CD_DATA).map(([geocode, d]) => {
      const code       = parseInt(geocode, 10);
      const isSelected = code === selectedGeocode;
      const isPreview  = code === previewCode && !isSelected;
      return {
        geocode,
        name:       d.name,
        pct:        d.pct,
        rate:       d.rate,
        fillColor:  isSelected ? "#1E40AF" : isPreview ? "#387781" : getColor(d.rate),
        barOpacity: isSelected || isPreview ? 1 : 0.82,
      };
    });
  }, [selectedGeocode, hoveredBar, mapHoveredGeocode]);

  // ── Legend breaks ───────────────────────────────────────────────────────────
  const legendItems = [
    { label: `< ${COLOR_BREAKS[0]}`,                          color: COLORS[0] },
    { label: `${COLOR_BREAKS[0]}–${COLOR_BREAKS[1]}`,         color: COLORS[1] },
    { label: `${COLOR_BREAKS[1]}–${COLOR_BREAKS[2]}`,         color: COLORS[2] },
    { label: `${COLOR_BREAKS[2]}–${COLOR_BREAKS[3]}`,         color: COLORS[3] },
    { label: `≥ ${COLOR_BREAKS[3]}`,                          color: COLORS[4] },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-md">
        <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--gray-900)]">
          What&rsquo;s happening in your neighborhood?
        </h2>
        <p className="text-md font-body text-[var(--gray-600)] mt-xs">
          Overall respiratory illness ED visits in the past week
        </p>
      </div>

      {/* Main layout: [left panel] [map] [bar chart] */}
      <div className="flex flex-col sm:flex-row gap-lg items-start">

        {/* ── Left: search + dynamic text ── */}
        <div className="w-full sm:w-60 flex-shrink-0">
          {/* Search input with suggestions */}
          <NeighborhoodSearchInput
            id="home-neighborhood-search"
            value={search}
            onChange={setSearch}
            onSelect={([geocode, data]) => {
              setSelectedGeocode(parseInt(geocode, 10));
              setSearch(data.name);
            }}
            selectedGeocode={selectedGeocode}
            suggestions={suggestions}
          />

          {/* Keyboard nav hint — shown only after a CD is selected */}
          {selectedGeocode != null && (
            <p className="mt-xs text-[10px] font-body text-[var(--gray-400)] leading-tight">
              ↑ ↓ ← → to navigate neighborhoods
            </p>
          )}

          {/* Dynamic text — replaces placeholder once a neighborhood is selected */}
          <div className="mt-md text-md font-body text-[var(--gray-700)] leading-relaxed">
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
              <p className="text-[var(--gray-500)]">
                Click a neighborhood on the map or search above to see local data.
              </p>
            )}
          </div>

          {/* At a Glance panel */}
          {(() => {
            // Comparison mode: pinned + a different CD is selected/hovered
            const compareData = pinnedGeocode != null && pinnedGeocode !== selectedGeocode
              ? CD_DATA[pinnedGeocode] : null;
            const inCompareMode = Boolean(compareData && selectedData);

            return (
              <div
                className="mt-md rounded-lg overflow-hidden relative transition-all duration-200"
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
                {/* ── Comparison mode ── */}
                {inCompareMode ? (
                  <div className="bg-white">
                    {/* Two-column name header */}
                    <div className="flex items-stretch border-b border-[var(--gray-200)]">
                      {/* Pinned name */}
                      <div className="flex-1 min-w-0 bg-amber-50 border-r border-amber-100 px-2.5 py-2">
                        <p className="text-[9px] font-semibold font-body text-amber-600 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                          <PinIcon filled size={10} /> Pinned
                        </p>
                        <p className="text-[11px] font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                          {compareData.name}
                        </p>
                      </div>
                      {/* Current name */}
                      <div className="flex-1 min-w-0 bg-blue-50 px-2.5 py-2 flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold font-body text-blue-600 uppercase tracking-widest mb-0.5">
                            Selected
                          </p>
                          <p className="text-[11px] font-semibold font-body text-[var(--gray-900)] leading-snug truncate">
                            {(previewData ?? selectedData)?.name}
                          </p>
                        </div>
                        <button
                          onClick={() => setPinnedGeocode(null)}
                          className="flex-shrink-0 text-[var(--gray-400)] hover:text-[var(--gray-700)] transition-colors text-xs leading-none mt-0.5"
                          style={{ cursor: "pointer" }}
                          aria-label="Exit comparison"
                          title="Exit comparison"
                        >✕</button>
                      </div>
                    </div>
                    {/* Delta rows */}
                    <CompareRows
                      pinned={compareData}
                      current={previewData ?? selectedData}
                    />
                  </div>
                ) : (
                  <>
                    {/* Hover layer — fades in when previewing a different CD */}
                    <div
                      className="absolute inset-0 flex flex-col bg-white transition-opacity duration-200 z-10"
                      style={{
                        opacity:       showHoverLayer ? 1 : 0,
                        pointerEvents: showHoverLayer ? "auto" : "none",
                      }}
                      aria-hidden={!showHoverLayer}
                    >
                      <div className="px-3 py-2.5 border-b border-blue-100 bg-blue-50">
                        <p className="text-[10px] font-semibold font-body text-blue-500 uppercase tracking-widest mb-0.5">
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
                      className="flex flex-col bg-white transition-opacity duration-200"
                      style={{ opacity: showHoverLayer ? 0 : 1 }}
                    >
                      {selectedData ? (
                        <>
                          <div className="px-3 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-100)] flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold font-body text-[var(--gray-500)] uppercase tracking-widest mb-0.5">
                                At a Glance
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
                                    color: isPinned ? "#b45309" : pinHovered ? "var(--gray-700)" : "var(--gray-400)",
                                    border: isPinned ? "1px solid #fde68a" : "1px solid transparent",
                                  }}
                                  aria-label={isPinned ? "Unpin neighborhood" : "Pin for comparison"}
                                  title={isPinned ? "Unpin" : "Pin to compare with another neighborhood"}
                                >
                                  <PinIcon filled={isPinned} size={12} />
                                  {(pinHovered || isPinned) && (
                                    <span className="text-[9px] font-semibold font-body whitespace-nowrap">
                                      {isPinned ? "Pinned" : "Pin to compare"}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                          <SnapshotRows data={selectedData} />
                        </>
                      ) : (
                        <div className="px-3 py-4 bg-[var(--gray-100)]">
                          <p className="text-[10px] font-semibold font-body text-[var(--gray-500)] uppercase tracking-widest mb-1.5">
                            At a Glance
                          </p>
                          <p className="text-xs font-body text-[var(--gray-500)] leading-relaxed">
                            Click a neighborhood on the map or search above.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        </div>

        {/* ── Map ── */}
        <div className="flex-1 min-w-0 rounded-md overflow-hidden border border-[var(--gray-200)] relative"
             style={{ height: "440px" }}>
          {mapError ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-500)]">
              Map could not be loaded. Please check your connection and try refreshing.
            </div>
          ) : !leafletReady || !geojson ? (
            <div className="flex items-center justify-center h-full text-md font-body text-[var(--gray-400)]">
              {loadingStatus}
            </div>
          ) : null}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ display: (leafletReady && geojson && !mapError) ? "block" : "none" }}
          />
          {/* Legend — bottom-left overlay */}
          <div
            className="absolute bottom-2 left-2 bg-white rounded border border-[var(--gray-200)] px-2 py-1.5 shadow-sm"
            style={{ zIndex: 1000 }}
          >
            <p className="text-[9px] font-semibold font-body text-[var(--gray-500)] uppercase tracking-wide mb-1">
              Rate per 100k
            </p>
            <div className="flex flex-col gap-[2px]">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[9px] font-body text-[var(--gray-600)]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Histogram (Vega-Lite) ── */}
        <div
          className="w-full sm:w-52 flex-shrink-0 rounded-md border border-[var(--gray-200)] flex flex-col"
          style={{ height: "440px" }}
          aria-label="Neighborhood rates ranked — hover for details, click to highlight on map"
        >
          {/* Header */}
          <div className="bg-white border-b border-[var(--gray-200)] px-sm pt-sm pb-xs rounded-t-md flex-shrink-0">
            <p className="text-[11px] font-semibold font-body text-[var(--gray-500)] uppercase tracking-wide leading-tight">
              Rate per 100,000
            </p>
            <p className="text-[11px] font-body text-[var(--gray-400)] mt-[2px] leading-tight">
              Highest → Lowest · Click to select
            </p>
          </div>

          {/* Vega-Lite chart */}
          <div ref={chartAreaRef} className="flex-1 min-h-0 overflow-hidden">
            <VegaLiteWrapper
              data={chartData}
              specTemplate={HISTO_SPEC}
              dynamicFields={{ chartHeight: chartAreaHeight }}
              rendererMode="svg"
              onNewView={(view) => {
                view.addEventListener("click", (_, item) => {
                  const code = item?.datum?.geocode;
                  if (code != null) {
                    const numCode = parseInt(code, 10);
                    setSelectedGeocode(numCode);
                    setSearch(CD_DATA[numCode]?.name ?? "");
                  }
                });
                view.addEventListener("mouseover", (_, item) => {
                  const code = item?.datum?.geocode;
                  setHoveredBar(code != null ? parseInt(code, 10) : null);
                });
                view.addEventListener("mouseout", () => {
                  setHoveredBar(null);
                });

                // Staggered bar entrance — scaleX from 0→1 per bar
                requestAnimationFrame(() => {
                  const bars = view.container()?.querySelectorAll("rect.mark-rect");
                  bars?.forEach((bar, i) => {
                    bar.style.transformOrigin = "left center";
                    bar.style.transform       = "scaleX(0)";
                    bar.style.transition      = `transform 220ms ease-out ${i * 5}ms`;
                    requestAnimationFrame(() => { bar.style.transform = "scaleX(1)"; });
                  });
                });
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default NeighborhoodMap;
