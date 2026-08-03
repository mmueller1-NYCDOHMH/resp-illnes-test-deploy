import { useEffect, useMemo, useRef, useState } from "react";
import { formatShortDate } from "../../utils/trendUtils";

// GeoJSON for NYC Community Districts — shared by every neighborhood
// choropleth on the site (home page + per-virus data pages).
const GEOJSON_URL =
  "https://raw.githubusercontent.com/nychealth/EHDP-data/refs/heads/production/geography/CD.geojson";

// Placeholder "week ending" date shared by both neighborhood maps
// (NeighborhoodMap on the home page, LabCasesNeighborhoodMap on data pages)
// — swap for the live value once each map is wired to real API/CSV data.
// Kept as one constant so the two maps can't drift out of sync with each
// other in the meantime.
export const WEEK_ENDING = formatShortDate(new Date(2026, 6, 25));

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet CDN unavailable"));
    document.head.appendChild(script);
  });
}

/**
 * Shared behavior for the neighborhood choropleth maps (home page
 * NeighborhoodMap + per-virus LabCasesNeighborhoodMap). Owns everything
 * about *how* the map + linked bar chart behave: Leaflet lifecycle, GeoJSON
 * fetch, feature click/hover wiring, search suggestions, and the Vega
 * chart's view lifecycle (resize tracking, selection signal sync, bar
 * entrance animation). Callers own everything about *what* is rendered —
 * legend, snapshot cards, colors, compare/pin UI, etc.
 *
 * @param {object} dataByGeocode - Lookup of geocode -> { name, ...metrics }.
 *   Expected to be a stable reference (e.g. a module-level constant).
 * @param {(geocode: number, selectedGeocode: number|null) => object} getFeatureStyle
 *   Returns a Leaflet path style for a feature. May change identity (e.g.
 *   wrapped in useCallback keyed on a color scale) — the hook always reads
 *   the latest version via a ref, so switching e.g. virus color scales
 *   re-styles every feature, including ones whose hover/mouseout handlers
 *   were bound before the switch.
 * @param {string} [hoverStrokeColor] - Stroke color for the map hover cue.
 * @param {number} [initialChartHeight] - Initial height guess for the
 *   linked bar chart before its container is measured.
 * @param {string} [logPrefix] - Prefix for console error messages.
 */
