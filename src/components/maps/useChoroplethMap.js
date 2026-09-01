import { useEffect, useMemo, useRef, useState } from "react";
import { formatShortDate } from "../../utils/trendUtils";
import { looksLikeZip, uhfGeocodeForZip } from "../../utils/zipToUhf";

// GeoJSON for NYC's 42 United Hospital Fund (UHF42) neighborhoods — the
// real unit RPU's ED/case data is reported at (see project memory: "RVP
// geo unit will be UHF, not CD"). Shared by every neighborhood choropleth
// on the site (home page + per-virus data pages). Previously CD.geojson
// (Community Districts) — swapped 2026-08-19 once RPU's staged data files
// confirmed the geo unit and GEOJSON_URL's own repo turned out to already
// carry a UHF42 boundary file alongside the CD one.
const GEOJSON_URL =
  "https://raw.githubusercontent.com/nychealth/EHDP-data/refs/heads/production/geography/UHF42.geojson";

// "Week ending" date for both neighborhood maps (NeighborhoodMap on the
// home page, LabCasesNeighborhoodMap on data pages). RPU's current staged
// caseData.csv/emergencyDeptData.csv only ship one snapshot week of "by
// neighborhood" rows (2026-08-15 as of the 2026-08-18 staging handoff), so
// this is still a constant rather than derived per-load — but it now
// reflects that real snapshot instead of a made-up placeholder date. Once
// the geo rows carry multiple weeks, prefer useNeighborhoodGeoCsv's
// `snapshotDate` (max date across the loaded "by neighborhood" rows)
// instead of this constant. Kept as one shared constant so the two maps
// can't drift out of sync with each other in the meantime.
export const WEEK_ENDING = formatShortDate(new Date(2026, 7, 15));

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
 *   May start empty/placeholder (e.g. while an async CSV load resolves) and
 *   change identity later — the Leaflet feature click handler reads it
 *   through a ref (see dataByGeocodeRef below), same pattern as
 *   getFeatureStyleRef, so a later change is honored without needing to
 *   tear down and rebuild the map. Everything else that reads
 *   dataByGeocode (suggestions, getNeighborInDirection) is recomputed on
 *   every render already, so it was never stale to begin with.
 * @param {(geocode: number, selectedGeocode: number|null, pinnedGeocode: number|null) => object} getFeatureStyle
 *   Returns a Leaflet path style for a feature. May change identity (e.g.
 *   wrapped in useCallback keyed on a color scale) — the hook always reads
 *   the latest version via a ref, so switching e.g. virus color scales
 *   re-styles every feature, including ones whose hover/mouseout handlers
 *   were bound before the switch.
 * @param {string} [hoverStrokeColor] - Stroke color for the map hover cue.
 * @param {number} [initialChartHeight] - Initial height guess for the
 *   linked bar chart before its container is measured.
 * @param {number|null} [pinnedGeocode] - The pinned-for-comparison geocode,
 *   if any (owned by the caller, same pattern as PinIcon/CompareRows).
 *   Threaded through to getFeatureStyle so the pinned district can be
 *   outlined on the map itself, and used to fit the map to both districts
 *   at once while comparing.
 * @param {string} [logPrefix] - Prefix for console error messages.
 */
