'use client';

import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useRouter, usePathname } from "next/navigation";
import { virusOptions } from "../controls/VirusFilterGroup";
import { getThemeByTitle } from "../../utils/themeUtils";
import { formatDate } from "../../utils/trendUtils";
import { getDataTypeOptions } from "../../utils/dataTypeOptions";
import LanguageToggle from "../contentUtils/LanguageToggle";
import { getRankedJumpLinks } from "../../utils/rankFeaturedLinks";
import JumpToPreview from "./JumpToPreview";

// ── Virus slug map ────────────────────────────────────────────────────────────
const VIRUS_SLUGS = {
  "COVID-19": "covid-19",
  "Flu":      "flu",
  "RSV":      "rsv",
};


// ── Shared sub-components ─────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <div className="text-xs font-semibold tracking-[0.06em] uppercase text-gray-600 px-1 mb-1">
    {children}
  </div>
);

// A fixed-width "rail" is pinned to the left edge of every pill; the dot
// sits centered inside it via flexbox. Selecting a row grows that dot to
// fill the rail — but since switching virus also swaps the fetched dataset
// (usePageData) and remounts the content area, a plain CSS *transition*
// between prop states isn't reliable to catch. Using a CSS *animation*
// (keyframes, defined below) instead means the grow effect plays on render
// whenever a row is active, regardless of whether that's an update or a
// fresh mount.
// Two statically-shaped markers (a real circle, a real full-rail rectangle)
// stacked in the same spot — no width/height/clip-path animation, only
// transform + opacity, the two properties every browser is guaranteed to
// run purely on the compositor. Sequenced with transition-delay so it reads
// as shrink-then-grow rather than a simultaneous crossfade: whichever shape
// is disappearing starts immediately (no delay); whichever is appearing
// waits ~100ms so it only starts once the other has shrunk away. The bar
// only scales on Y (scale-y-*) so it grows from the center vertically
// without squishing its width.
const PillButton = ({ isActive, onClick, accentColor, children }) => (
  <button
    onClick={onClick}
    className={[
      "relative w-full pl-5 pr-3 py-[9px] rounded-full overflow-hidden cursor-pointer text-[15px] text-left whitespace-nowrap",
      "transition-colors duration-150 box-border",
      isActive
        ? "bg-gray-900 text-white font-semibold"
        : "bg-transparent text-gray-700 font-normal hover:bg-gray-200 hover:text-gray-900",
    ].join(" ")}
  >
    <span aria-hidden="true" className="absolute left-0 top-0 h-full w-3">
      {/* Bar — grows in vertically from center, after the dot shrinks away */}
      <span
        className={[
          "absolute inset-0 origin-center transition-[transform,opacity] ease-out",
          isActive ? "opacity-100 scale-y-100 duration-150 delay-100" : "opacity-0 scale-y-0 duration-100",
        ].join(" ")}
        style={{ backgroundColor: accentColor || "var(--gray-300)" }}
      />
      {/* Dot — fixed-size circle, shrinks away first when a row is selected */}
      <span
        className={[
          "absolute inset-0 m-auto w-2.5 h-2.5 rounded-full origin-center transition-[transform,opacity] ease-out",
          isActive ? "opacity-0 scale-0 duration-100" : "opacity-100 scale-100 duration-150 delay-100",
        ].join(" ")}
        style={{ backgroundColor: accentColor || "var(--gray-300)" }}
      />
    </span>
    {children}
  </button>
);

const SubNavButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "w-full px-[10px] py-[6px] border-0 cursor-pointer text-sm text-left",
      "transition-[border-color,color,background] duration-150 box-border",
      isActive
        ? "border-l-2 border-gray-900 text-gray-900 font-semibold bg-transparent"
        : "border-l-2 border-gray-400 text-gray-600 font-normal hover:bg-gray-200",
    ].join(" ")}
  >
    {children}
  </button>
);

