import React, { useMemo, useState } from "react";
import { getThemeByTitle } from "../utils/themeUtils";
import { getAbsoluteTrend } from "../utils/trendUtils";
import StatCardSparkline from "./charts/StatCardSparkline";
import { useAnimatedNumber } from "./hooks/useAnimatedNumber";
import ChartModal from "./popups/ChartModal";

// Arrow rotations: up=−45°, down=45°, same=0°
const arrowRotation = { up: "-45deg", down: "45deg", same: "0deg" };

const TrendChip = ({ dir }) => {
  if (!dir) return null;

  const styleMap = {
    up:   "bg-trend-chip-inc-bg text-trend-chip-inc-text",
    down: "bg-trend-chip-dec-bg text-trend-chip-dec-text",
    same: "bg-trend-chip-neutral-bg text-trend-chip-neutral-text",
  };
  const labelMap = {
    up:   "Increased",
    down: "Decreased",
    same: "Stable",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-2",
        "px-5 py-2 rounded-full",
        "font-semibold text-lg leading-tight whitespace-nowrap",
        "transition-colors duration-300",
        styleMap[dir] ?? styleMap.same,
      ].join(" ")}
    >
      <span
        style={{
          display: "inline-block",
          transform: `rotate(${arrowRotation[dir] ?? "0deg"})`,
          transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
        aria-hidden="true"
      >
        →
      </span>
      {labelMap[dir] ?? labelMap.same}
    </span>
  );
};

/** Year-over-year comparison chip.
 *  Finds the value from ~52 weeks before the latest data point and computes
 *  a ratio. Shows e.g. "2.3× vs. last year" or "↓ 57% vs. last year". */
