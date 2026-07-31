'use client';

import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useRouter, usePathname } from "next/navigation";
import { virusOptions } from "../controls/VirusFilterGroup";
import { getThemeByTitle } from "../../utils/themeUtils";
import { formatDate } from "../../utils/trendUtils";
import { getDataTypeOptions } from "../../utils/dataTypeOptions";
import LanguageToggle from "../contentUtils/LanguageToggle";
import featuredLinks from "../../views/config/featuredLinks.json";
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
              No border here — the section that follows (virus toggle or
              Jump to) supplies its own leading divider, so adding one here
              too would stack two HRs back to back. ── */}
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

        {/* ── Jump to (home page only) ── */}
        {activePage === "home" && (
          <>
            <div className="border-t border-gray-200 mb-4" />
            <div className="flex flex-col gap-px mb-4">
              <SectionLabel>Jump to</SectionLabel>
              {featuredLinks.map((link) => (
                <div
                  key={link.href}
                  onMouseEnter={canHover ? (e) => handleLinkEnter(link, e) : undefined}
                  onMouseLeave={canHover ? handleLinkLeave : undefined}
                >
                  <TextLink onClick={() => router.push(link.href)}>
                    {link.label}
                  </TextLink>
                </div>
              ))}
            </div>
          </>
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
            {formatDate(uploadDate)}
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