const DataTypeButton = ({ isActive, isFirst, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "w-full px-3 py-2 border-0 cursor-pointer text-sm text-left font-body",
      "transition-[background-color,color] duration-150",
      !isFirst && "border-t border-gray-300",
      isActive
        ? "bg-gray-900 text-white font-semibold"
        : "bg-white text-gray-700 font-normal hover:bg-gray-200 hover:text-gray-900",
    ].filter(Boolean).join(" ")}
  >
    {children}
  </button>
);

const ExternalLinkIcon = () => (
  <svg
    width="10" height="10" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    className="flex-shrink-0 opacity-60"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// Small trending-up icon for the ranked-links section header — signals
// "this list moves with the data" rather than a static nav shortcut.
const TrendingIcon = () => (
  <svg
    width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    className="flex-shrink-0"
  >
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);

// Chevron that slides in on hover/focus — same affordance StatCardRow uses
// for its "More {title} data" links, reused here so a Trending Data row
// reads as clickable rather than as a plain info line.
const HoverChevron = () => (
  <svg
    aria-hidden="true"
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
    className={[
      "absolute right-2 top-1/2 -translate-y-1/2 flex-shrink-0 text-gray-400",
      "opacity-0 -translate-x-1 transition-all duration-150",
      "group-hover:opacity-100 group-hover:translate-x-0",
      "group-focus-visible:opacity-100 group-focus-visible:translate-x-0",
    ].join(" ")}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

// Small colored delta badge next to a ranked "Jump to" link — reuses the
// same up/down semantics and color tokens as TrendChip elsewhere on the
// site (up = increased = red, since higher illness metrics read as worse).
const CHANGE_TEXT_COLOR = {
  up:   "text-trend-chip-inc-text",
  down: "text-trend-chip-dec-text",
};
const CHANGE_ARROW = { up: "▲", down: "▼" };
const CHANGE_WORD  = { up: "Increased", down: "Decreased" };

const ChangeBadge = ({ direction, pctDisplay }) => {
  if (!direction || !pctDisplay || !CHANGE_ARROW[direction]) return null;
  return (
    <span
      title={`${CHANGE_WORD[direction]} ${pctDisplay}`}
      className={[
        "flex-shrink-0 text-[11px] font-semibold tabular-nums ml-2 mt-[3px] whitespace-nowrap",
        CHANGE_TEXT_COLOR[direction] ?? "text-gray-500",
      ].join(" ")}
    >
      {CHANGE_ARROW[direction]} {pctDisplay}
    </span>
  );
};

// Placeholder rows shown while the "Jump to" ranking is being computed —
// same footprint as a real row so nothing jumps once data arrives.
const JumpToSkeleton = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="px-3 py-[5px]">
        <div className="h-[15px] w-[70%] rounded bg-gray-200 animate-pulse" />
      </div>
    ))}
  </>
);

