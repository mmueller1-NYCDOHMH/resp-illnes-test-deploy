/**
 * Shared Vega-Lite spec for the ranked neighborhood bar chart linked to
 * each choropleth map (home page NeighborhoodMap + per-virus
 * LabCasesNeighborhoodMap). Column orientation: neighborhoods run
 * left→right, rate/count runs up the Y axis, with a dashed benchmark rule
 * for context.
 *
 * Hover + selection highlight are handled *inside* Vega via params instead
 * of by recomputing chart data in React on every mouseover. Previously,
 * hover state fed back into the data array passed to Vega, which changed
 * the spec's `data` on every mouseover and forced react-vega to tear down
 * and fully re-create the view (see computeSpecChanges/isExpensive in
 * react-vega) — including replaying the bar entrance animation — on every
 * single hover. With 58 narrow bars packed into this column, a normal
 * mouse sweep crosses several of them a second, so that showed up as a
 * visible flicker/"glitch". `hoverSel` is a native point selection (cheap,
 * no React round-trip); `selectedSig` is a plain reactive value kept in
 * sync with React's selectedGeocode via view.signal() (see
 * useChoroplethMap's selectedSig effect).
 *
 * `selectedColor` / `hoverColor` / `chartHeight` / `benchmarkValue` /
 * `benchmarkLabel` are resolved at render time via VegaLiteWrapper's
 * `dynamicFields`, so the same spec object works for a fixed palette
 * (home page) or a per-virus palette (data pages) alike.
 *
 * @param {object[]} tooltipFields - Vega tooltip field defs, e.g.
 *   [{ field: "name", title: "Neighborhood" }, { field: "rate", title: "Rate per 100,000" }]
 * @param {string} [valueField] - Data field plotted on the Y axis and used
 *   to sort bars (descending). Defaults to "rate"; NeighborhoodMap passes
 *   "pct" to plot % of ED visits instead.
 */
export function buildChoroplethBarSpec(tooltipFields, valueField = "rate") {
  return {
    params: [
      { name: "selectedSig", value: null },
    ],
        transform: [
      {
        calculate: "datum.pct + '% of ED visits'",
        as: "pctTooltip",
      },
      {
        calculate: "datum.rate + ' per 100,000 people'",
        as: "rateTooltip",
      },
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
            sort: { field: valueField, order: "descending" },
            axis: { title: null, labels: false, ticks: false, domain: false },
          },
          y: {
            field: valueField,
            type: "quantitative",
            scale: { zero: true },
            axis: {
              title: null,
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
          tooltip: tooltipFields,
        },
      },
      {
        // Single dashed reference line at the citywide benchmark.
        data: { values: [{}] },
        mark: { type: "rule", strokeDash: [4, 3], color: "#6b7280", size: 1 },
        encoding: {
          y: { datum: "{benchmarkValue}", type: "quantitative" },
          tooltip: { value: "{benchmarkLabel}" },
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
}
