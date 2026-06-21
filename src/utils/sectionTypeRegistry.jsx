/**
 * sectionTypeRegistry
 *
 * Maps renderAs values → handler functions that return JSX (or null).
 * Each handler receives the full SectionRenderer props bag.
 *
 * SectionRenderer dispatches through this registry and becomes a one-liner.
 * To add a new renderAs type (e.g. "cards", "paragraph-group"):
 *   1. Import the relevant component here
 *   2. Add one entry to the registry
 *   No other file needs to change.
 *
 * Handler signature:
 *   (props: SectionRendererProps) => React.ReactNode
 *
 * where SectionRendererProps = {
 *   section, sectionKey, pageContext, customComponents, onNewView, onDownloadPNG
 * }
 */

import React from "react";
import CustomSection from "../components/layout/CustomSection";
import ChartSection from "../components/layout/ChartSection";
import {
  viewDisplayLabels,
  viewDisplayLabelsPreposition,
  virusDisplayLabelsArticle,
  virusLowercaseDisplay,
} from "./pageConstants";

// ── Shared helper: resolve filteredData + textVars for custom sections ─────────
const resolveCustomContext = (section, pageContext) => {
  const {
    data,
    activeVirus,
    view,
    dataType,
    hydratedConfig,
    setView,
    latestDate,
  } = pageContext;

  const chartProps = section.chart?.props || {};
  const dataSourceKey =
    section.dataSourceKey ||
    chartProps.dataSourceKey ||
    null;
  const filteredData =
    dataSourceKey && data[dataSourceKey] ? data[dataSourceKey] : [];

  const textVars = {
    virus: activeVirus,
    view,
    viewLabel: viewDisplayLabels[view] || view,
    viewLabelPreposition: viewDisplayLabelsPreposition[view] || "",
    virusLabelArticle: virusDisplayLabelsArticle[activeVirus] || "",
    virusLowercase: virusLowercaseDisplay[activeVirus] || "",
  };

  return { data, filteredData, activeVirus, view, dataType, textVars, hydratedConfig, setView, latestDate };
};

// ── Registry ──────────────────────────────────────────────────────────────────

const sectionTypeRegistry = {
  // Skip rendering entirely
  overview: () => null,
  hidden:   () => null,

  // Custom component or simple paragraph
  custom: (props) => {
    const { section, sectionKey, pageContext, customComponents, onNewView, onDownloadPNG } = props;
    const ctx = resolveCustomContext(section, pageContext);
    return (
      <CustomSection
        key={sectionKey}
        section={section}
        sectionKey={sectionKey}
        customComponents={customComponents}
        onNewView={onNewView}
        onDownloadPNG={onDownloadPNG}
        {...ctx}
      />
    );
  },

  // Default: standard chart section
  default: (props) => {
    const { section, sectionKey, pageContext, onNewView, onDownloadPNG, onCopyImage } = props;
    return (
      <ChartSection
        key={sectionKey}
        section={section}
        sectionKey={sectionKey}
        pageContext={pageContext}
        onNewView={onNewView}
        onDownloadPNG={onDownloadPNG}
        onCopyImage={onCopyImage}
      />
    );
  },
};

export default sectionTypeRegistry;
