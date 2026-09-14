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
 * `benchmarkLabel` (e.g. "NYC 5.6%" — used for both the on-chart text next
 * to the benchmark line and the rule's hover tooltip) are resolved at
 * render time via VegaLiteWrapper's `dynamicFields`, so the same spec
 * object works for a fixed palette (home page) or a per-virus palette
 * (data pages) alike.
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
        calculate: "datum.rate + ' cases per 100,000 people'",
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
        // Single dashed reference line at the citywide benchmark. Tooltip
        // and the on-chart label (below) now share the same text —
        // `benchmarkLabel` carries the value, e.g. "NYC 5.6%".
        data: { values: [{}] },
        mark: { type: "rule", strokeDash: [4, 3], color: "#6b7280", size: 1 },
        encoding: {
          y: { datum: "{benchmarkValue}", type: "quantitative" },
          tooltip: { value: "{benchmarkLabel}" },
        },
      },
      {
        // "NYC x%" label, TRUE right-alignment: `align: "right"` makes the
        // text's RIGHT edge the anchor point (text-anchor="end" in the
        // rendered SVG), planted at the plot's own right edge
        // (`x: {value:{expr:"width"}}`, same right edge the bars and the
        // dashed rule line already reach) — flush right, not just "right of
        // center". Sits just above the benchmark line itself (not beside
        // it): `baseline: "bottom"` + a small negative `dy` means the
        // line's own y-value acts as the text's bottom edge with a few px
        // of clearance, so the label reads as an annotation ON the line.
        //
        // A prior pass (verified live via Morgan's own browser devtools —
        // see the actual rendered <text text-anchor="middle"
        // transform="translate(223.82,...)"> in her report) used
        // `align: "center"` with `x` at 62% of plot width. That position
        // WAS exactly correct per that spec (361 * 0.62 = 223.82, confirmed
        // live) — but `align: "center"` is CENTER-anchored text, not
        // right-anchored, so the label straddled its x point symmetrically
        // rather than sitting flush against a right-side edge. That's very
        // likely why every "shift right" pass before this one kept looking
        // wrong even once the x position itself was proven correct:
        // "shifted right of center" and "right-aligned" are not the same
        // thing when `align` stays "center". This pass fixes the actual
        // `align` property, not just the x position.
        //
        // Padding note: `padding.right` stays at 8 (matching the other 3
        // sides) — a prior pass widened it to 60 to make room for a `dx`
        // offset and that visibly narrowed the bar chart itself
        // (VegaLiteWrapper's autosize treats the given width as the TOTAL
        // view size including padding). Anchoring the text at its own right
        // edge via `align:"right"` needs no reserved margin at all — the
        // text naturally draws leftward from `x:width`, staying inside the
        // existing plot area. See project memory
        // project_rvp_citywide_label_on_line.md for the full history.
        //
        // IMPORTANT — positional-channel gotcha (bit us once already, see
        // project memory project_rvp_citywide_label_on_line.md): any
        // expression-driven x/y position here MUST be written as
        // `{ value: { expr: "..." } }`, NOT `{ expr: "..." }` — the bare
        // form is silently dropped by Vega-Lite (doesn't count as a data
        // field/datum/value/signal for a positional channel) and falls back
        // to a centered default with no warning. Verified correct not just
        // by compiling this exact spec with the vega-lite package but by
        // actually running it through vega's renderer and reading the real
        // SVG output (`view.toSVG()`), confirming the rendered text's pixel
        // position rather than just the compiled expression string.
        data: { values: [{}] },
        mark: {
          type: "text",
          align: "right",
          baseline: "bottom",
          dy: -3,
          fontSize: 12.5,
          fontWeight: 700,
        },
        encoding: {
          x: { value: { expr: "width" } },
          y: { datum: "{benchmarkValue}", type: "quantitative" },
          text: { value: "{benchmarkLabel}" },
          color: { value: "#1f2937" },
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
