/**
 * Shared display-label dictionaries used by ConfigDrivenPage
 * and its extracted section components.
 *
 * Virus-specific dicts (virusLowercaseDisplay, virusDisplayLabelsArticle)
 * are derived from virusRegistry — virusRegistry is the single source of truth
 * for all per-virus metadata. These exports remain here so existing imports
 * don't need to change.
 */

import { virusRegistry } from "./virusRegistry";

// ── View labels (not virus-specific) ─────────────────────────────────────────

export const viewDisplayLabels = {
  visits: "Visits",
  hospitalizations: "Hospitalizations",
};

export const viewDisplayLabelsPreposition = {
  visits: "to",
  hospitalizations: "from",
};

// ── Virus display dicts — derived from virusRegistry ─────────────────────────

/**
 * Maps display virus name → lowercase version used in prose.
 * e.g. { "COVID-19": "COVID-19", "Flu": "flu", "RSV": "RSV" }
 */
export const virusLowercaseDisplay = Object.fromEntries(
  Object.entries(virusRegistry).map(([name, meta]) => [name, meta.lowercase])
);

/**
 * Maps display virus name → indefinite article ("a" or "an").
 * e.g. { "COVID-19": "a", "Flu": "a", "RSV": "an" }
 */
export const virusDisplayLabelsArticle = Object.fromEntries(
  Object.entries(virusRegistry).map(([name, meta]) => [name, meta.article])
);

// ── Group display names (demographic labels) ──────────────────────────────────

export const groupDisplayNames = {
  Bronx: "the Bronx",
  "0-4": "Ages 0–4",
  "5-17": "Ages 5–17",
  "18-64": "Ages 18–64",
  "65+": "Ages 65+",
  "All Ages": "all Age Groups",
  "All Boroughs": "All Boroughs",
};

// ── Metric label resolver ─────────────────────────────────────────────────────

/**
 * Human-readable metric label for subtitle when view isn't applicable.
 * @param {{ dataType: string, view: string }} params
 * @returns {string}
 */
export function resolveMetricLabel({ dataType, view }) {
  if (dataType === "ed") return viewDisplayLabels[view] || "Visits";
  if (dataType === "cases" || dataType === "lab") return "Cases";
  if (dataType === "deaths" || dataType === "death") return "Deaths";
  return "Value";
}
