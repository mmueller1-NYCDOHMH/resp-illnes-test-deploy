// src/utils/virusMap.js
//
// toDisplayVirus / toSourceVirus are now the canonical exports from virusRegistry.js.
// Re-exported here so existing imports don't break during the migration.
export { toDisplayVirus, toSourceVirus } from "./virusRegistry";

// Try to infer the source virus from a row even if "virus" is missing.
export function coerceRowVirus(row = {}) {
  if (row.virus) return toSourceVirus(row.virus);
  const s = String(row.series || row.metric || "").toLowerCase();
  if (/\binfluenza\b/.test(s) || /\bflu\b/.test(s)) return "Influenza"; // <-- add Flu detection
  if (/\bcovid(?:-?19)?\b/.test(s)) return "COVID-19";
  if (/\brsv\b/.test(s)) return "RSV";
  if (/\bari\b/.test(s)) return "ARI";
  return undefined;
}

// Try to infer view if not explicitly present.
export function coerceRowView(row = {}) {
  if (row.view) return row.view;
  const s = String(row.series || "");
  if (/hospitalizations?\b/i.test(s)) return "hospitalizations";
  if (/visits?\b/i.test(s)) return "visits";
  return undefined;
}