export default function useChoroplethMap({
  dataByGeocode,
  getFeatureStyle,
  hoverStrokeColor = "#555",
  initialChartHeight = 200,
  pinnedGeocode = null,
  logPrefix = "[ChoroplethMap]",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoLayerRef = useRef(null);
  const selectedGeocodeRef = useRef(null); // stable ref for Leaflet closures
  const pinnedGeocodeRef = useRef(pinnedGeocode); // stable ref for Leaflet closures
  const chartAreaRef = useRef(null);
  const chartViewRef = useRef(null); // Vega view, for pushing selectedSig without a re-embed
  const centroidsRef = useRef({}); // geocode -> { lat, lng }, for arrow-key nav

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

  // Same stale-closure fix as getFeatureStyleRef, for dataByGeocode. The
  // Leaflet feature click handler is bound once in onEachFeature below; if
  // dataByGeocode starts empty (CSV still loading) and is later replaced
  // with the loaded data, reading it directly would freeze the handler on
  // that first empty snapshot forever. Reading through a ref instead means
  // a click always sees whatever was passed in most recently.
  const dataByGeocodeRef = useRef(dataByGeocode);
  useEffect(() => {
    dataByGeocodeRef.current = dataByGeocode;
  }, [dataByGeocode]);

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

  useEffect(() => {
    pinnedGeocodeRef.current = pinnedGeocode;
  }, [pinnedGeocode]);

  // Compute a rough centroid for every district from the GeoJSON once it
  // loads — used only to figure out which district is "up/down/left/right"
  // of another for arrow-key navigation. For a MultiPolygon, only the
  // largest ring (by vertex count, a cheap proxy for area) is used so a
  // small offshore sliver doesn't drag the centroid off toward open water.
  useEffect(() => {
    if (!geojson) return;
    const centroids = {};
    for (const feature of geojson.features) {
      const geocode = feature.properties.GEOCODE;
      const geom = feature.geometry;
      if (!geom) continue;

      let ring;
      if (geom.type === "Polygon") {
        ring = geom.coordinates[0];
      } else if (geom.type === "MultiPolygon") {
        ring = geom.coordinates
          .map((poly) => poly[0])
          .reduce((a, b) => (b.length > a.length ? b : a));
      }
      if (!ring || !ring.length) continue;

      let lngSum = 0, latSum = 0;
      for (const [lng, lat] of ring) { lngSum += lng; latSum += lat; }
      centroids[geocode] = { lat: latSum / ring.length, lng: lngSum / ring.length };
    }
    centroidsRef.current = centroids;
  }, [geojson]);

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

    // Esri Light Gray Canvas ("World_Light_Gray_Base") — no city-name
    // labels (RPU request), same look as the old CartoDB Positron
    // "light_nolabels" tile this replaced 2026-09-01. Switched because
    // CARTO's basemaps.cartocdn.com now requires an API key and this app
    // never had one wired up, so every map showed a repeated "API key
    // required" watermark. Esri's Canvas basemaps need no key/signup.
    // Native tile zoom tops out at 16 (this map never zooms past 13 via
    // fitBounds, so that's not a practical limit).
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS community',
        maxZoom: 16,
      }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const geoLayer = L.geoJSON(geojson, {
      style: (feature) =>
        getFeatureStyleRef.current(feature.properties.GEOCODE, selectedGeocodeRef.current, pinnedGeocodeRef.current),

      onEachFeature: (feature, layer) => {
        const geocode = feature.properties.GEOCODE;

        layer.on("click", () => {
          const d = dataByGeocodeRef.current[geocode];
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
          e.target.setStyle(getFeatureStyleRef.current(geocode, selectedGeocodeRef.current, pinnedGeocodeRef.current));
          setMapHoveredGeocode(null);
        });
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;
    map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });
    // Cap zoom-out at the citywide view fitted above — nothing north of
    // "see all five boroughs" is useful here, and it keeps the basemap
    // from zooming out to state/regional scale.
    map.setMinZoom(map.getZoom());

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      geoLayerRef.current = null;
    };
  }, [leafletReady, geojson, dataByGeocode, hoverStrokeColor]);

  // Re-style all features when selection or pin changes, or when the style
  // function itself changes identity (e.g. a virus color-scale switch).
  useEffect(() => {
    if (!geoLayerRef.current) return;
    geoLayerRef.current.eachLayer((layer) => {
      const geocode = layer.feature.properties.GEOCODE;
      layer.setStyle(getFeatureStyleRef.current(geocode, selectedGeocode, pinnedGeocode));
      if (geocode === selectedGeocode || geocode === pinnedGeocode) layer.bringToFront();
    });
  }, [selectedGeocode, pinnedGeocode, getFeatureStyle]);

  // Fly map to selected feature — and back out to the full citywide view
  // when the selection is cleared (e.g. search box emptied out). While a
  // comparison is active (a different district is pinned), fit both
  // districts in view together instead of just the selected one, so the
  // user can see the two areas being compared side by side.
  useEffect(() => {
    if (!mapInstanceRef.current || !geoLayerRef.current) return;
    if (selectedGeocode == null) {
      mapInstanceRef.current.fitBounds(geoLayerRef.current.getBounds(), { padding: [10, 10] });
      return;
    }
    let selectedBounds = null;
    let pinnedBounds = null;
    geoLayerRef.current.eachLayer((layer) => {
      const geocode = layer.feature.properties.GEOCODE;
      if (geocode === selectedGeocode) selectedBounds = layer.getBounds();
      if (pinnedGeocode != null && geocode === pinnedGeocode) pinnedBounds = layer.getBounds();
    });
    if (!selectedBounds) return;

    if (pinnedBounds && pinnedGeocode !== selectedGeocode) {
      mapInstanceRef.current.fitBounds(selectedBounds.extend(pinnedBounds), {
        padding: [40, 40],
        maxZoom: 13,
      });
    } else {
      mapInstanceRef.current.fitBounds(selectedBounds, {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [selectedGeocode, pinnedGeocode]);

  // Given a currently-selected geocode and an arrow-key direction, finds the
  // nearest district whose centroid actually lies in that compass direction
  // — not just "next/previous in a sorted list" (the previous approach
  // sorted geocodes borough-first, so crossing a borough boundary could jump
  // to a district nowhere near the current one, e.g. Left from Williamsburg/
  // Greenpoint landing in the Bronx). Falls back to the closest district in
  // any direction if none falls within the ~45° cone around the requested
  // direction, so arrow keys never go dead near the edge of the map.
  //
  // The cone is intentionally narrow (45°, not a wider 60–90°): tested
  // against the real GeoJSON, a 60° cone let one diagonal neighbor satisfy
  // two different arrow keys at once (e.g. from Williamsburg/Greenpoint,
  // Woodside/Sunnyside sits ~30° off vertical and was matching both Up and
  // Right). 45° keeps each district's "up/down/left/right" candidate set
  // from overlapping like that.
  const ON_AXIS_COS = Math.SQRT1_2; // cos(45°) ≈ 0.7071
  const getNeighborInDirection = (fromGeocode, key) => {
    const DIRS = {
      ArrowUp:    { dx: 0, dy: 1 },
      ArrowDown:  { dx: 0, dy: -1 },
      ArrowLeft:  { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
    };
    const dir = DIRS[key];
    if (!dir) return null;

    const centroids = centroidsRef.current;
    const from = centroids[fromGeocode];
    if (!from) return null;

    const candidates = Object.keys(dataByGeocode)
      .map(Number)
      .filter((g) => g !== fromGeocode && centroids[g]);

    let best = null, bestScore = Infinity;
    let bestAny = null, bestAnyDist = Infinity;

    for (const g of candidates) {
      const to = centroids[g];
      const dx = to.lng - from.lng;
      const dy = to.lat - from.lat;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      if (dist < bestAnyDist) { bestAnyDist = dist; bestAny = g; }

      // Cosine of the angle between (dx, dy) and the direction vector: 1 =
      // exactly on-axis, 0 = perpendicular, negative = the wrong way.
      const cos = (dx * dir.dx + dy * dir.dy) / dist;
      if (cos <= ON_AXIS_COS) continue; // outside the ~45° cone around the direction

      const score = dist / cos; // prefer close AND on-axis
      if (score < bestScore) { bestScore = score; best = g; }
    }

    return best ?? bestAny;
  };

  // Keep the bar chart's native "selected" signal in sync with React state.
  // Cheap (view.signal + partial run) — does not touch `data`, so it never
  // triggers a re-embed of the chart.
  useEffect(() => {
    const view = chartViewRef.current;
    if (!view) return;
    view.signal("selectedSig", selectedGeocode != null ? String(selectedGeocode) : null);
    view.runAsync();
  }, [selectedGeocode]);

  // A 5-digit query is treated as a ZIP code lookup (see zipToUhf.js)
  // rather than a name filter — no UHF42 neighborhood name contains digits,
  // so this never conflicts with name search. Only a single, exact 5-digit
  // match is honored (no partial-ZIP prefix matching yet — see zipToUhf.js
  // for why exact-match was the simpler starting point); anything else
  // falls through to the normal substring-of-name filter, same as before.
  const suggestions = useMemo(() => {
    const trimmed = search.trim();
    const entries = Object.entries(dataByGeocode);

    if (looksLikeZip(trimmed)) {
      const geocode = uhfGeocodeForZip(trimmed);
      const match = geocode != null ? entries.find(([g]) => Number(g) === geocode) : null;
      if (!match) return [];
      const [g, d] = match;
      return [[g, { ...d, matchedZip: trimmed }]];
    }

    const q = trimmed.toLowerCase();
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
    getNeighborInDirection,
  };
}
