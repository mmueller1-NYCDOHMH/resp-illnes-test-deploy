/**
 * useSectionData
 *
 * Per-section data pipeline extracted from ConfigDrivenPage.
 * Given a config section + current page state, returns every derived value
 * that ChartSection needs to render: filtered data, trend object, display
 * variables, group options, resolved footer HTML, etc.
 *
 * This hook is purely data — no JSX.  Components are responsible for turning
 * the returned values into rendered nodes (e.g. building <TrendSubtitle>).
 */

import { getGroupOptions } from "../../utils/getGroupOptions";
import { toSourceVirus } from "../../utils/virusRegistry";
import { coerceRowVirus, coerceRowView } from "../../utils/virusMap";
import { getUnknownRaceEthnicityPercent } from "../../utils/footnoteUtils";
import {
  getLastTwoValuesSameSeries,
  formatDate,
  formatTrendPhrase,
  coerceNoChange,
  getTrendInfo,
  getLatestWeekFromData,
  isFirstWeekFromData,
  parseLocalISO,
  EPSILON_NO_CHANGE,
} from "../../utils/trendUtils";
import {
  viewDisplayLabels,
  viewDisplayLabelsPreposition,
  virusDisplayLabelsArticle,
  virusLowercaseDisplay,
  groupDisplayNames,
  resolveMetricLabel,
} from "../../utils/pageConstants";
import { getText } from "../../utils/contentUtils";

// ─── small helpers ────────────────────────────────────────────────────────────

const interpolateTokens = (value, vars) => {
  if (typeof value !== "string") return value;
  return value.replace(/{(\w+)}/g, (_, key) => vars[key] ?? `{${key}}`);
};

const interpolateObject = (obj, vars) =>
  JSON.parse(JSON.stringify(obj), (_, v) => interpolateTokens(v, vars));

const resolveText = (input, variables = {}) => {
  const raw =
    typeof input === "string" && input.includes(".") ? getText(input) : input;
  return typeof raw === "string"
    ? raw.replace(/{(\w+)}/g, (_, key) => variables[key] ?? `{${key}}`)
    : raw;
};

const resolveFooter = (footerConfig, variables = {}) => {
  if (!footerConfig) return null;
  if (typeof footerConfig === "string") return interpolateTokens(footerConfig, variables);
  if (typeof footerConfig === "object" && footerConfig.template) {
    const raw = footerConfig.template.includes(".")
      ? getText(footerConfig.template)
      : footerConfig.template;
    return typeof raw === "string" ? interpolateTokens(raw, variables) : null;
  }
  return null;
};

const totalNames = ["Total", "All", "Overall", "All Ages", "All Boroughs"];
const isTotal = (s) => totalNames.includes(String(s || "").trim());

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {object} section           - Config section object
 * @param {string|number} sectionKey - Stable key (section.id or index)
 * @param {object} pageContext       - Current page-level state
 * @param {object} pageContext.data            - Hydrated data map
 * @param {string} pageContext.activeVirus
 * @param {string} pageContext.view
 * @param {string} pageContext.dataType
 * @param {object} pageContext.groupSelections - { [sectionKey]: activeGroup }
 * @param {function} pageContext.updateGroup   - (key, val) => void
 * @param {object} pageContext.hydratedConfig  - Full hydrated config (for uploadDate etc.)
 */
