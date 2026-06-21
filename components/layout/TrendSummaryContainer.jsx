import React, { useRef, useEffect, useState, forwardRef } from "react";
import PropTypes from "prop-types";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getTrendInfo } from "../../utils/getTrendInfo";
import { getThemeByTitle } from "../../utils/themeUtils";
import "./TrendSummaryContainer.css"; // retains only: .trend-subtitle-select custom dropdown arrow

const TrendSummaryContainer = forwardRef(({
  sectionTitle,
  date,
  trendDirection,
  animateOnScroll = true,
  markdownPath,
  showTitle = false,
  children,
  metricLabel,
  virus = "COVID-19",
  view = "visits",
  virusLabelArticle = "a",
  virusLowercase = "COVID-19",
}, ref) => {
  const localRef = useRef(null);
  const resolvedRef = ref ?? localRef;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = resolvedRef.current;
    if (!animateOnScroll || !node) return;
  
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
  
    observer.observe(node);
  
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [animateOnScroll]);
  

  const virusTheme = getThemeByTitle(virus);
  const accentColor = virusTheme.color || "#1E40AF";

  const resolvedMetricLabel = metricLabel || view;
  const trend = getTrendInfo({
    trendDirection,
    metricLabel: resolvedMetricLabel,
    virus,
  });

  return (
    <div
      ref={resolvedRef}
      className={[
        "w-full max-w-content mx-auto box-border rounded-lg",
        "p-[var(--trend-summary-padding,var(--spacing-md))] px-lg mb-xl",
        "md:w-full md:px-lg md:py-md",
        animateOnScroll ? (isVisible ? "fade-in" : "") : "",
      ].filter(Boolean).join(" ")}
      style={{
        borderLeft: `4px solid var(--page-accent, ${accentColor})`,
        backgroundColor: `color-mix(in srgb, var(--page-accent, ${accentColor}) 8%, white)`,
        transition: "border-color 300ms ease, background-color 300ms ease",
      }}
    >
      {trend && (
        <div
          className={[
            "flex items-center text-[var(--trend-status-size,var(--font-size-md))]",
            "font-body text-[var(--trend-status-color,var(--gray-800))] gap-sm mb-md",
            // mobile: stack
            "md:flex-col md:items-start md:gap-xs",
          ].join(" ")}
        >
          <span className="text-[var(--trend-arrow-size,18px)] font-bold" style={{ color: trend.trendColor }}>
            {trend.arrow}
          </span>
          <span className="trend-text" style={{ color: trend.trendColor }}>
            {trend.label}
            <strong>{trend.directionText}</strong>
          </span>
        </div>
      )}

      {markdownPath && (
        <MarkdownRenderer
          filePath={markdownPath}
          sectionTitle={sectionTitle}
          showTitle={false}
          className="markdown-body"
          variables={{ virus, view, virusLabelArticle, virusLowercase }}
        />
      )}

      {children && <div aria-live="polite">{children}</div>}
    </div>
  );
});

TrendSummaryContainer.displayName = "TrendSummaryContainer";

TrendSummaryContainer.propTypes = {
  sectionTitle: PropTypes.string,
  date: PropTypes.string,
  trendDirection: PropTypes.oneOf(["up", "down", "same"]),
  markdownPath: PropTypes.string,
  showTitle: PropTypes.bool,
  metricLabel: PropTypes.string,
  virus: PropTypes.string,
  view: PropTypes.string,
  children: PropTypes.node,
  animateOnScroll: PropTypes.bool,
};

export default TrendSummaryContainer;
