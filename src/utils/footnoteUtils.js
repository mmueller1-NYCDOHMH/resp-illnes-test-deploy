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