// Compact text link — used for anchor jumps, data-page links, and resources
const TextLink = ({ href, onClick, external, className: extraCls = "", children }) => {
  const base = [
    "flex items-center gap-[5px] px-3 py-[5px] text-[13.5px] no-underline rounded-md",
    "text-gray-600 bg-transparent transition-[color,background] duration-150 cursor-pointer",
    "hover:text-gray-900 hover:bg-gray-200",
    extraCls,
  ].join(" ");

  return href ? (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={base}
    >
      {children}{external && <ExternalLinkIcon />}
    </a>
  ) : (
    <button
      onClick={onClick}
      className={`${base} border-none w-full text-left`}
    >
      {children}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const PageSidebar = ({
  activeVirus,
  onVirusChange,
  dataType,
  onDataTypeChange,
  view,
  onViewChange,
  controls = {},
  uploadDate,
  updateNote,
  anchorLinks = [],
}) => {
  const { virusToggle = true, dataTypeToggle = true, viewToggle = true } = controls;
  const router = useRouter();
  const path   = usePathname();

  // Derive active page from current route
  const activePage =
    path.startsWith("/data")  ? "data"  :
    path.startsWith("/about") ? "about" : "home";

  const dataTypeOptions = getDataTypeOptions(activeVirus);

  // ── Jump-to hover preview ────────────────────────────────────────────────
  // Only activated on devices that support true hover (no touch).
  const [canHover, setCanHover] = useState(false);
  const [activeHref, setActiveHref]       = useState(null);
  const [activeLabel, setActiveLabel]     = useState(null);
  const [activeLinkMeta, setActiveLinkMeta] = useState(null);
  const [anchorEl, setAnchorEl]           = useState(null);

  useEffect(() => {
    setCanHover(
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  }, []);

  // ── Jump-to links — ranked by biggest WoW % change, home page only ──────
  const [jumpLinks, setJumpLinks] = useState(null); // null = still loading

  useEffect(() => {
    if (activePage !== "home") return;
    let cancelled = false;
    getRankedJumpLinks({ limit: 4 }).then((ranked) => {
      if (!cancelled) setJumpLinks(ranked);
    });
    return () => { cancelled = true; };
  }, [activePage]);

  const handleLinkEnter = useCallback((link, e) => {
    setActiveHref(link.href);
    setActiveLabel(link.label);
    setActiveLinkMeta(link);
    setAnchorEl(e.currentTarget);
  }, []);

  const handleLinkLeave = useCallback(() => {
    setActiveHref(null);
    setActiveLabel(null);
    setActiveLinkMeta(null);
    setAnchorEl(null);
  }, []);

  return (
    <>
      <aside className="flex flex-col gap-1 w-full">

        {/* ── Update note — home page top (last updated now lives at the
              bottom of the sidebar, same position as on data pages).
              No border here — the card below ("This week's movers") has
              its own border/background, so an extra divider isn't needed. ── */}
        {updateNote && activePage === "home" && (
          <div className="text-sm text-gray-700 leading-snug pl-1 mb-4">
            <p
              className="mt-0 mb-0"
              dangerouslySetInnerHTML={{ __html: updateNote }}
            />
          </div>
        )}

        {/* ── Virus buttons — data pages only ── */}
        {virusToggle && (
          <>
            <div className="border-t border-gray-200 mb-4" />
            <div className="flex flex-col gap-[2px] mb-4">
              <SectionLabel>Virus</SectionLabel>
              {virusOptions.map(({ label }) => {
                const theme    = getThemeByTitle(label);
                const isActive = activeVirus === label;
                const slug     = VIRUS_SLUGS[label];
                return (
                  <React.Fragment key={label}>
                    <PillButton
                      isActive={isActive}
                      accentColor={theme.color}
                      onClick={() => onVirusChange(label)}
                    >
                      {label}
                    </PillButton>
                    {activePage === "home" && slug && (
                      <div className="pl-[38px] -mt-1 mb-[2px]">
                        <a
                          href={`/data/${slug}`}
                          onClick={(e) => { e.preventDefault(); router.push(`/data/${slug}`); }}
                          className="text-xs text-blue-primary no-underline leading-snug opacity-85"
                        >
                          View data →
                        </a>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}

        {/* ── Data type segmented control — data pages only ── */}
        {dataTypeToggle && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Data type</SectionLabel>

            {/* Segmented tabs */}
            <div className="flex flex-col border border-gray-300 rounded-[10px] overflow-hidden">
              {dataTypeOptions.map(({ label, value }, idx) => {
                const isActive = dataType === value;
                return (
                  <React.Fragment key={value}>
                    <DataTypeButton
                      isActive={isActive}
                      isFirst={idx === 0}
                      onClick={() => onDataTypeChange(value)}
                    >
                      {label}
                    </DataTypeButton>

                    {/* Visits/Hospitalizations inline, directly under ED when active */}
                    {value === "ed" && isActive && viewToggle && (
                      <div className="flex flex-col gap-[2px] p-[6px_8px] bg-gray-100 border-t border-gray-300">
                        {["visits", "hospitalizations"].map((v) => (
                          <SubNavButton key={v} isActive={view === v} onClick={() => onViewChange(v)}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </SubNavButton>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trending Data (home page only) ──
              Ranked by biggest week-over-week % change rather than
              hand-picked, so this list reflects whatever is moving most
              right now (see rankFeaturedLinks.js). Styled as its own card
              — distinct from the static nav sections above — since its
              contents change with the data, not with user selection.
              Label and delta badge share one line (label truncates via
              min-w-0/flex-1 if it ever runs out of room); hairline
              dividers between rows plus a hover/focus card treatment
              (bg, border, shadow, chevron) mark each row as clickable. ── */}
        {activePage === "home" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 mb-4">
            <div className="flex items-center gap-1.5 px-1 mb-1.5 text-gray-600">
              <TrendingIcon />
              <span className="text-xs font-semibold tracking-[0.06em] uppercase">
                Trending Data
              </span>
            </div>
            <div className="flex flex-col divide-y divide-gray-200/80">
              {jumpLinks === null && <JumpToSkeleton />}
              {jumpLinks?.map((link) => {
                const theme = getThemeByTitle(link.virus);
                return (
                  <div
                    key={link.href}
                    onMouseEnter={canHover ? (e) => handleLinkEnter(link, e) : undefined}
                    onMouseLeave={canHover ? handleLinkLeave : undefined}
                  >
                    <button
                      onClick={() => router.push(link.href)}
                      className={[
                        "group relative flex items-start justify-between gap-2 w-full pl-3 pr-6 py-[8px] rounded-md",
                        "border border-transparent bg-transparent text-left text-[13.5px] text-gray-600",
                        "cursor-pointer transition-all duration-150",
                        "hover:text-gray-900 hover:bg-white hover:border-gray-200 hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                      ].join(" ")}
                    >
                      {/* No `truncate` here on purpose — a fixed-width sidebar plus a
                          variable-width badge means truncation keeps clipping labels
                          mid-word. Long labels wrap to a second line instead so the
                          full name is always readable; the badge still sits beside
                          the first line since both are top-aligned (items-start). */}
                      <span className="flex items-start gap-2 min-w-0 flex-1">
                        <span
                          aria-hidden="true"
                          className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px]"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span className="break-words leading-snug">{link.label}</span>
                      </span>
                      <ChangeBadge direction={link.direction} pctDisplay={link.pctDisplay} />
                      <HoverChevron />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Anchor nav (about page) ── */}
        {anchorLinks.length > 0 && (
          <>
            <div className="border-t border-gray-200 mb-4" />
            <div className="flex flex-col gap-px mb-2">
              <SectionLabel>Jump to</SectionLabel>
              {anchorLinks.map(({ id, label }) => (
                <TextLink
                  key={id}
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {label}
                </TextLink>
              ))}
            </div>
          </>
        )}

        {/* ── Language ── */}
        <div className="border-t border-gray-200 mt-4 pt-[14px] pl-1">
          <SectionLabel>Language</SectionLabel>
          <LanguageToggle className="sidebar-lang-select" showIcon={false} />
        </div>

        {/* ── Last updated — same bottom position on every page, including home ── */}
        {uploadDate && (
          <div className="mt-5 pt-3 pl-1 border-t border-gray-300 text-xs text-gray-600 leading-snug">
            Last updated<br />
            <span className="font-semibold">{formatDate(uploadDate)}</span>
          </div>
        )}
      </aside>

      {/* Preview portal — only mounted on hover-capable devices */}
      {canHover && (
        <JumpToPreview
          activeHref={activeHref}
          activeLabel={activeLabel}
          activeLinkMeta={activeLinkMeta}
          anchorEl={anchorEl}
        />
      )}
    </>
  );
};

PageSidebar.propTypes = {
  activeVirus:    PropTypes.string,
  onVirusChange:  PropTypes.func,
  dataType:       PropTypes.string,
  onDataTypeChange: PropTypes.func,
  view:           PropTypes.string,
  onViewChange:   PropTypes.func,
  controls: PropTypes.shape({
    virusToggle:   PropTypes.bool,
    dataTypeToggle: PropTypes.bool,
    viewToggle:    PropTypes.bool,
  }),
  uploadDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  updateNote: PropTypes.string,
  anchorLinks: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })),
};

export default PageSidebar;
