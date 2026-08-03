// src/utils/tooltipUtils.js
/**
 * Shared helpers for the single-line tooltip format used across the Vega-Lite
 * charts: "[series]: value of metric" — e.g. "COVID-19: 12.3% of visits" or
 * "0-4: 1,204 confirmed cases".
 *
 * vega-tooltip renders each tooltip field as a "title | value" table row. To
 * get one combined line instead of separate title/value columns, we build the
 * whole string as a single computed field and give it an empty title.
 */

const escapeForVegaString = (str = "") =>
  String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const lowerFirst = (str = "") =>
  str ? str.charAt(0).toLowerCase() + str.slice(1) : str;

/**
 * Builds a Vega-Lite `calculate` expression that concatenates a series
 * label, a pre-formatted value, and (optionally) a metric label into one
 * display string.
 *
 * @param {string}  [seriesField]  Datum field holding the per-point
 *                                 series/group label (e.g. colorField).
 *                                 Takes priority over seriesLabel.
 * @param {string}  [seriesLabel]  Static fallback label (e.g. the active
 *                                 virus name) used when there's no
 *                                 per-point series field.
 * @param {string}  [valueField]   Datum field already holding the
 *                                 display-ready value (e.g. "12.3%" or
 *                                 "1,204"). Defaults to "valueDisplay".
 * @param {string}  [metricLabel]  Human label for what the value
 *                                 represents (e.g. "Emergency department
 *                                 visits", "Confirmed cases").
 * @param {boolean} [isPercent]    When true, joins the value + metric with
 *                                 " of "; otherwise with a plain space.
 */
export function buildTooltipLineCalc({
  seriesField,
  seriesLabel,
  valueField = "valueDisplay",
  metricLabel,
  isPercent = false,
} = {}) {
  const seriesExpr = seriesField
    ? `datum['${seriesField}']`
    : `'${escapeForVegaString(seriesLabel || "")}'`;

  let unitExpr = "";
  if (metricLabel) {
    const label = escapeForVegaString(lowerFirst(metricLabel));
    unitExpr = isPercent ? ` + ' of ${label}'` : ` + ' ${label}'`;
  }

  return `${seriesExpr} + ': ' + datum['${valueField}']${unitExpr}`;
}

/**
 * Standard tooltip encoding entry for the combined line — rendered as a
 * normal "key | value" row (same table styling as the Date row above it),
 * just with a blank key.
 *
 * Vega-Lite always derives a tooltip row's key from `title` — an empty
 * string or `null` is falsy, so it still falls back to an auto-generated
 * title (e.g. "Tooltip Line" from the field name). A non-breaking space is
 * truthy, so Vega-Lite uses it as-is: the row keeps the exact same
 * key/value table markup as every other row, but the key column renders
 * blank instead of showing text.
 */
export function tooltipLineEntry(as = "tooltipLine") {
  return { field: as, type: "nominal", title: " " };
}

/**
 * Vega expression fragment that blanks out an axis label when its value is
 * (numerically) zero — used to drop the "0" tick from y-axes while keeping
 * the rest of the formatting untouched.
 *
 * @param {string} formatExpr  Expression producing the normal label text,
 *                              referencing `datum.value`/`datum.label`.
 */
export function hideZeroLabelExpr(formatExpr) {
  return `datum.value === 0 ? '' : (${formatExpr})`;
}
