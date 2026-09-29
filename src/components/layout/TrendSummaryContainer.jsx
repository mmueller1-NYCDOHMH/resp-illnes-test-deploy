import React from "react";
import PropTypes from "prop-types";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getTrendInfo } from "../../utils/getTrendInfo";
import "./TrendSummaryContainer.css"; // retains only: .trend-subtitle-select custom dropdown arrow

/**
 * TrendSummaryContainer
 *
 * Renders a page's "overview" content — an optional trend-arrow line, the
 * page-specific overview blurb, and any seasonal-bullet children.
 * It's plain inline content with no card/background of its own: it's meant
 * to be placed inside DataPageLayout's `subtitle` slot so it lives in the
 * *same* white header card as the page title, matching the home page's
 * header card.
 */
const TrendSummaryContainer = ({
  sectionTitle,
  trendDirection,
  markdownPath,
  children,
  metricLabel,
  virus = "COVID-19",
  view = "visits",
  virusLabelArticle = "a",
  virusLowercase = "COVID-19",
}) => {
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

        </div>
      )}

      {children && <div aria-live="polite">{children}</div>}
    </div>
  );
};

TrendSummaryContainer.propTypes = {
  sectionTitle: PropTypes.string,
  trendDirection: PropTypes.oneOf(["up", "down", "same"]),
  markdownPath: PropTypes.string,
  metricLabel: PropTypes.string,
  virus: PropTypes.string,
  view: PropTypes.string,
  children: PropTypes.node,
};

export default TrendSummaryContainer;
