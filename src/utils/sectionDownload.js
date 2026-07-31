/**
 * Download helpers shared by ChartSection and CustomSection.
 *
 * Both branches had nearly identical download-click handlers differing only
 * in the virus override for "combined-virus".  This module unifies them.
 */

import { downloadCSV, buildDownloadName } from "./downloadUtils";

/**
 * Flatten potentially multi-series section data into a flat row array,
 * cleaning up series name suffixes so the CSV is readable.
 *
 * @param {Array|object} data
 * @returns {Array}
 */
export const flattenSectionData = (data) => {
  if (Array.isArray(data)) return data;
  return Object.entries(data || {}).flatMap(([seriesName, rows]) =>
    (rows || []).map((row) => ({
      ...row,
      series: seriesName
        .replace(" visits", "")
        .replace(" hospitalizations", "")
        .replace("COVID-19", "COVID")
        .replace("Influenza", "flu"),
    }))
  );
};

/**
 * Build a download-click handler for a config section.
 *
 * @param {object} params
 * @param {Array|object} params.filteredData  - Raw section data (flat array or keyed object)
 * @param {object}       params.section       - Config section object
 * @param {string}       params.activeVirus
 * @param {string}       params.dataType
 * @param {string}       params.view
 * @param {string|Date}  params.latestDate
 * @param {string}       [params.categoryForFile]  - Overrides section.id for filename
 * @returns {() => void}
 */
export const buildDownloadHandler = ({
  filteredData,
  section,
  activeVirus,
  dataType,
  view,
  latestDate,
  categoryForFile,
}) => () => {
  const exportRows = flattenSectionData(filteredData);

  const virusForFile =
    section.id === "combined-virus" ? "ARI" : activeVirus;
  const metricForFile = dataType === "ed" ? view : undefined;
  const category = categoryForFile || section.id || "section";

  const fileName =
    section.chart?.props?.downloadFileName ||
    buildDownloadName({
      virus: virusForFile,
      metric: metricForFile,
      category,
      date: latestDate,
      ext: "csv",
      includeMetric: !(dataType === "cases" || dataType === "deaths"),
    });

  if (exportRows?.length) {
    downloadCSV(exportRows, fileName);
    return;
  }

  // Fallback: anchor-click direct file download (e.g. pre-built CSV path on server)
  const rawPath =
    section.componentProps?.dataPath || section.chart?.props?.dataPath;
  if (rawPath) {
    const a = document.createElement("a");
    a.href = rawPath;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
