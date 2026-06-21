/**
 * ConfigDrivenPage
 *
 * Thin orchestrator.  Reads a page config object and wires together:
 *   - usePageState  (virus / view / dataType UI controls)
 *   - usePageData   (config hydration + CSV fetch)
 *   - DataPageLayout + TopControls + TrendSummaryContainer
 *   - SectionRenderer per visible section
 *
 * All per-section data logic lives in useSectionData.
 * All render logic lives in ChartSection / CustomSection.
 * Section visibility filtering lives in sectionVisibility.js.
 */

'use client';

import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";

import { usePageState } from "../hooks/usePageState";
import usePageData from "../hooks/usePageData";

import DataPageLayout from "./DataPageLayout";
import TopControls from "./TopControls";
import TrendSummaryContainer from "./TrendSummaryContainer";
import SectionRenderer from "./SectionRenderer";
import PageSidebar from "./PageSidebar";
import PageSkeleton from "./PageSkeleton";

import SeasonalBullet from "../bullets/SeasonalBullet";
import HydratedDataContext from "../../context/HydratedDataContext";

import { isSectionVisible } from "../../utils/sectionVisibility";
import { getLatestWeek, formatDate } from "../../utils/trendUtils";
import { getText, resolveText } from "../../utils/contentUtils";
import { exportVegaImage, copyVegaImageToClipboard } from "../../utils/exportChartImage";
import componentRegistry from "../../utils/componentRegistry";

import {
  viewDisplayLabels,
  viewDisplayLabelsPreposition,
  virusDisplayLabelsArticle,
  virusLowercaseDisplay,
} from "../../utils/pageConstants";



// ── Main component ────────────────────────────────────────────────────────────

