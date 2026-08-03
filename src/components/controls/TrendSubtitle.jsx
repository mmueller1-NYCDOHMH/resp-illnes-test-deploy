import React from "react";
import PropTypes from "prop-types";
import { buildStyledTrendSentence } from "../../utils/trendUtils";

/**
 * TrendSubtitle Component
 *
 * Expects `variables` containing:
 * - trendObj: { direction, label, value, current?, previous? }
 * - latestWeek: Date object
 * - metricLabel: string ("Visits", "Hospitalizations", "Cases", etc.)
 * - dateHtml (optional): HTML version of the formatted date
 *
 * Outputs: a fully styled subtitle sentence with HTML chips.
 */

const TrendSubtitle = ({ variables = {} }) => {
  const {
    trendObj,
    latestWeek,
    metricLabel,
    dateHtml,
  } = variables;

  

  // Guard: Don't render if required data is missing
  if (!trendObj || !latestWeek || !metricLabel) {
    console.warn("[TrendSubtitle] Missing required data:", {
      hasTrendObj: !!trendObj,
      hasLatestWeek: !!latestWeek,
      hasMetricLabel: !!metricLabel,
    });
    return null;
  }

  // Build the sentence
  const sentence = buildStyledTrendSentence({
    metricLabel,
    latestWeek,
    trend: trendObj,   // ← Pass trendObj as 'trend'
    dateHtml,
  });

  // Guard: Don't render empty sentences
  if (!sentence) {
    console.warn("[TrendSubtitle] buildStyledTrendSentence returned empty");
    return null;
  }

  return (
    <span
      className="chart-subtitle"
      style={{
        margin: "8px 0",
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: sentence }} />
    </span>
  );
};

TrendSubtitle.propTypes = {
  variables: PropTypes.shape({
    trendObj: PropTypes.object,
    latestWeek: PropTypes.instanceOf(Date),
    metricLabel: PropTypes.string,
    dateHtml: PropTypes.string,
  }),
};

export default TrendSubtitle;