const useSectionData = (section, sectionKey, pageContext) => {
  const {
    data,
    activeVirus,
    view,
    dataType,
    groupSelections,
    updateGroup,
    hydratedConfig,
  } = pageContext;

  // ── 1. Interpolate chart props ──────────────────────────────────────────────
  const textVars = {
    virus: activeVirus,
    view,
    displayView: `<span class="bg-highlight">${viewDisplayLabels[view]}</span>`,
    viewLabelPreposition: viewDisplayLabelsPreposition[view],
    viewLabel: viewDisplayLabels[view],
    virusLabelArticle: virusDisplayLabelsArticle[activeVirus],
    virusLowercase: virusLowercaseDisplay[activeVirus],
  };

  let interpolatedProps = interpolateObject(section.chart?.props || {}, textVars);

  if (section.chart?.props?.getMetricNames) {
    interpolatedProps.metricName = section.chart.props.getMetricNames({
      virus: activeVirus,
      view,
    });
  }
  if (interpolatedProps.submetric === "undefined") {
    interpolatedProps.submetric = undefined;
  }

  // ── 2. Raw filtered data ───────────────────────────────────────────────────
  const dataSourceKey =
    section.dataSourceKey ||
    interpolatedProps.dataSourceKey ||
    section.chart?.props?.dataSourceKey ||
    null;

  const filteredData =
    dataSourceKey && data[dataSourceKey] ? data[dataSourceKey] : [];

  // ── 3. Group options + active group ───────────────────────────────────────
  const groupField = section.chart?.props?.groupField;
  const groupLabel = section.chart?.props?.groupLabel || "All Groups";
  const safeDataArray = Array.isArray(filteredData) ? filteredData : [];
  const groupOptions = getGroupOptions(safeDataArray, groupField, groupLabel);
  const activeGroup = groupSelections[sectionKey] ?? groupOptions[0] ?? null;

  const normalizedGroup = (activeGroup || "").trim();
  const normalizedLabel = (groupLabel || "").trim();
  const groupDisplay = groupDisplayNames[normalizedGroup] || normalizedGroup;

  // ── 4. Flatten multi-series data ─────────────────────────────────────────
  const isMultiSeries =
    typeof filteredData === "object" && !Array.isArray(filteredData);
  const flattenedData = isMultiSeries
    ? Object.entries(filteredData).flatMap(([seriesName, rows]) =>
        (rows || []).map((row) => ({ ...row, series: seriesName }))
      )
    : filteredData;

  // ── 5. Group filter for display ───────────────────────────────────────────
  const groupFilteredData =
    !activeGroup || activeGroup === groupLabel
      ? flattenedData
      : flattenedData.filter((d) => d[groupField] === activeGroup);

  // ── 6. Virus filter ───────────────────────────────────────────────────────
  const sourceVirusForFilter = toSourceVirus(activeVirus);

  const filterByVirus = (rows) =>
    rows?.filter?.((row) => {
      const vRaw = coerceRowVirus(row);
      const v = vRaw ? toSourceVirus(vRaw) : null;
      if (v) return v === sourceVirusForFilter;
      const series = String(row.series || row.metric || row.virus || "");
      return series.toLowerCase().includes(sourceVirusForFilter.toLowerCase());
    }) ?? [];

  const virusFilteredData =
    dataType === "ed"
      ? groupFilteredData.filter((row) => {
          const vRaw = coerceRowVirus(row);
          const v = vRaw ? toSourceVirus(vRaw) : null;
          const vw = coerceRowView(row);
          if (v && vw) return v === sourceVirusForFilter && vw === view;
          const series = String(row.series || row.metric || row.virus || "");
          return series
            .toLowerCase()
            .includes(`${sourceVirusForFilter} ${view}`.toLowerCase());
        })
      : filterByVirus(groupFilteredData);

  // ── 7. Resolve chart metric name ──────────────────────────────────────────
  const srcVirus = toSourceVirus(activeVirus);
  const uiVirus = activeVirus;

  let chartMetricName = interpolatedProps.metricName;
  if (Array.isArray(chartMetricName)) chartMetricName = chartMetricName[0] ?? "";
  if (chartMetricName == null) chartMetricName = "";

  // ── 8. Working data (best non-empty set) ─────────────────────────────────
  let workingData = virusFilteredData?.length
    ? virusFilteredData
    : groupFilteredData?.length
    ? groupFilteredData
    : flattenedData;

  if (chartMetricName) {
    chartMetricName = chartMetricName
      .replace(/\bFlu\b/g, "Influenza")
      .replace(/\bCOVID\b/g, "COVID-19");
    if (uiVirus !== srcVirus) {
      const re = new RegExp(`\\b${uiVirus}\\b`, "g");
      chartMetricName = chartMetricName.replace(re, srcVirus);
    }
  }

  if (!chartMetricName && workingData?.length) {
    const lastWithMetric = [...workingData].reverse().find((r) => r?.metric);
    chartMetricName = String(lastWithMetric?.metric ?? "");
  }

  // ── 9. Unknown race/ethnicity percent (footnote helper) ──────────────────
  const unknownPct = getUnknownRaceEthnicityPercent(
    data?.__raw || [],
    activeVirus
  );

  // ── 10. Trend pool selection ──────────────────────────────────────────────
  let trendPoolBase;
  if (dataType === "ed") {
    trendPoolBase = workingData;
  } else if (dataType === "death" || dataType === "deaths") {
    trendPoolBase = flattenedData?.length ? flattenedData : workingData;
  } else if (dataType === "lab" || dataType === "cases") {
    trendPoolBase = flattenedData?.length ? flattenedData : workingData;
  } else {
    trendPoolBase = filterByVirus(flattenedData);
  }

  // Keep only latest season when seasons are present
  let trendData = trendPoolBase;
  if (trendData?.length && "season" in (trendData[0] || {})) {
    const lastSeason = [...trendData]
      .filter((r) => r?.season != null)
      .reduce((acc, r) => {
        const d = parseLocalISO(r?.date ?? r?.week ?? r?.dateStr);
        const ts = d ? d.getTime() : -Infinity;
        const prev = acc.get(r.season) ?? -Infinity;
        if (ts > prev) acc.set(r.season, ts);
        return acc;
      }, new Map());
    const latestSeason = [...lastSeason.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (latestSeason) {
      trendData = trendData.filter((r) => r.season === latestSeason);
    }
  }

  // ── 11. Series selection for trend calculation ────────────────────────────
  const desiredMetric =
    dataType === "deaths" || dataType === "death"
      ? `COVID-19 deaths`
      : dataType === "lab" || dataType === "cases"
      ? `${srcVirus} cases`
      : null;

  let seriesForTrend = desiredMetric
    ? (trendData || []).filter(
        (r) => String(r?.metric) === desiredMetric && isTotal(r?.submetric)
      )
    : trendData || [];

  // ED: allow group-specific trend
  if (dataType === "ed" && activeGroup && activeGroup !== groupLabel && groupField) {
    seriesForTrend = seriesForTrend.filter(
      (r) => String(r[groupField]) === String(activeGroup)
    );
  }

  // Chronological sort
  seriesForTrend = seriesForTrend.slice().sort((a, b) => {
    const da = parseLocalISO(a?.date ?? a?.week ?? a?.dateStr);
    const db = parseLocalISO(b?.date ?? b?.week ?? b?.dateStr);
    if (da && db) return da - db;
    if (a?.weekOfSeason != null && b?.weekOfSeason != null) {
      return Number(a.weekOfSeason) - Number(b.weekOfSeason);
    }
    return 0;
  });

  // ── 12. Compute WoW trend ─────────────────────────────────────────────────
  const enableTrend = section.trendEnabled !== false;
  let trendObjRaw = null;

  if (enableTrend) {
    const poolForPair =
      seriesForTrend?.length >= 2 ? seriesForTrend : trendData;

    const pair = getLastTwoValuesSameSeries(poolForPair, "value", {
      metricKey: "metric",
      submetricKey: "submetric",
      metricOnly: dataType === "ed",
      forceTotal: dataType !== "ed",
      totalValues: totalNames,
    });

    if (pair) {
      const [curr, prev] = pair;
      if (prev === 0) {
        trendObjRaw =
          curr === 0
            ? { label: "not changed", value: "0%", direction: "same" }
            : { label: "increased", value: "", direction: "up" };
      } else {
        const pct = ((curr - prev) / prev) * 100;
        if (Math.abs(pct) < EPSILON_NO_CHANGE) {
          trendObjRaw = { label: "not changed", value: "0%", direction: "same" };
        } else {
          const rounded = Math.round(pct);
          trendObjRaw = {
            label: rounded > 0 ? "increased" : "decreased",
            value: `${Math.abs(rounded)}%`,
            direction: rounded > 0 ? "up" : "down",
          };
        }
        trendObjRaw.current = curr;
        trendObjRaw.previous = prev;
      }
    }
  }

  const trendObj = coerceNoChange(trendObjRaw);

  // ── 13. Trend display helpers ─────────────────────────────────────────────
  const metricLabelForInfo = resolveMetricLabel({ dataType, view });
  const trendInfo = getTrendInfo({
    trendDirection: trendObj?.direction,
    metricLabel: metricLabelForInfo,
    virus: activeVirus,
  });

  const latestWeek = getLatestWeekFromData(workingData);
  const isFirstWeek = isFirstWeekFromData(workingData);

  const groupLabelText =
    normalizedGroup && normalizedGroup !== normalizedLabel
      ? `in ${groupDisplay}`
      : `across ${normalizedLabel.toLowerCase()}`;

  const trendText = trendObj ? formatTrendPhrase(trendObj) : "not available";

  // ── 14. Full interpolation variables ─────────────────────────────────────
  const fullVars = {
    ...textVars,
    unknownPct,
    date: `<span class="bg-highlight">${formatDate(latestWeek)}</span>`,
    trend: trendText,
    group: groupLabelText,
    trendDirection: trendObj?.direction || "same",
    arrow: trendInfo?.arrow,
    viewLabel: metricLabelForInfo,
    viewLabelPreposition: viewDisplayLabelsPreposition[view],
    virusLabelArticle: virusDisplayLabelsArticle[activeVirus],
    virusLowercase: virusLowercaseDisplay[activeVirus],
    directionText: trendInfo?.directionText,
    trendColor: trendInfo?.trendColor,
  };

  // ── 15. Footer resolution ─────────────────────────────────────────────────
  let resolvedFooterHtml = null;
  if (
    section.chart?.footer &&
    (!section.chart.footer.showWhen ||
      section.chart.footer.showWhen({ virus: activeVirus, dataType }))
  ) {
    if (
      !section.chart.footer.template ||
      !section.chart.footer.template.includes("{unknownPct}") ||
      unknownPct != null
    ) {
      resolvedFooterHtml = resolveFooter(section.chart.footer, fullVars);
    }
  }

  // ── 16. Seasonal chart detection ─────────────────────────────────────────
  const isSeasonalChart =
    section.id?.toLowerCase().includes("seasonal") ||
    section.chart?.props?.dataSourceKey?.toLowerCase()?.includes("seasonal");

  return {
    // raw / filtered data
    filteredData,
    flattenedData,
    workingData,
    dataSourceKey,
    // interpolated props
    interpolatedProps,
    textVars,
    fullVars,
    // group state
    groupField,
    groupLabel,
    groupOptions,
    activeGroup,
    groupLabelText,
    // trend
    trendObj,
    trendInfo,
    trendText,
    latestWeek,
    isFirstWeek,
    metricLabelForInfo,
    isSeasonalChart,
    // chart
    chartMetricName,
    // footer
    resolvedFooterHtml,
    unknownPct,
    // update helpers
    updateGroupForKey: (val) => updateGroup(sectionKey, val),
  };
};

export default useSectionData;