const ConfigDrivenPage = ({ config }) => {
  const { titleKey, subtitleKey, summary, sections = [], controls = {} } =
    config;

  // ── UI state (virus, view, dataType toggles) ──────────────────────────────
  const pageState = usePageState(config.data, controls);
  const {
    activeVirus = "COVID-19",
    view = "visits",
    dataType = "ed",
    setDataType = () => {},
    setView = () => {},
    setVirus = () => {},
  } = pageState;

  // ── Virus accent color — sets --page-accent on <html> for global theming ──
  useEffect(() => {
    const accentMap = {
      "COVID-19": "#8739B7",
      "Flu":      "#387781",
      "RSV":      "#AA4C34",
    };
    const color = accentMap[activeVirus] ?? "#1E40AF";
    document.documentElement.style.setProperty("--page-accent", color);
    return () => document.documentElement.style.removeProperty("--page-accent");
  }, [activeVirus]);

  // ── Data hydration ────────────────────────────────────────────────────────
  const hydratedConfig = usePageData(config, { activeVirus, view, dataType });

  // ── Deep-link / hash scroll ───────────────────────────────────────────────
  // Tracks window.location.hash to scroll to section anchors set by the
  // sidebar Jump-to links and ProgressRail. Replaces useLocation().hash
  // from react-router-dom (next/navigation has no hash hook).
  const [hash, setHash] = useState('');
  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  useEffect(() => {
    if (!hydratedConfig || !hash) return;
    const id = hash.slice(1);
    // One rAF to let the section render commit, then scroll
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [hydratedConfig, hash]);

  // ── Vega PNG export ───────────────────────────────────────────────────────
  const vegaViewRefs = useRef({});

  const handleNewView = (sectionKey) => (vegaView) => {
    vegaViewRefs.current[sectionKey] = vegaView;
  };

  const handleDownloadPNG = (sectionKey, fileName, title, subtitle) => () => {
    const vegaView = vegaViewRefs.current[sectionKey];
    if (vegaView) exportVegaImage(vegaView, "png", fileName.slice(0, -4), { title, subtitle });
  };

  const handleCopyImage = (sectionKey, title, subtitle) => () =>
    copyVegaImageToClipboard(vegaViewRefs.current[sectionKey], { title, subtitle });

  // ── Group selection state (shared across sections) ────────────────────────
  const [groupSelections, setGroupSelections] = useState({});
  const updateGroup = (key, val) =>
    setGroupSelections((prev) => ({ ...prev, [key]: val }));


  // ── Section nav links (drives sidebar progress indicator) ────────────────
  // Computed before the loading guard so it's always available after hydration.
  // Uses anchorId when present (home page overrides), otherwise section.id.
  const sectionLinks = hydratedConfig
    ? (hydratedConfig.sections || [])
        .filter((s) => isSectionVisible(s, { activeVirus, dataType }))
        .filter((s) => s.navLabel)
        .map((s) => ({ id: s.anchorId || s.id, label: s.navLabel }))
    : [];

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!hydratedConfig) return <PageSkeleton />;

  const { data = {}, sections: hydratedSections = [] } = hydratedConfig;

  // ── Shared text variables ─────────────────────────────────────────────────
  const pageTextVars = {
    virus: activeVirus,
    virusSource: activeVirus,
    view,
    dataType,
    viewLabel: viewDisplayLabels[view],
    viewLabelPreposition: viewDisplayLabelsPreposition[view],
    virusLabelArticle: virusDisplayLabelsArticle[activeVirus],
    virusLowercase: virusLowercaseDisplay[activeVirus],
  };

  const latestDate = getLatestWeek(data);
  const resolvedTitleKey =
    typeof titleKey === "object" ? titleKey[dataType] : titleKey;
  const resolvedSubtitleKey =
    typeof subtitleKey === "object" ? subtitleKey[dataType] : subtitleKey;

  // ── Summary box (TrendSummaryContainer) ──────────────────────────────────
  const resolvedSummary =
    summary && (summary.ed || summary.lab || summary.death || summary.cases)
      ? summary[dataType] || summary.default || {}
      : summary || {};

  const resolvedSummaryMarkdownPath =
    typeof resolvedSummary?.markdownPath === "object"
      ? resolvedSummary.markdownPath[`${dataType}_${view}`] ||
        resolvedSummary.markdownPath[dataType] ||
        resolvedSummary.markdownPath.default
      : resolvedSummary?.markdownPath;

  // ── Page context passed to section renderers ──────────────────────────────
  const pageContext = {
    data,
    activeVirus,
    view,
    dataType,
    setView,
    groupSelections,
    updateGroup,
    hydratedConfig,
    latestDate,
    // Display dictionaries (used by SectionRenderer for textVars)
    viewDisplayLabels,
    viewDisplayLabelsPreposition,
    virusDisplayLabelsArticle,
    virusLowercaseDisplay,
  };

  // ── Header right column (overview page only) ─────────────────────────────
  const updateNoteKey = config.layout?.updateNoteKey;
  const headerRight = updateNoteKey ? (
    <div>
      <p
        className="mb-sm"
        dangerouslySetInnerHTML={{ __html: getText(updateNoteKey) || "" }}
      />
      {hydratedConfig.uploadDate && (
        <p>
          Last updated: <strong>{formatDate(hydratedConfig.uploadDate)}</strong>
        </p>
      )}
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <HydratedDataContext.Provider value={{ data }}>
      <DataPageLayout
        title={resolveText(resolvedTitleKey, pageTextVars)}
        subtitle={resolveText(resolvedSubtitleKey, pageTextVars)}
        pageBackground={config.layout?.pageBackground}
        contentGap={config.layout?.contentGap}
        contentMaxWidth={config.layout?.contentMaxWidth}
        headerBackground={config.layout?.headerBackground}
        sectionLinks={sectionLinks}
        titleInContent={!!(controls.virusToggle || controls.dataTypeToggle)}
        sidebar={
          config.showSidebar === false ? null : (
            <PageSidebar
              activeVirus={activeVirus}
              onVirusChange={setVirus}
              dataType={dataType}
              onDataTypeChange={setDataType}
              view={view}
              onViewChange={setView}
              controls={controls}
              uploadDate={hydratedConfig?.uploadDate}
              updateNote={updateNoteKey ? getText(updateNoteKey) : undefined}
            />
          )
        }
      >
        {/* Content cross-fade wrapper — remounts on virus or dataType change */}
        <div key={`${activeVirus}-${dataType}`} className="content-fade">

        {/* Summary / trend box */}
        {resolvedSummaryMarkdownPath && (
          <TrendSummaryContainer
            key={`summary-${activeVirus}-${view}-${dataType}`}
            sectionTitle={resolveText(
              resolvedSummary.titleKey || resolvedSummary.title
            )}
            date={
              hydratedConfig.uploadDate
                ? formatDate(hydratedConfig.uploadDate)
                : "(Date Currently Unavailable)"
            }
            markdownPath={resolvedSummaryMarkdownPath}
            showTitle
            animateOnScroll={resolvedSummary.animateOnScroll !== false}
            virus={activeVirus}
            view={view}
            virusLowercase={virusLowercaseDisplay[activeVirus]}
            virusLabelArticle={virusDisplayLabelsArticle[activeVirus]}
            {...(resolvedSummary.showTrendArrow ? { trendDirection: "up" } : {})}
            variables={{ ...pageTextVars, latestDate }}
          >
            {Array.isArray(resolvedSummary?.bullets) &&
              resolvedSummary.bullets.map((b) => {
                if (
                  b.renderAs === "custom" &&
                  b.component &&
                  componentRegistry[b.component]
                ) {
                  const Cmp = componentRegistry[b.component];
                  const slice = b.dataSourceKey
                    ? data?.[b.dataSourceKey]
                    : undefined;
                  const cfg = { id: b.id, ...(b.componentProps || {}) };
                  return (
                    <Cmp
                      key={b.id}
                      config={cfg}
                      dataSource={slice}
                      pageState={{ virus: activeVirus, dataType }}
                      as={b.componentProps?.as}
                      className={b.componentProps?.className}
                    />
                  );
                }
                const slice =
                  b.dataSourceKey && data?.[b.dataSourceKey]
                    ? data[b.dataSourceKey]
                    : undefined;
                return (
                  <SeasonalBullet
                    key={b.id}
                    config={b}
                    dataSource={slice}
                    pageState={{ virus: activeVirus, dataType }}
                  />
                );
              })}
          </TrendSummaryContainer>
        )}

        {/* Sections */}
        {hydratedSections
          .filter((section) =>
            isSectionVisible(section, { activeVirus, dataType })
          )
          .map((section, idx) => {
            const sectionKey = section.id || idx;
            return (
              <SectionRenderer
                key={sectionKey}
                section={section}
                sectionKey={sectionKey}
                customComponents={componentRegistry}
                pageContext={pageContext}
                onNewView={handleNewView}
                onDownloadPNG={handleDownloadPNG}
                onCopyImage={handleCopyImage}
              />
            );
          })}

        </div>{/* end content-fade */}
      </DataPageLayout>
    </HydratedDataContext.Provider>
  );
};

ConfigDrivenPage.propTypes = {
  config: PropTypes.object.isRequired,
};

export default ConfigDrivenPage;
