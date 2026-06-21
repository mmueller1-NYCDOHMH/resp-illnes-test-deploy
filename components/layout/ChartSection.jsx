/**
 * ChartSection
 *
 * Renders a standard config section with a registered chart type.
 * Uses useSectionData to derive all filtered data and trend values,
 * then assembles the SectionWithChart + ChartContainer nodes.
 */

import React from "react";
import useSectionData from "../hooks/useSectionData";
import SectionWithChart from "./SectionWithChart";
import ChartContainer from "./ChartContainer";
import TrendSubtitle from "../controls/TrendSubtitle";
import ToggleControls from "../controls/ToggleControls";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import chartRegistry from "../../utils/chartRegistry";
import { tokens } from "../../styles/tokens";
import { getText } from "../../utils/contentUtils";
import { parseLocalISO, formatDate } from "../../utils/trendUtils";
import { buildDownloadHandler } from "../../utils/sectionDownload";
import { buildDownloadName } from "../../utils/downloadUtils";

const resolveText = (input, variables = {}) => {
  const raw =
    typeof input === "string" && input.includes(".") ? getText(input) : input;
  return typeof raw === "string"
    ? raw.replace(/{(\w+)}/g, (_, key) => variables[key] ?? `{${key}}`)
    : raw;
};

const ChartSection = ({
  section,
  sectionKey,
  pageContext,
  onNewView,
  onDownloadPNG,
  onCopyImage,
}) => {
  const {
    filteredData,
    workingData,
    interpolatedProps,
    textVars,
    fullVars,
    groupField,
    groupLabel,
    groupOptions,
    activeGroup,
    trendObj,
    trendInfo,
    latestWeek,
    isFirstWeek,
    metricLabelForInfo,
    isSeasonalChart,
    chartMetricName,
    resolvedFooterHtml,
    unknownPct,
    updateGroupForKey,
  } = useSectionData(section, sectionKey, pageContext);

  const { activeVirus, view, dataType, hydratedConfig } = pageContext;

  // ── Subtitle ──────────────────────────────────────────────────────────────
  const rawSubtitleTemplate = resolveText(section.subtitle);
  const allowTrendSubtitle = !(isFirstWeek && dataType !== "death");

  let computedSubtitle = null;
  if (allowTrendSubtitle && isSeasonalChart && trendObj && latestWeek) {
    computedSubtitle = (
      <TrendSubtitle
        variables={{
          trendObj,
          latestWeek: parseLocalISO(latestWeek),
          metricLabel: metricLabelForInfo,
          dateHtml: `<span class="bg-highlight">${formatDate(latestWeek)}</span>`,
        }}
        groupProps={{
          options: groupOptions,
          active: activeGroup,
          onChange: updateGroupForKey,
        }}
      />
    );
  } else {
    computedSubtitle = rawSubtitleTemplate;
  }

  // ── Chart component ───────────────────────────────────────────────────────
  const ChartComponent = chartRegistry[section.chart?.type];
  if (!ChartComponent) {
    console.warn(`Chart type '${section.chart?.type}' not found`);
    return null;
  }

  const resolvedProps = {
    ...interpolatedProps,
    data: workingData,
    virus: activeVirus,
    view,
    colorMap: tokens.colorScales?.[(activeVirus || "").toLowerCase()],
    tooltip: true,
  };

  if (
    section.chart?.type?.toLowerCase().includes("line") &&
    !resolvedProps.xField
  ) {
    resolvedProps.xField = "date";
  }

  // ── File name parts ───────────────────────────────────────────────────────
  const normalizedGroup = (activeGroup || "").trim();
  const normalizedLabel = (groupLabel || "").trim();
  const categoryForFile =
    normalizedGroup && normalizedGroup !== normalizedLabel
      ? normalizedGroup
      : section.id || "chart";
  const metricForFile = dataType === "ed" ? view : undefined;
  const latestDate = pageContext.latestDate;

  const downloadFileName =
    section.chart?.props?.downloadFileName ||
    buildDownloadName({
      virus: activeVirus,
      metric: metricForFile,
      category: categoryForFile,
      date: latestDate,
      ext: "csv",
      includeMetric: !(dataType === "cases" || dataType === "deaths"),
    });

  // Plain-text title/subtitle for image exports (strip HTML spans injected by resolveText)
  const _strip = (html = "") => {
    const el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
  };
  const exportTitle    = _strip(resolveText(section.title, fullVars));
  const exportSubtitle = section.subtitle ? _strip(resolveText(section.subtitle, fullVars)) : "";

  const pngFileName =
    section.chart?.props?.downloadFileName ||
    buildDownloadName({ virus: activeVirus, metric: metricForFile, category: categoryForFile, date: latestDate });

  return (
    <SectionWithChart
      key={sectionKey}
      id={section.anchorId || section.id}
      title={resolveText(section.title, fullVars)}
      subtitle={computedSubtitle}
      subtitleVariables={fullVars}
      infoIcon={section.infoIcon}
      downloadIcon={section.downloadIcon}
      onDownloadClick={buildDownloadHandler({
        filteredData: workingData,
        section,
        activeVirus,
        dataType,
        view,
        latestDate,
        categoryForFile,
      })}
      onDownloadPNG={onDownloadPNG(sectionKey, pngFileName, exportTitle, exportSubtitle)}
      onCopyImage={onCopyImage ? onCopyImage(sectionKey, exportTitle, exportSubtitle) : null}
      columnLabels={interpolatedProps.columnLabels}
      modalTitle={resolveText(section.modal?.title, fullVars)}
      modalContent={
        section.modal?.markdownPath && (
          <MarkdownRenderer
            filePath={section.modal.markdownPath}
            sectionTitle={resolveText(section.modal.title || "", fullVars)}
            showTitle={false}
            variables={fullVars}
          />
        )
      }
      animateOnScroll={section.animateOnScroll !== false}
      previewData={workingData}
      uploadDate={hydratedConfig?.uploadDate}
    >
      <ChartContainer
        title={resolveText(section.title, fullVars)}
        chart={<ChartComponent {...resolvedProps} />}
        onNewView={onNewView(sectionKey)}
        {...(section.showSidebarToggle
          ? {
              sidebar: (
                <ToggleControls
                  data={
                    Array.isArray(filteredData)
                      ? filteredData
                      : Object.values(filteredData || {}).flat()
                  }
                  view={view}
                  onToggle={pageContext.setView}
                />
              ),
            }
          : {})}
        stackSidebarAbove={!!section.sidebarAboveChart}
        footnote={section.chart?.props?.footnote || section.footnote}
        footer={section.chart?.footer}
        footerVariables={{
          unknownPct,
          virusLowercase: activeVirus.toLowerCase(),
          virus: activeVirus,
        }}
        uploadDate={hydratedConfig?.uploadDate}
        altTableData={workingData}
        altTableVariables={fullVars}
        altTableColumns={section.chart?.altTable?.columns}
        altTableCaption={
          section.chart?.altTable?.caption ||
          resolveText(section.title, fullVars)
        }
        altTableSrOnly={section.chart?.altTable?.srOnly ?? true}
        disableAltTable={section.disableAltTable}
      />
    </SectionWithChart>
  );
};

export default ChartSection;
