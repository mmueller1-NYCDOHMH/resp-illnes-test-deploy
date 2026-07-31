/**
 * virusRegistry
 *
 * Single source of truth for all virus-level metadata.
 * Replaces scattered lookups in:
 *   - virusSlugs.js (deleted)            — slug ↔ label
 *   - virusText.js (simplified)          — VIRUS_KEY_BY_LABEL now derived here
 *   - edSeasonalComparisonChart.jsx      — local virusColors map removed
 *   - SmallMultipleBarChart.jsx          — inline if/else color logic removed
 *
 * pageConstants.js derives virusLowercaseDisplay and virusDisplayLabelsArticle
 * from this registry via Object.fromEntries — it does NOT duplicate them.
 *
 * Usage:
 *   import { virusRegistry, virusBySlug, getVirusMeta } from "./virusRegistry";
 *
 *   // By display name (as used in UI and pageState)
 *   const meta = getVirusMeta("Flu");
 *   meta.chartColor   // "#387781"
 *   meta.sourceName   // "Influenza"  (how the CSV spells it)
 *   meta.slug         // "flu"
 *
 *   // By URL slug
 *   const meta = virusBySlug["covid-19"];
 *
 *   // By metric/series string from data row
 *   const meta = getVirusMetaByString("Influenza hospitalizations");
 */

import { tokens } from "../styles/tokens";

// ─── Registry ────────────────────────────────────────────────────────────────

export const virusRegistry = {
  "COVID-19": {
    // Routing
    slug: "covid-19",

    // Display
    displayName: "COVID-19",
    lowercase:   "COVID-19",
    article:     "a",           // "a COVID-19 visit"

    // Data — how the CSV / API spells the virus name
    sourceName: "COVID-19",

    // Theming
    colorScaleKey: "covid",
    chartColor:    tokens.colorScales.covid[2],  // #8739B7  (purple)
  },

  "Flu": {
    slug:        "flu",
    displayName: "Flu",
    lowercase:   "flu",
    article:     "a",           // "a flu visit"
    sourceName:  "Influenza",   // CSV uses "Influenza", UI shows "Flu"
    colorScaleKey: "flu",
    chartColor:  tokens.colorScales.flu[2],      // #387781  (teal)
  },

  "RSV": {
    slug:        "rsv",
    displayName: "RSV",
    lowercase:   "RSV",
    article:     "an",          // "an RSV visit"
    sourceName:  "RSV",
    colorScaleKey: "rsv",
    chartColor:  tokens.colorScales.rsv[2],      // #AA4C34  (rust)
  },

  // ARI is shown on the overview page but has no dedicated /data route
  "ARI": {
    slug:        null,
    displayName: "Respiratory illness",
    lowercase:   "respiratory illness",
    article:     "a",
    sourceName:  "ARI",
    colorScaleKey: "ari",
    chartColor:  tokens.colorScales.ari[0],      // #26A69A  (teal-green)
  },
};

// ─── Convenience lookups ──────────────────────────────────────────────────────

/**
 * All viruses that have a dedicated data page (slug is non-null).
 */
export const routeableViruses = Object.values(virusRegistry).filter(
  (v) => v.slug !== null
);

/**
 * Lookup by URL slug → virus meta object.
 * e.g.  virusBySlug["flu"]  →  { displayName: "Flu", ... }
 */
export const virusBySlug = Object.fromEntries(
  routeableViruses.map((v) => [v.slug, v])
);

/**
 * Get virus metadata by display name (as used in UI state / pageState).
 * Returns undefined for unknown names rather than throwing.
 *
 * @param {string} displayName  e.g. "Flu", "COVID-19", "RSV"
 * @returns {object|undefined}
 */
export const getVirusMeta = (displayName) => virusRegistry[displayName];

/**
 * Infer virus meta from an arbitrary string (series name, metric string, etc.).
 * Useful in chart components that only receive a metric/series label.
 *
 * @param {string} str  e.g. "Influenza hospitalizations", "COVID-19 cases"
 * @returns {object}  virus meta, falling back to a neutral default
 */
export const getVirusMetaByString = (str = "") => {
  const s = str.toLowerCase();
  if (/\bcovid(?:-?19)?\b/.test(s)) return virusRegistry["COVID-19"];
  if (/\binfluenza\b|\bflu\b/.test(s))  return virusRegistry["Flu"];
  if (/\brsv\b/.test(s))                return virusRegistry["RSV"];
  if (/\bari\b|\brespiratory illness\b/.test(s)) return virusRegistry["ARI"];
  return null;
};

// ─── Normalisation helpers (replaces virusMap.js exports) ────────────────────

/**
 * Convert source name → display name  (Influenza → Flu).
 * Non-matching values are returned unchanged.
 */
export const toDisplayVirus = (v) =>
  /^influenza$/i.test(String(v || "")) ? "Flu" : v;

/**
 * Convert display name → source name  (Flu → Influenza).
 * Non-matching values are returned unchanged.
 */
export const toSourceVirus = (v) =>
  /^flu$/i.test(String(v || "")) ? "Influenza" : v;
