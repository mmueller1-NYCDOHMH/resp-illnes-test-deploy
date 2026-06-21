import React, { useState } from "react";
import StatCard from "../StatCard";
import StatCardBottom from "../StatCardBottom";
import ToggleControls from "../controls/ToggleControls";
import InfoModal from "../popups/InfoModal";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { resolveHTMLLabels } from "../../utils/contentUtils";
import "./StatGrid.css";

import text from "../../content/text.json";

const DAY_MS = 24 * 60 * 60 * 1000;
const fmt = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const toNum = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[%\s,]+/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const formatValuePct = (d) =>
  d && toNum(d.value) != null ? `${toNum(d.value).toFixed(1)}%` : "–";

const formatAsOf = (d) => (d?.date ? `as of ${fmt(new Date(d.date))}` : "–");

const seriesKeysForLabel = (label) => {
  if (label === "Respiratory illness") {
    return ["Respiratory illness visits", "Respiratory illness hospitalizations"];
  }
  if (label === "Flu" || label === "Influenza") {
    return ["Influenza visits", "Influenza hospitalizations"];
  }
  return [`${label} visits`, `${label} hospitalizations`];
};

const StatGrid = ({ data }) => {
  if (!data) return null;

  const [view, setView] = useState("visits");
  const [infoOpen, setInfoOpen] = useState(false);

  const viruses = [
    { key: "ari", label: "Respiratory illness" },
    { key: "covid", label: "COVID-19" },
    { key: "flu", label: "Flu" },
    { key: "rsv", label: "RSV" },
  ];

  const statCards = viruses.map(({ key, label }) => {
    const [visKey, hosKey] = seriesKeysForLabel(label);

    const visitSeries = (data[visKey] || []).filter((d) => toNum(d.value) !== null);
    const hospitalizationSeries = (data[hosKey] || []).filter((d) => toNum(d.value) !== null);

    const latestVisit = visitSeries.at?.(-1) ?? null;
    const latestAdmit = hospitalizationSeries.at?.(-1) ?? null;

    const statText = text?.overview?.statCards?.[key] || {};
    const title = statText.title || label;
    const infoText = statText.infoText || "";

    return {
      key,
      title,
      infoText,
      visitSeries,
      hospitalizationSeries,
      valueKey: "value",
      visitPercent: formatValuePct(latestVisit),
      hospitalizationPercent: formatValuePct(latestAdmit),
      visitDate: formatAsOf(latestVisit),
      admitDate: formatAsOf(latestAdmit),
    };
  });

  const latestAri = (data["Respiratory illness visits"] || []).at?.(-1) || null;
  const baseDate = latestAri ? new Date(latestAri.date) : null;
  const formattedDate = baseDate ? fmt(baseDate) : "–";
  const previousWeek = baseDate ? fmt(new Date(baseDate.getTime() - 7 * DAY_MS)) : "–";

  const vars = { date: formattedDate, previousWeek };
  const titleHTML = resolveHTMLLabels(text?.overview?.summaryBox?.title || "", vars);
  const descriptionHTML = resolveHTMLLabels(text?.overview?.summaryBox?.description || "", vars);

  const { key: topKey, visitSeries: topVisit, hospitalizationSeries: topHosp, ...topRest } = statCards[0];
  const topSeries = view === "visits" ? topVisit : topHosp;

  const sectionTitle    = text?.overview?.statGrid?.title    || "What's happening across the city?";
  const sectionSubtitle = text?.overview?.statGrid?.subtitle || "Emergency Department trends for the week ending";

  return (
    <div className="stat-grid flex flex-col gap-xs w-full overflow-hidden">

      {/* ── Section heading ── */}
      <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-xs">
        {sectionTitle}
      </h3>

      {/* ── ED trends date subtitle ── */}
      <p className="text-md text-gray-600 mb-sm">
        {sectionSubtitle} <strong className="text-gray-800">{formattedDate}</strong>
      </p>

      {/* ── Body copy ── */}
      <div
        className="stat-info-description text-md text-gray-700 mb-md"
        dangerouslySetInnerHTML={{ __html: descriptionHTML }}
      />

      {/* ── Toggle row + info icon ── */}
      <div className="flex items-center justify-between mb-md">
        <ToggleControls data={[]} view={view} onToggle={setView} />
        <button
          type="button"
          className="appearance-none bg-transparent border-0 p-0 cursor-pointer flex-shrink-0 text-gray-900 hover:text-gray-600 transition-colors duration-150"
          aria-label="More info about emergency department data"
          onClick={() => setInfoOpen(true)}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="9" cy="6" r="1" fill="currentColor"/>
            <line x1="9" y1="9" x2="9" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── ARI card — full width ── */}
      <StatCard
        key={topKey}
        {...topRest}
        series={topSeries}
        valueKey="value"
        view={view}
      />

      {/* ── Virus cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {statCards.slice(1).map(({ key, visitSeries, hospitalizationSeries, ...cardProps }) => (
          <StatCardBottom
            key={key}
            {...cardProps}
            series={view === "visits" ? visitSeries : hospitalizationSeries}
            valueKey="value"
            view={view}
          />
        ))}
      </div>

      <div className="font-bold text-[14px] text-[var(--footnote-gray)] text-right md:mt-md">
        Compared with week of {previousWeek}
      </div>

      {/* ── Info modal ── */}
      <InfoModal
        id="stat-grid-info-modal"
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="About Emergency Department Data"
        content={
          <MarkdownRenderer
            filePath="content/modals/emergency-dept-explainer.md"
            showTitle={false}
          />
        }
      />
    </div>
  );
};

export default StatGrid;