export default function useChoroplethMap({
  dataByGeocode,
  getFeatureStyle,
  hoverStrokeColor = "#555",
  initialChartHeight = 200,
  logPrefix = "[ChoroplethMap]",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoLayerRef = useRef(null);
  const selectedGeocodeRef = useRef(null); // stable ref for Leaflet closures
  const chartAreaRef = useRef(null);
  const chartViewRef = useRef(null); // Vega view, for pushing selectedSig without a re-embed

  // Always-current style function. Leaflet's per-feature click/hover
  // handlers are bound once when the layer is built; reading through this
  // ref (instead of closing over `getFeatureStyle` directly) means a later
  // change to the style function — e.g. switching a virus's color scale —
  // is honored by mouseout/re-style immediately, not just by the initial
  // paint.
  const getFeatureStyleRef = useRef(getFeatureStyle);
  useEffect(() => {
    getFeatureStyleRef.current = getFeatureStyle;
  }, [getFeatureStyle]);

  const [leafletReady, setLeafletReady] = useState(false);
  const [geojson, setGeojson] = useState(null);
  const [selectedGeocode, setSelectedGeocode] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mapHoveredGeocode, setMapHoveredGeocode] = useState(null);
  const [search, setSearch] = useState("");
  const [mapError, setMapError] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Loading map library…");
  const [chartAreaHeight, setChartAreaHeight] = useState(initialChartHeight);

  // Keep ref in sync for use inside Leaflet event closures
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

  // Load Leaflet from CDN
  useEffect(() => {
    loadLeaflet()
      .then(() => {
        setLeafletReady(true);
        setLoadingStatus("Loading neighborhood boundaries…");
      })
      .catch((err) => {
        console.error(`${logPrefix} Leaflet load failed:`, err);
        setMapError(true);
      });
  }, [logPrefix]);

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
        console.error(`${logPrefix} GeoJSON fetch failed:`, err);
        setMapError(true);
      });
  }, [logPrefix]);

  // Initialise Leaflet map once both are ready
  useEffect(() => {
    if (!leafletReady || !geojson || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      // Leaflet's default keyboard handling pans/zooms the map on arrow
      // keys whenever the map container has focus, which fights with the
      // app's own arrow-key "select adjacent neighborhood" navigation
      // (bound on window and layered on top). Disabling it here avoids
      // both firing on the same keypress. Zoom remains reachable via the
      // zoom control buttons, which are separately keyboard-focusable.
      keyboard: false,
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
        getFeatureStyleRef.current(feature.properties.GEOCODE, selectedGeocodeRef.current),

      onEachFeature: (feature, layer) => {
        const geocode = feature.properties.GEOCODE;

        layer.on("click", () => {
          const d = dataByGeocode[geocode];
          if (d) {
            setSelectedGeocode(geocode);
            setSearch(d.name);
          }
        });

        layer.on("mouseover", (e) => {
          if (geocode !== selectedGeocodeRef.current) {
            // Stroke-only hover cue — fill stays as-is so hovering doesn't
            // make the district read as a different value.
            e.target.setStyle({ weight: 2, color: hoverStrokeColor });
            e.target.bringToFront();
          }
          setMapHoveredGeocode(geocode);
        });

        layer.on("mouseout", (e) => {
          e.target.setStyle(getFeatureStyleRef.current(geocode, selectedGeocodeRef.current));
          setMapHoveredGeocode(null);
        });
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;
    map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      geoLayerRef.current = null;
    };
  }, [leafletReady, geojson, dataByGeocode, hoverStrokeColor]);

  // Re-style all features when selection changes, or when the style
  // function itself changes identity (e.g. a virus color-scale switch).
  useEffect(() => {
    if (!geoLayerRef.current) return;
    geoLayerRef.current.eachLayer((layer) => {
      const geocode = layer.feature.properties.GEOCODE;
      layer.setStyle(getFeatureStyleRef.current(geocode, selectedGeocode));
      if (geocode === selectedGeocode) layer.bringToFront();
    });
  }, [selectedGeocode, getFeatureStyle]);

  // Fly map to selected feature — and back out to the full citywide view
  // when the selection is cleared (e.g. search box emptied out).
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

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const entries = Object.entries(dataByGeocode);
    if (!q) return entries;
    return entries.filter(([, d]) => d.name.toLowerCase().includes(q));
  }, [search, dataByGeocode]);

  // Wires a freshly-(re)created Vega view up to: chart click/hover -> React
  // state, seeding the selectedSig signal, and the staggered bar entrance
  // animation. Pass this straight to <VegaLiteWrapper onNewView>.
  const handleChartNewView = (view) => {
    chartViewRef.current = view;
    view.signal("selectedSig", selectedGeocode != null ? String(selectedGeocode) : null);
    view.runAsync();

    view.addEventListener("click", (_, item) => {
      const code = item?.datum?.geocode;
      if (code != null) {
        const numCode = parseInt(code, 10);
        setSelectedGeocode(numCode);
        setSearch(dataByGeocode[numCode]?.name ?? "");
      }
    });
    view.addEventListener("mouseover", (_, item) => {
      const code = item?.datum?.geocode;
      setHoveredBar(code != null ? parseInt(code, 10) : null);
    });
    view.addEventListener("mouseout", () => {
      setHoveredBar(null);
    });

    // Staggered bar entrance — scaleY from 0→1 per bar, growing up from the
    // baseline. Only replays when the view is actually (re)created — hover
    // never touches `data`, so it never forces a re-embed.
    requestAnimationFrame(() => {
      const bars = view.container()?.querySelectorAll("rect.mark-rect");
      bars?.forEach((bar, i) => {
        bar.style.transformOrigin = "center bottom";
        bar.style.transform = "scaleY(0)";
        bar.style.transition = `transform 220ms ease-out ${i * 5}ms`;
        requestAnimationFrame(() => { bar.style.transform = "scaleY(1)"; });
      });
    });
  };

  return {
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
  };
}
