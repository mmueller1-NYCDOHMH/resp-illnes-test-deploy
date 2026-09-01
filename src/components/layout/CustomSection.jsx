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
import ToggleGroup from "../controls/ToggleGroup";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getText, interpolateObject, resolveText } from "../../utils/contentUtils";
import { parseLocalISO, formatDate } from "../../utils/trendUtils";
import { buildDownloadHandler } from "../../utils/sectionDownload";
import { buildDownloadName } from "../../utils/downloadUtils";
import { colorizeVirusInTitle } from "../../utils/virusText";


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

// ── Helpers ───────────────────────────────────────────────────────────────────

const flattenData = (data) =>
  Array.isArray(data) ? data : Object.values(data || {}).flat();

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
  onCopyImage,
  onExportSpec,
  setView,
  latestDate,
}) => {
  // ── Custom component path ─────────────────────────────────────────────────
  if (section.component) {
    const CustomComponent = customComponents[section.component];
    if (!CustomComponent) return null;

    const chartProps = interpolateObject(section.chart?.props || {}, textVars);
    const compProps = interpolateObject(section.componentProps || {}, textVars);
    const resolvedTitle = resolveText(section.title, textVars);

    // Plain-text title/subtitle for the "Copy chart as image" export header
    // (same stripping ChartSection does for its own onCopyImage wiring —
    // resolvedTitle/subtitle can carry HTML spans from resolveText/
    // colorizeVirusInTitle that shouldn't leak into the exported image).
    const _strip = (html = "") => {
      const el = document.createElement("div");
      el.innerHTML = html;
      return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
    };
    const exportTitle = _strip(resolvedTitle);
    const exportSubtitle = section.subtitle ? _strip(resolveText(section.subtitle, textVars)) : "";
    // When a section opts in via titleInComponent, the custom component
    // renders its own title (typically alongside other header controls,
    // like a search box, in the same row) instead of ContentContainer
    // rendering it above the component in a separate row. resolvedTitle
    // can contain raw HTML (content strings embed spans like
    // <span class="dynamic-label">...</span>, and colorizeVirusInTitle
    // adds virus-colored spans) — same processing ContentContainer's own
    // title rendering does before handing off to dangerouslySetInnerHTML,
    // so the component must render sectionTitle the same way, not as
    // plain text children.
    const mergedProps = {
      ...compProps,
      ...chartProps,
      ...(section.titleInComponent
        ? { sectionTitle: colorizeVirusInTitle(resolvedTitle) }
        : {}),
    };

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
    const virusForFile = section.id === "combined-virus" ? "ARI" : activeVirus;
    const metricForFile = dataType === "ed" ? view : undefined;
    const flatData = flattenData(filteredData);

    return (
      <ContentContainer
        key={sectionKey}
        id={section.anchorId || section.id || undefined}
        title={section.titleInComponent ? null : resolvedTitle}
        subtitle={subtitleNode}
        subtitleVariables={textVars}
        animateOnScroll={section.animateOnScroll !== false}
        background={section.background || "white"}
        infoIcon={section.infoIcon}
        downloadIcon={section.downloadIcon}
        downloadPreviewData={flatData}
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
          latestDate,
          categoryForFile: section.id || "section",
        })}
        onDownloadPNG={onDownloadPNG(
          sectionKey,
          section.chart?.props?.downloadFileName ||
            buildDownloadName({
              virus: virusForFile,
              metric: metricForFile,
              category: section.id || "section",
              date: latestDate,
            })
        )}
        onCopyImage={onCopyImage ? onCopyImage(sectionKey, exportTitle, exportSubtitle) : null}
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
            onExportSpec={onExportSpec ? onExportSpec(sectionKey) : undefined}
            {...(section.showSidebarToggle
              ? {
                  sidebar: (
                    <ToggleGroup
                      options={[
                        { label: "ED Visits", value: "visits" },
                        { label: "Hospitalizations", value: "hospitalizations" },
                      ]}
                      value={view}
                      onChange={setView}
                      ariaLabel="Toggle between visits and hospitalizations"
                      variant="pill"
                    />
                  ),
                }
              : {})}
            stackSidebarAbove={!!section.sidebarAboveChart}
            footer={section.chart?.footer}
            altTableData={flatData}
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
