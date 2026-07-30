import React, { useState } from "react";
import PropTypes from "prop-types";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getTrendInfo } from "../../utils/getTrendInfo";
import "./TrendSummaryContainer.css"; // retains only: .trend-subtitle-select custom dropdown arrow

const ChevronIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    className={`flex-shrink-0 transition-transform duration-200 ease ${open ? "rotate-180" : "rotate-0"}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * TrendSummaryContainer
 *
 * Renders a page's "overview" content — an optional trend-arrow line, the
 * always-visible page-specific overview blurb, an optional secondary section
 * (e.g. shared seasonal context, identical across pages) collapsed behind a
 * caret by default, and any seasonal-bullet children. It's plain inline
 * content with no card/background of its own: it's meant to be placed inside
 * DataPageLayout's `subtitle` slot so it lives in the *same* white header
 * card as the page title, matching the home page's header card.
 */
const TrendSummaryContainer = ({
  sectionTitle,
  extraSectionTitle,
  trendDirection,
  markdownPath,
  children,
  metricLabel,
  virus = "COVID-19",
  view = "visits",
  virusLabelArticle = "a",
  virusLowercase = "COVID-19",
  collapsible = true,
}) => {
  const [expanded, setExpanded] = useState(false);

  const resolvedMetricLabel = metricLabel || view;
  const trend = getTrendInfo({
    trendDirection,
    metricLabel: resolvedMetricLabel,
    virus,
  });

  return (
    <div className="w-full">
      {trend && (
        <div
          className={[
            "flex items-center text-[var(--trend-status-size,var(--font-size-md))]",
            "font-body text-[var(--trend-status-color,var(--gray-800))] gap-sm mb-md",
            // mobile: stack
            "md:flex-col md:items-start md:gap-xs",
          ].join(" ")}
        >
          <span className="text-[var(--trend-arrow-size,18px)] font-semibold" style={{ color: trend.trendColor }}>
            {trend.arrow}
          </span>
          <span className="trend-text" style={{ color: trend.trendColor }}>
            {trend.label}
            <strong>{trend.directionText}</strong>
          </span>
        </div>
      )}

      {markdownPath && (
        <div>
          {/* Always-visible, page-specific overview text */}
          <MarkdownRenderer
            filePath={markdownPath}
            sectionTitle={sectionTitle}
            showTitle={false}
            className="markdown-body"
            variables={{ virus, view, virusLabelArticle, virusLowercase }}
          />

          {/* Shared/secondary text (e.g. seasonal context) — same on every
              page, so it's collapsed by default instead of repeating in full
              every time the user lands here */}
          {extraSectionTitle && (
            <div className="mt-xs">
              {collapsible && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  aria-label={expanded ? "Hide seasonal context" : "Show seasonal context"}
                  className="flex items-center gap-1.5 mb-xs text-gray-700 cursor-pointer hover:text-gray-900"
                >
                  <ChevronIcon open={expanded} />
                  <span className="text-[var(--font-size-sm)] font-semibold">
                    {extraSectionTitle}
                  </span>
                </button>
              )}
              {(!collapsible || expanded) && (
                <MarkdownRenderer
                  filePath={markdownPath}
                  sectionTitle={extraSectionTitle}
                  showTitle={false}
                  className="markdown-body"
                  variables={{ virus, view, virusLabelArticle, virusLowercase }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {children && <div aria-live="polite">{children}</div>}
    </div>
  );
};

TrendSummaryContainer.propTypes = {
  sectionTitle: PropTypes.string,
  extraSectionTitle: PropTypes.string,
  trendDirection: PropTypes.oneOf(["up", "down", "same"]),
  markdownPath: PropTypes.string,
  metricLabel: PropTypes.string,
  virus: PropTypes.string,
  view: PropTypes.string,
  children: PropTypes.node,
  collapsible: PropTypes.bool,
};

export default TrendSummaryContainer;
