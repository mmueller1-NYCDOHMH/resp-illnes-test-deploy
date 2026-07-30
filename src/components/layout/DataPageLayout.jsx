'use client';

import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { usePathname } from "next/navigation";
import useIsMobile from "../hooks/useIsMobile";
import { colorizeVirusInTitle } from "../../utils/virusText";
import { resolvePageHTML } from "../../utils/contentUtils";
import ProgressRail from "./ProgressRail";

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

// ── DataPageLayout ────────────────────────────────────────────────────────────
const DataPageLayout = ({
  title, subtitle, topControls, sidebar, info, children,
  titleVariables = {}, subtitleVariables = {},
  pageBackground = "gray", contentGap = "40px", contentMaxWidth = "1280px",
  headerBackground = null, sectionLinks = [], headerRight = null,
  titleInContent = false, showProgressRail = true,
}) => {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  // Close sheet on navigation
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  // No body scroll lock — the sheet is partial-height (72vh) and the backdrop
  // handles dismissal; overscrollBehavior:contain on the sheet prevents chaining.

  const close = useCallback(() => setSheetOpen(false), []);

  const renderedTitle =
    typeof title === "string"
      ? colorizeVirusInTitle(resolvePageHTML(title, titleVariables))
      : title;
  const renderedSubtitle =
    typeof subtitle === "string" ? resolvePageHTML(subtitle, subtitleVariables) : subtitle;

  return (
    <main className={`w-full ${pageBackground === "white" ? "bg-white" : "bg-[var(--gray-100)]"}`}>

      {/* ── Layout: sidebar + content ── */}
      <div className={`w-full ${pageBackground === "white" ? "bg-white" : "bg-[var(--gray-100)]"}`}>
        <div className="w-full max-w-[1280px] mx-auto flex flex-row items-stretch box-border">

          {/* ── Desktop sidebar (220px column) ── */}
          {sidebar && !isMobile && (
            <div className="relative flex-shrink-0 w-[220px] border-r border-[var(--gray-300)] bg-[var(--gray-100)] box-border">
              <div className="sticky top-[var(--header-h)] pt-6 px-2 pb-8">
                {sidebar}
              </div>
              {sectionLinks.length > 0 && showProgressRail && <ProgressRail sectionLinks={sectionLinks} />}
            </div>
          )}

          {/* Mobile sheet is portalled to document.body to escape any ancestor
              overflow/stacking-context constraints */}
          {sidebar && isMobile && sheetOpen && ReactDOM.createPortal(
            <>
              {/* Backdrop */}
              <div
                onClick={close}
                className="fixed inset-0 bg-black/[0.28] animate-[backdropIn_200ms_ease_both]"
                style={{ zIndex: 9998 }}
                aria-hidden="true"
              />
              {/* Sheet */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Filters and navigation"
                className="fixed bottom-0 left-0 right-0 bg-[var(--gray-100)] rounded-t-2xl border-t border-[var(--gray-300)] shadow-[0_-6px_32px_rgba(0,0,0,0.18)] max-h-[72vh] overflow-y-auto overscroll-contain animate-[sheetUp_280ms_cubic-bezier(0.4,0,0.2,1)_both]"
                style={{ zIndex: 9999, WebkitOverflowScrolling: "touch" }}
              >
                {/* Drag handle — tap to close */}
                <div
                  onClick={close}
                  className="flex justify-center pt-3 pb-1 cursor-pointer"
                  aria-hidden="true"
                >
                  <div className="w-9 h-1 rounded-sm bg-[var(--gray-400)]" />
                </div>
                <div className="px-4 pt-1 pb-12">
                  {sidebar}
                </div>
              </div>
            </>,
            document.body
          )}

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 overflow-clip box-border flex flex-col">

            {/* Sticky mobile "open filters" button — NavBar now lives in AppShell,
                directly under the site header, so it isn't rendered here anymore. */}
            {sidebar && isMobile && (
              <div className={`sticky top-[var(--header-h)] z-50 px-3 flex items-center gap-1`}>
                <button
                  onClick={() => setSheetOpen(true)}
                  aria-label="Open filters and navigation"
                  aria-expanded={sheetOpen}
                  className="flex items-center justify-center p-[7px] bg-white border border-[var(--gray-300)] shadow-sm cursor-pointer text-[var(--gray-700)] rounded-md flex-shrink-0"
                >
                  <SlidersIcon />
                </button>
              </div>
            )}

            {/* Page content — all sections share the same px-4 container */}
            <div
              className={`flex flex-col ${isMobile ? "pt-2 px-3 pb-8" : "pt-4 px-4 pb-8"}`}
              style={{ gap: contentGap }}
            >
              {/* ── Page header: title + subtitle — card-width like content sections ── */}
              {(!titleInContent || renderedSubtitle || topControls || info) && (
                <div
                  className={headerBackground ? "border border-black/[0.07] rounded-lg overflow-hidden" : "bg-white rounded-lg border border-[var(--gray-200)] shadow-sm overflow-hidden"}
                  style={headerBackground ? { background: headerBackground } : undefined}
                >
                  {/* Accent bar — blue by default, or the active virus's accent
                      color on pages that set --page-accent (only on the
                      default, non-custom-background header) */}
                  {!headerBackground && (
                    <div className="h-[5px]" style={{ backgroundColor: "var(--page-accent, var(--blue-primary))" }} />
                  )}
                  <div className="p-4">
                    {!titleInContent && (
                      typeof renderedTitle === "string" ? (
                        <h1
                          className="text-[clamp(18px,3vw,26px)] font-heading font-bold text-gray-900 mb-sm text-left tracking-tight w-full [overflow-wrap:break-word]"
                          dangerouslySetInnerHTML={{ __html: renderedTitle }}
                        />
                      ) : (
                        <h1 className="text-[clamp(18px,3vw,26px)] font-heading font-bold text-gray-900 mb-sm text-left tracking-tight w-full [overflow-wrap:break-word]">
                          {renderedTitle}
                        </h1>
                      )
                    )}
                    {(renderedSubtitle || headerRight) && (
                      <div className={`w-full ${headerRight ? "flex items-start gap-xl" : ""}`}>
                        {renderedSubtitle && (
                          typeof renderedSubtitle === "string" ? (
                            <div
                              className="body-links text-gray-700 font-body text-md font-normal leading-relaxed text-left flex-1 min-w-0 [overflow-wrap:break-word]"
                              dangerouslySetInnerHTML={{ __html: renderedSubtitle }}
                            />
                          ) : (
                            <div className="body-links text-gray-700 font-body text-md font-normal leading-relaxed text-left flex-1 min-w-0 [overflow-wrap:break-word]">
                              {renderedSubtitle}
                            </div>
                          )
                        )}
                        {headerRight && !isMobile && (
                          <div className="flex-shrink-0 w-56 text-md text-gray-700 leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-800">
                            {headerRight}
                          </div>
                        )}
                      </div>
                    )}
                    {topControls && (
                      <div className="mt-3">
                        <div className="flex flex-col min-[820px]:flex-row justify-between items-stretch min-[820px]:items-center gap-md flex-wrap">
                          {topControls}
                        </div>
                      </div>
                    )}
                    <div>{info}</div>
                  </div>
                </div>
              )}

              {titleInContent && (
                typeof renderedTitle === "string" ? (
                  <h1 className="text-[clamp(18px,3vw,26px)] font-heading font-bold text-gray-900 text-left tracking-tight" dangerouslySetInnerHTML={{ __html: renderedTitle }} />
                ) : (
                  <h1 className="text-[clamp(18px,3vw,26px)] font-heading font-bold text-gray-900 text-left tracking-tight">{renderedTitle}</h1>
                )
              )}

              {children}
            </div>
          </div>

        </div>
      </div>

      {/* ── Keyframes for mobile sheet animations ── */}
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </main>
  );
};

DataPageLayout.propTypes = {
  title:             PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle:          PropTypes.node,
  topControls:       PropTypes.node,
  sidebar:           PropTypes.node,
  info:              PropTypes.node,
  children:          PropTypes.node.isRequired,
  titleVariables:    PropTypes.object,
  subtitleVariables: PropTypes.object,
  pageBackground:    PropTypes.oneOf(["gray", "white"]),
  contentGap:        PropTypes.string,
  contentMaxWidth:   PropTypes.string,
  headerBackground:  PropTypes.string,
  sectionLinks:      PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })),
  headerRight:       PropTypes.node,
  showProgressRail:  PropTypes.bool,
};

export default DataPageLayout;
