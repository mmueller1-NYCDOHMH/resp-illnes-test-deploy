// src/utils/neighborhoodGeoData.js
//
// Turns RPU's "by neighborhood" rows in caseData.csv / emergencyDeptData.csv
// into UHF42-geocode-keyed lookups the choropleth maps can consume.
//
// RPU reports these rows at the UHF34 level, but seven UHF34 areas are
// combinations of two or three UHF42 neighborhoods, and the CSV represents
// those combined areas with a single row whose submetric is a "/"-joined
// list of UHF42 codes (e.g. "105/106/107" for the South Bronx). Per the
// "UHF34 <> UHF42" email thread (Matthew Montesano / Hilary Parton / Morgan
// Mueller, 2026-08-18), Morgan confirmed doing that split on the front end
// rather than asking RPU to change the file: every UHF42 code in a combined
// group gets the same value. The seven combined groups as of that thread:
// 105/106/107, 305/307, 306/308, 309/310, 404/406, 501/502, 503/504 — but
// this module doesn't hardcode that list, it just splits whatever submetric
// string it's given, so a future file with more/fewer combined groups still
// works without a code change.
//
// Masking: RPU suppresses rates computed from small numerators (esp. Flu/
// RSV) by leaving `value` blank. loadCSVData already turns a blank value
// into `valueNum: null` — this module passes that through as `null` rather
// than 0, so callers can distinguish "suppressed, too few cases to report"
// from "confirmed zero." colorScale.js's makeColorScale already renders
// `null` as NULL_COLOR (gray) rather than the bottom of the gradient, so
// map coloring is correct for free; UI text should still say so explicitly
// (see isSuppressed below) rather than just going quiet.

import { UHF_GEOCODES, UHF_NEIGHBORHOODS } from "./uhfNeighborhoods";

/**
 * Splits a submetric like "105/106/107" into [105, 106, 107]. A plain
 * "105" splits into [105]. Non-numeric/empty pieces are dropped.
 */
export function splitUhfCodes(submetric) {
  if (!submetric) return [];
  return String(submetric)
    .split("/")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

/**
 * Builds a Map<geocode, geocode[]> of "reported together with" siblings —
 * every other UHF42 code that shares a combined-group row with this one, in
 * any "by neighborhood" row in `rows` (not scoped to a single metric, since
 * the combined groupings are a structural fact about UHF34<->UHF42, not a
 * per-metric one — the same 7 groups show up under every "by neighborhood"
 * metric in a given file). A geocode that's never part of a combined
 * submetric (the other 27 of 42) gets an empty array, not an absent entry.
 *
 * This is deliberately derived from whatever rows are passed in, not a
 * hardcoded list of the 7 known groups — same reasoning as
 * splitUhfCodes/buildUhfMetricMap above: if RPU's grouping ever changes,
 * this keeps working without a code change here.
 */
export function buildGroupedWithMap(rows) {
  const siblings = new Map(); // geocode -> Set<geocode>
  for (const row of rows) {
    const codes = splitUhfCodes(row.submetric);
    if (codes.length < 2) continue;
    for (const code of codes) {
      if (!siblings.has(code)) siblings.set(code, new Set());
      for (const other of codes) {
        if (other !== code) siblings.get(code).add(other);
      }
    }
  }
  const result = new Map();
  for (const [code, set] of siblings) {
    result.set(code, [...set].sort((a, b) => a - b));
  }
  return result;
}

/**
 * Human-readable "reported together with" note for a grouped neighborhood,
 * or null if it isn't part of a combined-UHF34 group. Surfaces the same
 * fact RPU's own file communicates via the combined "105/106/107"-style
 * submetric — see the file header comment — since splitting that into
 * separate map polygons (per the "UHF34 <> UHF42" email thread) would
 * otherwise hide it: a user selecting one of the 15 grouped neighborhoods
 * would otherwise have no way to know its value isn't independent of its
 * group-mates.
 *
 * @param {object} entry - One dataByGeocode entry (must have `groupedWith`).
 * @param {object} dataByGeocode - The full lookup, to resolve sibling names.
 */
export function groupedWithNote(entry, dataByGeocode) {
  if (!entry?.groupedWith?.length) return null;
  const names = entry.groupedWith
    .map((gc) => dataByGeocode[gc]?.name)
    .filter(Boolean);
  if (!names.length) return null;
  return `Reported together with ${names.join(", ")} — data are not distinguished between these neighborhoods.`;
}

/**
 * Builds a Map<geocode, number|null> for one metric out of parsed CSV rows
 * (as returned by loadCSVData). Combined-group submetrics are expanded so
 * every UHF42 code in the group gets the row's value. A geocode with no
 * matching row at all (shouldn't happen once RPU's file is complete, but
 * cheap to guard) is simply absent from the returned Map — callers should
 * treat "absent" the same as "null" (no data).
 *
 * @param {object[]} rows - Parsed rows from loadCSVData.
 * @param {string} metricName - Exact `metric` value to filter on, e.g.
 *   "Flu case rate per 100,000 by neighborhood".
 * @returns {Map<number, number|null>}
 */
export function buildUhfMetricMap(rows, metricName) {
  const map = new Map();
  for (const row of rows) {
    if (row.metric !== metricName) continue;
    const codes = splitUhfCodes(row.submetric);
    for (const code of codes) {
      map.set(code, row.valueNum);
    }
  }
  return map;
}

/**
 * Builds the full `dataByGeocode` object a choropleth map needs: every
 * known UHF42 neighborhood (see uhfNeighborhoods.js), merged with one or
 * more metric value maps.
 *
 * @param {object[]} rows - Parsed CSV rows (single source — pass caseData
 *   rows or emergencyDeptData rows, not both; call this once per source and
 *   merge if a component needs fields from both).
 * @param {{ key: string, metric: string }[]} fieldSpecs - Which CSV metrics
 *   to pull, and what key to expose each one under.
 * @returns {Object<number, object>} geocode -> { name, borough, groupedWith: number[], [key]: number|null, ... }
 */
export function buildUhfDataByGeocode(rows, fieldSpecs) {
  const valueMaps = fieldSpecs.map(({ key, metric }) => ({
    key,
    map: buildUhfMetricMap(rows, metric),
  }));
  const groupedWithMap = buildGroupedWithMap(rows);

  const result = {};
  for (const geocode of UHF_GEOCODES) {
    const entry = { ...UHF_NEIGHBORHOODS[geocode], groupedWith: groupedWithMap.get(geocode) || [] };
    for (const { key, map } of valueMaps) {
      entry[key] = map.has(geocode) ? map.get(geocode) : null;
    }
    result[geocode] = entry;
  }
  return result;
}

/** True when a neighborhood's value for a field is suppressed (masked). */
export function isSuppressed(entry, key) {
  return entry != null && entry[key] == null;
}

/**
 * Unweighted average of a field across all non-suppressed neighborhoods —
 * used as a stand-in "citywide" reference line where no true citywide rate
 * ships in the file (see LabCasesNeighborhoodMap / NeighborhoodMap). Not an
 * official DOHMH citywide statistic — just a same-source proxy so the
 * benchmark line moves with the real data instead of staying hardcoded.
 */
export function averageAcrossNeighborhoods(dataByGeocode, key) {
  const values = Object.values(dataByGeocode)
    .map((d) => d[key])
    .filter((v) => v != null);
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
