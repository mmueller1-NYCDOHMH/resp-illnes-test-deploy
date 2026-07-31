import React, { useState } from "react";
import PropTypes from "prop-types";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getTrendInfo } from "../../utils/getTrendInfo";
import "./TrendSummaryContainer.css"; // retains only: .trend-subtitle-select custom dropdown arrow

/**
 * TrendSummaryContainer
 *
 * Renders a page's "overview" content — an optional trend-arrow line, the
 * page-specific overview blurb, an optional secondary section (e.g. shared
 * seasonal context, identical across pages), and any seasonal-bullet
 * children. The secondary section is shown as a single truncated line
 * ending in a "Read more" toggle — enough information scent to know what's
 * there, without repeating the full paragraph on every page by default.
 * It's plain inline content with no card/background of its own: it's meant
 * to be placed inside DataPageLayout's `subtitle` slot so it lives in the
 * *same* white header card as the page title, matching the home page's
 * header card.
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
              page. Collapsed to a single truncated line with a "Read more"
              toggle so there's information scent without repeating the
              full paragraph by default. */}
          {extraSectionTitle && (
            <div className={`mt-xs flex gap-1 ${expanded ? "items-end" : "items-baseline"}`}>
              <MarkdownRenderer
                filePath={markdownPath}
                sectionTitle={extraSectionTitle}
                showTitle={false}
                className="markdown-body min-w-0 flex-1"
                bodyClassName={expanded ? undefined : "line-clamp-1"}
                variables={{ virus, view, virusLabelArticle, virusLowercase }}
              />
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? "Hide seasonal context" : "Show seasonal context"}
                className="flex-shrink-0 whitespace-nowrap font-body text-body leading-[1.625] font-normal text-gray-700 underline cursor-pointer hover:text-gray-900"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
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
};

export default TrendSummaryContainer;
