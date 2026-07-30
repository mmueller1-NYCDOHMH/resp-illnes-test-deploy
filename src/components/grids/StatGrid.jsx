import React, { useState } from "react";
import StatCardRow, { ROW_GRID_COLS } from "../StatCardRow";
import ToggleGroup from "../controls/ToggleGroup";
import InfoModal from "../popups/InfoModal";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { resolveHTMLLabels, getText } from "../../utils/contentUtils";

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
  const [view, setView] = useState("visits");
  const [infoOpen, setInfoOpen] = useState(false);

  if (!data) return null;

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

    const statText = getText(`overview.statCards.${key}`) || {};
    const title = statText.title || label;
    const infoText = statText.infoText || "";

    return { key, title, infoText, visitSeries, hospitalizationSeries };
  });

  const latestAri = (data["Respiratory illness visits"] || []).at?.(-1) || null;
  const baseDate = latestAri ? new Date(latestAri.date) : null;
  const formattedDate = baseDate ? fmt(baseDate) : "–";
  const previousWeek = baseDate ? fmt(new Date(baseDate.getTime() - 7 * DAY_MS)) : "–";

  const vars = { date: formattedDate, previousWeek };
  const descriptionHTML = resolveHTMLLabels(getText("overview.summaryBox.description") || "", vars);

  const sparklineView = view === "hospitalizations" ? "hosps" : "visits";

  const [primary, ...rest] = statCards;

  const sectionTitle    = getText("overview.statGrid.title")    || "What's happening across the city?";
  const sectionSubtitle = getText("overview.statGrid.subtitle") || "Emergency Department trends for the week ending";
  const infoModalTitle  = getText("overview.statGrid.infoModalTitle") || "About Emergency Department Data";

  const columnHeaderLabel = view === "hospitalizations" ? "Percent of hospitalizations" : "Percent of ED visits";

  return (
    <div className="stat-grid flex flex-col gap-xs w-full overflow-hidden">

      {/* ── Section heading ── */}
      <h3 className="text-[var(--content-title-size)] font-semibold tracking-tight text-gray-900 mb-xs">
        {sectionTitle}
      </h3>

      {/* ── ED trends date subtitle ── */}
      <p className="text-body text-gray-700 leading-relaxed mb-sm">
        {sectionSubtitle} <strong className="text-gray-800">{formattedDate}</strong>
      </p>

      {/* ── Body copy ── */}
      <div
        className="stat-info-description text-body text-gray-700 leading-relaxed mb-xl [&_p]:mb-3 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: descriptionHTML }}
      />

      {/* ── Toggle row + info icon ── */}
      <div className="flex items-center justify-between mb-lg">
        <ToggleGroup
          options={[
            { label: "ED Visits", value: "visits" },
            { label: "Hospitalizations", value: "hospitalizations" },
          ]}
          value={view}
          onChange={setView}
          ariaLabel="Toggle between visits and hospitalizations"
          variant="pill"
        />
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

      {/* ── Unified stat card: one shared header, ORI heavy row, 3 compact rows ── */}
      <div className="bg-white rounded-xl box-border w-full border border-[var(--gray-200)] shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] px-md md:px-lg">

        {/* Column headers — shown once, not repeated per row */}
        <div className={`hidden md:grid ${ROW_GRID_COLS} gap-x-md items-end pt-md pb-3 border-b border-[var(--gray-200)]`}>
          <div />
          <div className="text-body font-semibold text-gray-700 text-left">{columnHeaderLabel}</div>
          <div className="text-body font-semibold text-gray-700 text-center">Last week vs. this week</div>
        </div>

        {primary && (
          <StatCardRow
            key={primary.key}
            title={primary.title}
            infoText={primary.infoText}
            series={view === "visits" ? primary.visitSeries : primary.hospitalizationSeries}
            valueKey="value"
            view={view}
            sparklineView={sparklineView}
            variant="primary"
            showAxis
            chartLabel={columnHeaderLabel}
            valueLabel="Last week vs. this week"
            yAxisFormat={primary.key === "rsv" ? ".2f" : ".1f"}
          />
        )}

        <div className="pt-5 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
          By virus
        </div>

        {rest.map(({ key, title, visitSeries, hospitalizationSeries }, i) => (
          <StatCardRow
            key={key}
            title={title}
            series={view === "visits" ? visitSeries : hospitalizationSeries}
            valueKey="value"
            view={view}
            sparklineView={sparklineView}
            variant="compact"
            isLast={i === rest.length - 1}
            chartLabel={columnHeaderLabel}
            valueLabel="Last week vs. this week"
            yAxisFormat={key === "rsv" ? ".2f" : ".1f"}
          />
        ))}
      </div>

      <div className="font-semibold text-body text-[var(--footnote-gray)] text-right md:mt-md">
        Compared with week of {previousWeek}
      </div>

      {/* ── Info modal ── */}
      <InfoModal
        id="stat-grid-info-modal"
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={infoModalTitle}
        content={
          <MarkdownRenderer
            filePath="content/modals/emergency-dept-overview.md"
            showTitle={false}
          />
        }
      />
    </div>
  );
};

export default StatGrid;
