// utils/colorScale.js
//
// Continuous (gradient) choropleth color scales.
//
// Replaces the old discrete/threshold approach (a hardcoded COLOR_BREAKS
// array + a step function that snapped each value into one of 5 fixed
// bins). That made neighborhoods with very different rates within the same
// bin look identical, and produced hard color "cliffs" at each break.
//
// Here, `makeColorScale` returns a getColor(value) function that linearly
// interpolates across an ordered list of hex stops (low → high) based on
// where the value falls in a [min, max] domain — a smooth gradient instead
// of discrete bins.

export const NULL_COLOR = "#e5e7eb"; // gray-200 — used when a feature has no data

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blendHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

// Maps t (0–1) to a color by linearly interpolating across an ordered list
// of hex stops.
export function stopsToColor(stops, t) {
  if (t <= 0) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const scaled = t * (stops.length - 1);
  const lo     = Math.floor(scaled);
  const hi     = Math.ceil(scaled);
  const frac   = scaled - lo;
  return blendHex(stops[lo], stops[hi], frac);
}

// Returns [min, max] across a list of numbers, ignoring null/undefined.
export function domainFromValues(values) {
  const nums = values.filter((v) => v != null);
  return [Math.min(...nums), Math.max(...nums)];
}

// Returns a getColor(value) function closed over a fixed [min, max] domain
// and an ordered array of gradient stop colors (low → high).
export function makeColorScale(stops, domain) {
  const [min, max] = domain;
  const range = max - min || 1;
  return function getColor(value) {
    if (value == null) return NULL_COLOR;
    const t = (value - min) / range;
    return stopsToColor(stops, Math.min(1, Math.max(0, t)));
  };
}

// CSS linear-gradient() string for a legend swatch — same stops, evenly
// spaced, so the legend bar matches what getColor actually produces.
export function stopsToCssGradient(stops) {
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
