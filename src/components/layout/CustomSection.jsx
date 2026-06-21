/**
 * CustomSection
 *
 * Renders config sections with renderAs === "custom".
 *
 * Two sub-cases:
 *  1. section.component is set  → renders a custom component (StatGrid,
 *     CombinedVirusChart, DynamicParagraph, etc.) inside a ContentContainer.
 *  2. No component / no chart   → simple paragraph ContentContainer.
 *
 * The combined-virus subtitle logic is isolated in buildCombinedVirusSubtitle()
 * so it can be reasoned about and tested independently.
 */

import React from "react";
import ContentContainer from "./ContentContainer";
import ChartContainer from "./ChartContainer";
import TrendSubtitle from "../controls/TrendSubtitle";
import ToggleControls from "../controls/ToggleControls";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getText, interpolateTokens, interpolateObject, resolveText } from "../../utils/contentUtils";
import { parseLocalISO, formatDate } from "../../utils/trendUtils";
import { buildDownloadHandler } from "../../utils/sectionDownload";
import { buildDownloadName } from "../../utils/downloadUtils";


const renderSubtitle = (template, variables = {}) => {
  if (!template) return null;
  const hasMinimumTrendData =
    variables.trendObj && variables.latestWeek && variables.metricLabel;

  if (!hasMinimumTrendData) {
    const t =
      typeof template === "string" && template.includes(".")
        ? getText(template)
        : template;
    return typeof t === "string" ? t : null;
  }

  return <TrendSubtitle template={template} variables={variables} />;
};

// ── Combined-virus subtitle builder ──────────────────────────────────────────
/**
 * Builds the two-part subtitle for the "combined-virus" section:
 *  - Static text from CMS
 *  - Dynamic TrendSubtitle node
 *
 * @param {object} params
 * @param {object} params.data           - Full hydrated data map
 * @param {string} params.view           - "visits" | "hospitalizations"
 * @param {string} params.dataSourceKey  - Key into data map
 * @returns {React.ReactNode}
 */