const YoYChip = ({ series, valueKey }) => {
  const result = useMemo(() => {
    if (!Array.isArray(series) || series.length < 4) return null;

    const toNum = (raw) => {
      if (raw == null || raw === "") return null;
      const n = typeof raw === "string" ? parseFloat(raw.replace(/[%,\s]+/g, "")) : Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const latest = series.at(-1);
    const current = toNum(latest?.[valueKey]);
    if (!Number.isFinite(current) || current === 0) return null;

    const latestMs = new Date(latest?.date).getTime();
    if (!Number.isFinite(latestMs)) return null;

    // Target: same week 52 weeks (364 days) ago
    const targetMs = latestMs - 364 * 24 * 60 * 60 * 1000;

    // Find the closest data point within ±10 days
    let best = null, bestDiff = Infinity;
    for (const row of series) {
      const ms = new Date(row?.date).getTime();
      if (!Number.isFinite(ms)) continue;
      const diff = Math.abs(ms - targetMs);
      if (diff < bestDiff) { bestDiff = diff; best = row; }
    }
    if (!best || bestDiff > 10 * 24 * 60 * 60 * 1000) return null;

    const lastYear = toNum(best[valueKey]);
    if (!Number.isFinite(lastYear) || lastYear === 0) return null;

    const ratio = current / lastYear;
    return { ratio, current, lastYear };
  }, [series, valueKey]);

  if (!result) return null;

  const { ratio } = result;
  const pct = Math.round(Math.abs(ratio - 1) * 100);

  let label, cls;
  if (ratio > 1.05) {
    label = `↑ ${pct}% vs. last year`;
    cls   = "bg-trend-chip-inc-bg text-trend-chip-inc-text";
  } else if (ratio < 0.95) {
    label = `↓ ${pct}% vs. last year`;
    cls   = "bg-trend-chip-dec-bg text-trend-chip-dec-text";
  } else {
    label = "≈ same as last year";
    cls   = "bg-trend-chip-neutral-bg text-trend-chip-neutral-text";
  }

  return (
    <span
      className={[
        "inline-flex items-center",
        "px-2.5 py-0.5 rounded-full",
        "font-medium text-xs leading-tight whitespace-nowrap",
        "transition-all duration-500",
        cls,
      ].join(" ")}
      title={`Current: ${result.current.toFixed(2)}% | Same week last year: ${result.lastYear.toFixed(2)}%`}
    >
      {label}
    </span>
  );
};

const StatCard = ({
  title,
  series,
  valueKey = "value",
  infoText,
  view = "visits",
}) => {
  const theme = getThemeByTitle(title);
  const iconSrc = theme.icon || null;
  const [modalOpen, setModalOpen] = useState(false);

  const trend = useMemo(() => {
    if (!Array.isArray(series) || series.length < 2) return null;
    return getAbsoluteTrend(series, valueKey, title);
  }, [series, valueKey, title]);

  const dir = trend?.direction ?? "same";

  const trendArrowCls = {
    up:   "text-trend-up",
    down: "text-trend-down",
    same: "text-trend-neutral",
  }[dir] ?? "text-trend-neutral";

  // Animated values — count up/down on virus or data-type switch
  const animPrev    = useAnimatedNumber(trend?.previous ?? 0);
  const animCurrent = useAnimatedNumber(trend?.current  ?? 0);

  const fmt    = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");
  const fmtAni = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title} stat card — click to enlarge chart`}
      onClick={() => setModalOpen(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setModalOpen(true)}
      className={[
        "bg-white rounded-xl box-border w-full",
        "border border-[var(--gray-200)]",
        "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]",
        "flex flex-col",
        "cursor-pointer",
        "transition-[box-shadow,transform] duration-200",
        "hover:shadow-[0_6px_20px_rgba(0,0,0,0.13)] hover:-translate-y-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
      ].join(" ")}
      style={{ "--card-bg": theme.chartColor || theme.color, "--stat-value": theme.color }}
    >
      {/* ── Header: icon + title | stats + chip ── */}
      <div
        className="flex items-start justify-between gap-3 px-md py-md flex-wrap rounded-tl-xl rounded-tr-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${theme.chartColor || theme.color} 8%, transparent)` }}
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-sm">
          {iconSrc && (
            <img className="w-6 h-6" src={iconSrc} alt="" aria-hidden="true" loading="lazy" />
          )}
          <div className="flex flex-col">
            <div className="text-lg font-bold text-card-title-color">{title}</div>
            {infoText && (
              <div className="text-xs font-normal text-left leading-none mt-1">{infoText}</div>
            )}
          </div>
        </div>

        {/* Right: label + values + chips */}
        {trend && (
          <div className="flex items-center gap-md ml-auto">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm text-gray-700">Last week vs. this week</span>
              <div className="flex items-center gap-1 text-[16px] font-bold text-gray-700 flex-wrap">
                <span>{fmtAni(animPrev)}%</span>
                <span
                  className={`${trendArrowCls} text-xl font-extrabold leading-none`}
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    transform: `rotate(${arrowRotation[dir] ?? "0deg"})`,
                    transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >→</span>
                <span className="sr-only">{dir === "up" ? "increased to" : dir === "down" ? "decreased to" : "stable at"}</span>
                <span>{fmtAni(animCurrent)}%</span>
                <span className="text-sm font-normal text-gray-700 ml-1">
                  {view === "hospitalizations" ? "of hospitalizations" : "of ED visits"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <TrendChip dir={dir} />
              <YoYChip series={series} valueKey={valueKey} />
            </div>
          </div>
        )}
      </div>

      {/* ── Body: full-width sparkline ── */}
      <div className="px-md pt-xs pb-xs">
        <StatCardSparkline
          series={series}
          valueKey={valueKey}
          color={theme.chartColor || theme.color}
          height={240}
          tall
        />
      </div>

      {/* Expand hint */}
      <div className="flex justify-end px-md pb-2" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3"  y1="21" x2="10" y2="14" />
        </svg>
      </div>

      {trend && (
        <div className="sr-only">
          {title}: {view === "hospitalizations" ? "hospitalizations" : "ED visits"} {dir === "up" ? "increased" : dir === "down" ? "decreased" : "remained stable"} from {fmt(trend.previous)}% last week to {fmt(trend.current)}% this week.
        </div>
      )}
    </div>

    <ChartModal title={title} isOpen={modalOpen} onClose={() => setModalOpen(false)} maxWidth={860}>
      <StatCardSparkline
        series={series}
        valueKey={valueKey}
        color={theme.chartColor || theme.color}
        height={400}
        tall
      />
    </ChartModal>
    </>
  );
};

export default StatCard;
