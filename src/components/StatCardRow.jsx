import React, { useMemo, useState } from "react";
import { getThemeByTitle } from "../utils/themeUtils";
import { getAbsoluteTrend } from "../utils/trendUtils";
import StatCardSparkline from "./charts/StatCardSparkline";
import { useAnimatedNumber } from "./hooks/useAnimatedNumber";
import ChartModal from "./popups/ChartModal";
import TrendChip, { TrendArrowBadge } from "./TrendChip";
import { getText } from "../utils/contentUtils";

// Shared column template — the "once" header row in StatGrid uses the same
// string so its labels line up exactly with the columns below.
export const ROW_GRID_COLS =
  "grid-cols-1 md:grid-cols-[minmax(140px,220px)_minmax(0,1fr)_minmax(150px,190px)]";

/**
 * StatCardRow
 *
 * One row of the unified "What's happening across the city?" stat table.
 * `variant="primary"` renders the heavier Overall respiratory illness row
 * (bigger title, taller chart, and — via `showAxis` — the only date axis
 * in the section). `variant="compact"` renders the lighter COVID/Flu/RSV
 * rows nested in the same card, sharing one set of column headers.
 */
const StatCardRow = ({
  title,
  series,
  valueKey = "value",
  infoText,
  view = "visits",
  sparklineView = "visits",
  variant = "compact",
  showAxis = false,
  isLast = false,
  chartLabel = "Percent of ED visits",
  valueLabel = "Last week vs. this week",
  yAxisFormat = ".1f",
}) => {
  const theme = getThemeByTitle(title);
  const isPrimary = variant === "primary";
  const [modalOpen, setModalOpen] = useState(false);

  const hasSeries = Array.isArray(series) && series.length >= 2;

  const trend = useMemo(() => {
    if (!hasSeries) return null;
    return getAbsoluteTrend(series, valueKey, title);
  }, [hasSeries, series, valueKey, title]);

  const dir = trend?.direction ?? "same";

  const animPrev    = useAnimatedNumber(trend?.previous ?? 0);
  const animCurrent = useAnimatedNumber(trend?.current  ?? 0);
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");

  const unitLabel = view === "hospitalizations"
    ? (getText("overview.statCards.ofHospitalizations") || "of hospitalizations")
    : (getText("overview.statCards.ofEdVisits") || "of ED visits");

  const rowBorder = isPrimary
    ? "border-b-2 border-[var(--gray-300)]"
    : !isLast ? "border-b border-[var(--gray-200)]" : "";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${title} stat row — click to enlarge chart`}
        onClick={() => setModalOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setModalOpen(true)}
        className={[
          "group relative grid",
          ROW_GRID_COLS,
          "gap-y-2 gap-x-md items-center cursor-pointer",
          "transition-colors duration-150 hover:bg-gray-100/60",
          "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
          isPrimary ? "py-md" : "py-sm",
          rowBorder,
        ].join(" ")}
      >
        {/* Expand hint — subtle by default, clearer on hover/focus */}
        <svg
          aria-hidden="true"
          width={isPrimary ? 14 : 12}
          height={isPrimary ? 14 : 12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-2 right-2 text-gray-300 opacity-70 group-hover:text-gray-500 group-hover:opacity-100 group-focus-visible:text-gray-500 group-focus-visible:opacity-100 transition-colors duration-150"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>

        {/* ── Label column ──
            Primary (ORI): icon top-aligned with the title line itself, not
            centered against the title+subtitle block (items-start, not
            items-center) so the icon reads as inline with "ORI".
            Compact rows: icon+name grouped and right-aligned as a single
            unit (justify-end) so the label sits flush against the chart —
            icon and text move together instead of the icon anchoring left
            while the text drifts right. */}
        <div
          className={[
            "flex gap-sm min-w-0",
            isPrimary ? "items-start" : "items-center justify-end text-right",
          ].join(" ")}
        >
          {theme.icon && (
            <img
              className={isPrimary ? "w-7 h-7 flex-shrink-0" : "w-5 h-5 flex-shrink-0"}
              src={theme.icon}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <div
              className={
                isPrimary
                  ? "text-lg font-semibold text-card-title-color leading-tight"
                  : "text-md font-semibold text-card-title-color leading-tight"
              }
            >
              {title}
            </div>
            {isPrimary && infoText && (
              <div className="text-sm text-gray-700 mt-0.5">{infoText}</div>
            )}
          </div>
        </div>

        {/* ── Chart column ── */}
        <div className="min-w-0">
          <div className="md:hidden text-xs font-medium text-gray-600 mb-1">{chartLabel}</div>
          <div
            className={isPrimary ? "px-md py-sm" : "px-sm py-xs"}
          >
            {hasSeries ? (
              <StatCardSparkline
                series={series}
                valueKey={valueKey}
                view={sparklineView}
                color={theme.chartColor || theme.color}
                height={isPrimary ? 132 : 88}
                tall={isPrimary}
                showXAxis={showAxis}
                showYAxis
                yAxisFormat={yAxisFormat}
              />
            ) : (
              <div
                className="flex items-center justify-center text-sm text-gray-400"
                style={{ height: isPrimary ? 132 : 88 }}
              >
                Not enough data
              </div>
            )}
          </div>
        </div>

        {/* ── Value column ── */}
        <div className="flex flex-col items-center gap-2">
          <div className="md:hidden text-xs font-medium text-gray-600">{valueLabel}</div>
          {trend ? (
            <>
              <div
                className={[
                  "flex items-center gap-2 font-semibold text-gray-800 whitespace-nowrap",
                  isPrimary ? "text-lg" : "text-md",
                ].join(" ")}
              >
                <span>{fmt(animPrev)}%</span>
                <TrendArrowBadge dir={dir} size={isPrimary ? "base" : "sm"} />
                <span>{fmt(animCurrent)}%</span>
              </div>
              <TrendChip dir={dir} size={isPrimary ? "base" : "sm"} showArrow={false} />
            </>
          ) : (
            <div className="text-sm text-gray-400">Not enough data</div>
          )}
        </div>

        {trend && (
          <div className="sr-only">
            {title}: {view === "hospitalizations" ? "hospitalizations" : "ED visits"}{" "}
            {dir === "up" ? "increased" : dir === "down" ? "decreased" : "remained stable"} from{" "}
            {fmt(trend.previous)}% last week to {fmt(trend.current)}% this week.
          </div>
        )}
      </div>

      <ChartModal
        title={title}
        subtitle={trend ? (
          <div className="flex items-center gap-3 flex-wrap">
            <TrendChip dir={dir} size="sm" />
            <span className="text-base text-gray-700">
              {fmt(trend.previous)}% → {fmt(trend.current)}%{" "}
              <span className="text-gray-400">{unitLabel}</span>
            </span>
          </div>
        ) : null}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth={isPrimary ? 860 : 720}
      >
        <StatCardSparkline
          series={series}
          valueKey={valueKey}
          color={theme.chartColor || theme.color}
          height={380}
          tall
          view={sparklineView}
          showXAxis
          showYAxis
          yAxisFormat={yAxisFormat}
        />
      </ChartModal>
    </>
  );
};

export default StatCardRow;
