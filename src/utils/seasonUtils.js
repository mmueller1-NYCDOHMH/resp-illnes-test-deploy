/**
 * seasonUtils.js
 *
 * Defines typical respiratory virus peak seasons and generates the inline
 * band data rows used by Vega-Lite rect layers in LineChart / CombinedVirusChart.
 *
 * Months are 0-indexed (JS Date convention):
 *   0=Jan … 9=Oct, 10=Nov, 11=Dec
 *
 * All defined seasons cross a year boundary (start late in year Y, end early
 * in year Y+1), so startMonth > endMonth.
 */

export const PEAK_SEASONS = {
  "COVID-19": { startMonth: 11, endMonth: 1, label: "Typical COVID peak (Dec–Feb)" },
  "Flu":      { startMonth: 9,  endMonth: 2, label: "Typical flu season (Oct–Mar)"  },
  "RSV":      { startMonth: 9,  endMonth: 1, label: "Typical RSV season (Oct–Feb)"  },
};

/**
 * Build an array of { start, end } ISO-string pairs that cover the peak
 * season for `virusName` across the calendar years present in `data`.
 *
 * @param {string} virusName   — e.g. "Flu", "COVID-19", "RSV"
 * @param {Array}  data        — the chart's data rows (must contain a `date` field)
 * @returns {Array<{start: string, end: string}>}
 */
export function buildSeasonBands(virusName, data) {
  const season = PEAK_SEASONS[virusName];
  if (!season || !Array.isArray(data) || data.length === 0) return [];

  const timestamps = data
    .map((d) => new Date(d.date).getTime())
    .filter((t) => Number.isFinite(t));
  if (timestamps.length === 0) return [];

  const minYear = new Date(Math.min(...timestamps)).getFullYear() - 1;
  const maxYear = new Date(Math.max(...timestamps)).getFullYear() + 1;

  const bands = [];
  for (let year = minYear; year <= maxYear; year++) {
    // Season starts in `year` at startMonth, ends in `year + 1` at endMonth
    const start = new Date(year,     season.startMonth, 1);
    // Last day of endMonth in year+1: set to day 0 of the following month
    const end   = new Date(year + 1, season.endMonth + 1, 0);
    bands.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return bands;
}
