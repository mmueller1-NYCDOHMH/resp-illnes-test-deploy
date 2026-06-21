import React, { useMemo, useState } from "react";
import { getThemeByTitle } from "../utils/themeUtils";
import { getAbsoluteTrend } from "../utils/trendUtils";
import StatCardSparkline from "./charts/StatCardSparkline";
import { useAnimatedNumber } from "./hooks/useAnimatedNumber";
import ChartModal from "./popups/ChartModal";

const arrowRotation = { up: "-45deg", down: "45deg", same: "0deg" };

const TrendChip = ({ dir }) => {
  if (!dir) return null;

  const styleMap = {
    up:   "bg-[#FCEBEB] text-[#A32D2D]",
    down: "bg-[#E1F5EE] text-[#0F6E56]",
    same: "bg-[#F1EFE8] text-[#444441]",
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
        "px-4 py-1.5 rounded-full",
        "font-semibold text-base leading-tight whitespace-nowrap",
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

const StatCardBottom = ({ title, series, valueKey = "value", view = "visits" }) => {
  const theme = getThemeByTitle(title);
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

  const animPrev    = useAnimatedNumber(trend?.previous ?? 0);
  const animCurrent = useAnimatedNumber(trend?.current  ?? 0);
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title} compact stat card — click to enlarge chart`}
      onClick={() => setModalOpen(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setModalOpen(true)}
      className={[
        "bg-white rounded-xl box-border relative",
        "border border-[var(--gray-200)]",
        "shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
        "flex flex-col min-w-0 w-full",
        "cursor-pointer",
        "transition-[box-shadow,transform] duration-200",
        "hover:shadow-[0_6px_20px_rgba(0,0,0,0.13)] hover:-translate-y-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
      ].join(" ")}
      style={{ "--card-bg": theme.chartColor || theme.color, "--stat-value": theme.color }}
    >
      {/* ── Header: icon + title ── */}
      <div
        className="flex items-center gap-sm px-md py-sm rounded-tl-xl rounded-tr-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${theme.chartColor || theme.color} 8%, transparent)` }}
      >
        {theme.icon && (
          <img className="w-6 h-6" src={theme.icon} alt="" aria-hidden="true" loading="lazy" />
        )}
        <div className="text-lg font-bold text-card-title-color md:text-[15px]">{title}</div>
      </div>

      {/* ── Chip row ── */}
      <div className="flex justify-center items-center px-md py-1.5">
        {trend && <TrendChip dir={dir} />}
      </div>

      {/* ── Values row ── */}
      <div className="flex justify-center items-center px-md py-1.5">
        {trend && (
          <div className="text-[18px] font-bold text-gray-700 whitespace-nowrap">
            {fmt(animPrev)}%{" "}
            <span
              className={`${trendArrowCls} inline-flex text-lg font-bold leading-none`}
              style={{
                display: "inline-block",
                transform: `rotate(${arrowRotation[dir] ?? "0deg"})`,
                transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >→</span>{" "}
            {fmt(animCurrent)}%
          </div>
        )}
      </div>

      {/* ── Sparkline ── */}
      <div className="px-sm pt-xs pb-sm">
        <StatCardSparkline
          series={series}
          valueKey={valueKey}
          color={theme.chartColor || theme.color}
          height={150}
        />
      </div>

      {/* Expand hint */}
      <div className="text-xs text-gray-400 text-right px-sm pb-2 select-none">
        Click to enlarge ↗
      </div>
    </div>

    <ChartModal title={title} isOpen={modalOpen} onClose={() => setModalOpen(false)} maxWidth={720}>
      <StatCardSparkline
        series={series}
        valueKey={valueKey}
        color={theme.chartColor || theme.color}
        height={380}
        tall
      />
    </ChartModal>
    </>
  );
};

export default StatCardBottom;
