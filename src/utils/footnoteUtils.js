// Default cutoff for the "missing data" overlay: once the proportion of
// records missing race/ethnicity hits this %, the chart is considered too
// unreliable to display by group and gets replaced with an explanatory
// overlay (see MissingDataOverlay + ChartContainer's `missingDataOverlay`
// prop). Sections can override via `missingDataOverlay: { thresholdPct }`.
export const MISSING_RACE_ETHNICITY_OVERLAY_THRESHOLD = 40;

/**
 * Should the missing-data overlay replace the chart for this % missing?
 * @param {number|null} unknownPct
 * @param {number} threshold
 * @returns {boolean}
 */
export function shouldShowMissingDataOverlay(
  unknownPct,
  threshold = MISSING_RACE_ETHNICITY_OVERLAY_THRESHOLD
) {
  return Number.isFinite(unknownPct) && unknownPct >= threshold;
}

export function getUnknownRaceEthnicityPercent(rows = [], virus) {
  if (!Array.isArray(rows) || !virus) return null;

  const metricPrefix =
    virus === "Flu" ? "Influenza" : virus;

  const expectedMetric = `${metricPrefix} cases by race and ethnicity`;

  const row = [...rows].reverse().find((r) => {
    // Match correct virus
    if (String(r.metric || "").trim() !== expectedMetric) {
      return false;
    }

    // Match submetric
    if (
      String(r.submetric || "").trim() !==
      "Proportion missing race and ethnicity"
    ) {
      return false;
    }

    // Percent rows only
    if (String(r.display || "").toLowerCase() !== "percent") {
      return false;
    }

    return Number.isFinite(r.valueNum);
  });

  return row?.valueNum ?? null;
}
