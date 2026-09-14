/**
 * dataTypeOptions
 *
 * Single source of truth for data-type navigation options.
 * Imported by PageSidebar. (TopControls.jsx and FloatingTogglePill also used
 * to import this — TopControls is dead code with no importers, and
 * FloatingTogglePill no longer exists in this repo; see the code-audit
 * notes, 2026-09-14.)
 * Add new data types here — PageSidebar updates automatically.
 */

export const ALL_DATA_TYPE_OPTIONS = [
  { label: "Emergency department", value: "ed" },
  { label: "Lab-reported cases",   value: "lab" },
  { label: "COVID-19 deaths",      value: "death" },
  { label: "Wastewater",           value: "wastewater" },
];

/**
 * Filter options for the active virus.
 * Flu and RSV don't have a deaths data type.
 */
export function getDataTypeOptions(activeVirus) {
  return activeVirus === "Flu" || activeVirus === "RSV"
    ? ALL_DATA_TYPE_OPTIONS.filter((o) => o.value !== "death")
    : ALL_DATA_TYPE_OPTIONS;
}