export const buildCombinedVirusSubtitle = ({ data, view, dataSourceKey }) => {
  const seriesKey =
    view === "hospitalizations"
      ? "Respiratory illness hospitalizations"
      : "Respiratory illness visits";

  const edRoot = data?.[dataSourceKey];
  const ariSeries = Array.isArray(edRoot)
    ? edRoot.filter(
        (r) =>
          String(r.metric) === seriesKey &&
          String(r.submetric || "").toLowerCase() === "overall"
      )
    : [];

  const last = ariSeries?.at?.(-1) || {};
  const prev = ariSeries?.at?.(-2) || {};

  const latestISO = last.week || last.date || null;

  const currVal =
    typeof last.value === "number"
      ? last.value
      : Number(String(last.value || "").replace("%", ""));

  const prevVal =
    typeof prev.value === "number"
      ? prev.value
      : Number(String(prev.value || "").replace("%", ""));

  let localTrendObj = null;
  if (
    currVal != null &&
    prevVal != null &&
    Number.isFinite(currVal) &&
    Number.isFinite(prevVal)
  ) {
    const diff = currVal - prevVal;
    const pctChange = prevVal === 0 ? null : (diff / prevVal) * 100;

    let direction = "same";
    if (pctChange !== null) {
      if (pctChange > 0) direction = "up";
      if (pctChange < 0) direction = "down";
    }

    const label =
      direction === "up"
        ? "increased"
        : direction === "down"
        ? "decreased"
        : "not changed";

    localTrendObj = {
      current: currVal,
      previous: prevVal,
      direction,
      label: label.toUpperCase(),
      value:
        pctChange === null
          ? null
          : `${Math.abs(Math.round(pctChange))}%`,
    };
  }

  const dynamicNode =
    localTrendObj && latestISO ? (
      <TrendSubtitle
        variables={{
          trendObj: localTrendObj,
          latestWeek: parseLocalISO(latestISO),
          metricLabel: view === "hospitalizations" ? "Hospitalizations" : "Visits",
          dateHtml: `<span class="bg-highlight">${formatDate(latestISO)}</span>`,
        }}
      />
    ) : null;

  return (
    <div className="content-subtitle">
      <div
        dangerouslySetInnerHTML={{
          __html: getText("overview.charts.monthlyARIChart.staticSubtitle"),
        }}
      />
      {dynamicNode}
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const CustomSection = ({
  section,
  sectionKey,
  data,
  filteredData,
  activeVirus,
  view,
  dataType,
  textVars,
  hydratedConfig,
  customComponents,
  onNewView,
  onDownloadPNG,
  setView,
  latestDate,
}) => {
  // ── Custom component path ─────────────────────────────────────────────────
  if (section.component) {
    const CustomComponent = customComponents[section.component];
    if (!CustomComponent) return null;

    const chartProps = interpolateObject(section.chart?.props || {}, textVars);
    const compProps = interpolateObject(section.componentProps || {}, textVars);
    const mergedProps = { ...compProps, ...chartProps };

    const dataSourceKey =
      section.dataSourceKey ||
      chartProps.dataSourceKey ||
      section.chart?.props?.dataSourceKey ||
      null;

    let subtitleNode = null;
    if (section.id === "combined-virus") {
      subtitleNode = buildCombinedVirusSubtitle({ data, view, dataSourceKey });
    }

    const wrapInChart = section.wrapInChart !== false;
    const latestDateForName = latestDate;

    const virusForFile = section.id === "combined-virus" ? "ARI" : activeVirus;
    const metricForFile = dataType === "ed" ? view : undefined;

    return (
      <ContentContainer
        key={sectionKey}
        id={section.anchorId || section.id || undefined}
        title={resolveText(section.title, textVars)}
        subtitle={subtitleNode}
        subtitleVariables={textVars}
        animateOnScroll={section.animateOnScroll !== false}
        background={section.background || "white"}
        infoIcon={section.infoIcon}
        downloadIcon={section.downloadIcon}
        downloadPreviewData={
          Array.isArray(filteredData)
            ? filteredData
            : Object.values(filteredData || {}).flat()
        }
        downloadColumnLabels={mergedProps.columnLabels}
        downloadDescription={mergedProps.downloadDescription}
        modalTitle={resolveText(section.modal?.title, textVars)}
        modalContent={
          section.modal?.markdownPath && (
            <MarkdownRenderer
              filePath={section.modal.markdownPath}
              sectionTitle={resolveText(section.modal.title || "", textVars)}
              showTitle={false}
              variables={textVars}
            />
          )
        }
        onDownloadClick={buildDownloadHandler({
          filteredData,
          section,
          activeVirus,
          dataType,
          view,
          latestDate: latestDateForName,
          categoryForFile: section.id || "section",
        })}
        onDownloadPNG={onDownloadPNG(
          sectionKey,
          section.chart?.props?.downloadFileName ||
            buildDownloadName({
              virus: virusForFile,
              metric: metricForFile,
              category: section.id || "section",
              date: latestDateForName,
            })
        )}
      >
        {wrapInChart ? (
          <ChartContainer
            title={resolveText(section.title, textVars)}
            chart={
              <CustomComponent
                data={filteredData}
                view={view}
                onViewChange={setView}
                {...mergedProps}
                uploadDate={hydratedConfig?.uploadDate}
                footnote={section.chart?.props?.footnote || section.footnote}
              />
            }
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
                      onToggle={setView}
                    />
                  ),
                }
              : {})}
            stackSidebarAbove={!!section.sidebarAboveChart}
            footer={section.chart?.footer}
            altTableData={
              Array.isArray(filteredData)
                ? filteredData
                : Object.values(filteredData || {}).flat()
            }
            altTableVariables={textVars}
            altTableColumns={section.chart?.altTable?.columns}
            altTableCaption={
              section.chart?.altTable?.caption ||
              resolveText(section.title, textVars)
            }
            altTableSrOnly={section.chart?.altTable?.srOnly ?? true}
          />
        ) : (
          <CustomComponent
            data={filteredData}
            view={view}
            onViewChange={setView}
            {...mergedProps}
          />
        )}
      </ContentContainer>
    );
  }

  // ── Simple paragraph path (no component, no chart) ────────────────────────
  const subtitleNode = renderSubtitle(section.subtitle, textVars);
  const bodyHtml =
    resolveText(section.textKey, textVars) ?? section.text ?? "";

  return (
    <ContentContainer
      key={sectionKey}
      title={resolveText(section.title, textVars)}
      subtitle={subtitleNode}
      subtitleVariables={textVars}
      animateOnScroll={section.animateOnScroll !== false}
      background={section.background || "white"}
      infoIcon={section.infoIcon}
      downloadIcon={false}
    >
      <div className="markdown-body">
        {typeof bodyHtml === "string" ? <p>{bodyHtml}</p> : bodyHtml}
      </div>
    </ContentContainer>
  );
};

export default CustomSection;
