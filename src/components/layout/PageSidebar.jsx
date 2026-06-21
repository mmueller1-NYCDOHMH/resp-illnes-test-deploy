'use client';

import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useRouter, usePathname } from "next/navigation";
import { virusOptions } from "../controls/VirusFilterGroup";
import { getThemeByTitle } from "../../utils/themeUtils";
import { formatDate } from "../../utils/trendUtils";
import { getDataTypeOptions } from "../../utils/dataTypeOptions";
import LanguageToggle from "../contentUtils/LanguageToggle";
import featuredLinks from "../../views/config/featuredLinks";
import JumpToPreview from "./JumpToPreview";

// ── Virus slug map ────────────────────────────────────────────────────────────
const VIRUS_SLUGS = {
  "COVID-19": "covid-19",
  "Flu":      "flu",
  "RSV":      "rsv",
};


// ── Shared sub-components ─────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-gray-600 px-1 mb-1">
    {children}
  </div>
);

const PillButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "w-full px-3 py-[9px] rounded-full border-none cursor-pointer text-[15px] text-left whitespace-nowrap",
      "transition-[background,color] duration-150 box-border",
      isActive
        ? "bg-gray-900 text-white font-semibold"
        : "bg-transparent text-gray-700 font-normal hover:bg-gray-300 hover:text-gray-900",
    ].join(" ")}
  >
    {children}
  </button>
);

const SubNavButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "w-full px-[10px] py-[6px] border-none cursor-pointer text-sm text-left",
      "transition-[border-color,color,background] duration-150 box-border",
      isActive
        ? "border-l-2 border-gray-900 text-gray-900 font-semibold bg-transparent"
        : "border-l-2 border-gray-300 text-gray-500 font-normal hover:bg-gray-200",
    ].join(" ")}
  >
    {children}
  </button>
);

const DataTypeButton = ({ isActive, isFirst, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "w-full px-3 py-2 border-none cursor-pointer text-sm text-left font-body",
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
  const [activeHref, setActiveHref]   = useState(null);
  const [activeLabel, setActiveLabel] = useState(null);
  const [anchorEl, setAnchorEl]       = useState(null);

  useEffect(() => {
    setCanHover(
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  }, []);

  const handleLinkEnter = useCallback((href, label, e) => {
    setActiveHref(href);
    setActiveLabel(label);
    setAnchorEl(e.currentTarget);
  }, []);

  const handleLinkLeave = useCallback(() => {
    setActiveHref(null);
    setActiveLabel(null);
    setAnchorEl(null);
  }, []);

  return (
    <>
      <aside className="flex flex-col gap-1 w-full">

        {/* ── Update note + last updated — home page top ── */}
        {(updateNote || uploadDate) && activePage === "home" && (
          <div className="text-base text-gray-600 leading-snug pl-1 pb-[14px] mb-1 border-b border-gray-200">
            {updateNote && (
              <p
                className="mt-0 mb-[6px]"
                dangerouslySetInnerHTML={{ __html: updateNote }}
              />
            )}
            {uploadDate && (
              <p className="m-0">
                Last updated: <strong>{formatDate(uploadDate)}</strong>
              </p>
            )}
          </div>
        )}

        {/* ── Virus buttons — data pages only ── */}
        {virusToggle && (
          <>
            <div className="border-t border-gray-200 mb-4" />
            <div className="flex flex-col gap-[2px] mb-4">
              <SectionLabel>Virus</SectionLabel>
              {virusOptions.map(({ label, icon }) => {
                const theme    = getThemeByTitle(label);
                const isActive = activeVirus === label;
                const slug     = VIRUS_SLUGS[label];
                return (
                  <React.Fragment key={label}>
                    <PillButton isActive={isActive} onClick={() => onVirusChange(label)}>
                      <span className="inline-flex items-center gap-2 w-full">
                        <span
                          className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full flex-shrink-0"
                          style={{
                            background: isActive ? "rgba(255,255,255,0.15)" : theme.pillBackground,
                          }}
                        >
                          <img
                            src={icon}
                            alt=""
                            aria-hidden="true"
                            className="w-[13px] h-[13px]"
                            style={{ filter: "var(--img-on-light-filter, none)" }}
                          />
                        </span>
                        {label}
                      </span>
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
              {featuredLinks.map(({ label, href }) => (
                <div
                  key={href}
                  onMouseEnter={canHover ? (e) => handleLinkEnter(href, label, e) : undefined}
                  onMouseLeave={canHover ? handleLinkLeave : undefined}
                >
                  <TextLink onClick={() => router.push(href)}>
                    {label}
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

        {/* ── Last updated — data pages only (home page shows it at top) ── */}
        {uploadDate && activePage !== "home" && (
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
