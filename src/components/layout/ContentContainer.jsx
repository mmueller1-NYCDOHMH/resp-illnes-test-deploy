// src/components/layout/ContentContainer.jsx
import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import InfoModal from "../popups/InfoModal";
import DownloadPanel from "../popups/DownloadPanel";
import { colorizeVirusInTitle } from "../../utils/virusText";




const resolveText = (input, vars = {}) => {
  if (typeof input !== "string") return input;

  return input.replace(/{(\w+)}/g, (_, key) => {
    let raw = vars[key];
    if (raw === null || raw === undefined || raw === "null" || raw === "undefined") {
      return "";
    }
    let val = String(raw).trim();

    // Force percent suffix for trend-like values
    if (key.toLowerCase().includes("trend") || key.toLowerCase().includes("percent")) {
      const isNumericNoPercent = /^[-+]?\d+(?:\.\d+)?$/.test(val);
      if (isNumericNoPercent) val = `${val}%`;
    }

    // Optional early wrap if the token name is date-ish
    if (key.toLowerCase() === "date" || key.toLowerCase() === "weekendingdate") {
      // If caller already provided markup, don't double wrap
      if (!/[<>]/.test(val)) {
        val = `<span class="bg-highlight dynamic-text">${val}</span>`;
      }
    }
    return val;
  });
};

const MONTHS =
  "(January|February|March|April|May|June|July|August|September|October|November|December)";
const DATE_RE = new RegExp(`\\b${MONTHS}\\s+\\d{1,2},\\s+\\d{4}\\b`);

function wrapFreeformDates(rootEl) {
  if (!rootEl) return;

  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (parent && (parent.classList.contains("bg-highlight") || parent.classList.contains("dynamic-text"))) {
        return NodeFilter.FILTER_REJECT;
      }
      return DATE_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  const toProcess = [];
  while (walker.nextNode()) toProcess.push(walker.currentNode);

  toProcess.forEach((textNode) => {
    const text = textNode.nodeValue;
    const replaced = text.replace(DATE_RE, (m) => `[[DATE_WRAP_START]]${m}[[DATE_WRAP_END]]`);
    if (replaced === text) return;

    const frag = document.createElement("span");
    frag.innerHTML = replaced
      .replace("[[DATE_WRAP_START]]", `<span class="bg-highlight dynamic-text">`)
      .replace("[[DATE_WRAP_END]]", `</span>`);

    const parent = textNode.parentNode;
    while (frag.firstChild) parent.insertBefore(frag.firstChild, textNode);
    parent.removeChild(textNode);
  });
}

/* -------------------------------------------------------------------------- */
/*                             CONTENT CONTAINER                               */
/* -------------------------------------------------------------------------- */

const ContentContainer = ({
  title,
  subtitle,
  subtitleVariables = {},
  titleVariables = {},
  children,
  className = "",
  background = "white",
  animateOnScroll = true,
  infoIcon = false,
  downloadIcon = false,
  modalTitle = "More Info",
  modalContent = null,
  downloadPreviewData = [],
  downloadColumnLabels = {},
  downloadDescription = "This will download a CSV of this chart’s currently visible data.",
  onDownloadClick = null,
  onDownloadPNG = null,
  onCopyImage = null,
  id = null,
}) => {
  const ref = useRef(null);
  const subtitleRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);




  /* ---------------------------- Fade-in on scroll ---------------------------- */
  useEffect(() => {
    if (!animateOnScroll) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );

    const node = ref.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [animateOnScroll]);

  /* ------------------------------- Title logic ------------------------------- */
  const isTitleString = typeof title === "string";
  const renderedTitleHTML = isTitleString
    ? colorizeVirusInTitle(resolveText(title, titleVariables))
    : null;
  const isDynamic = isTitleString && /{.+?}/.test(title);

  /* ------------------------------ Subtitle logic ----------------------------- */

  // ADD THIS — Detect React component subtitles (TrendSubtitle)
  const isNodeSubtitle = typeof subtitle !== "string";
  const isSubtitleString = typeof subtitle === "string";

  const renderedSubtitle = isNodeSubtitle
    ? subtitle
    : isSubtitleString
      ? resolveText(subtitle, subtitleVariables)
      : null;

  // Only run date-wrapping for STRING subtitles to avoid mutating TrendSubtitle DOM
  useEffect(() => {
    if (isNodeSubtitle) return; // do NOT wrap JSX subtitles
    const t = setTimeout(() => wrapFreeformDates(subtitleRef.current), 0);
    return () => clearTimeout(t);
  }, [renderedSubtitle, isNodeSubtitle]);

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER                                    */
  /* -------------------------------------------------------------------------- */

  // Background + padding variants
  const bgVariant = {
    white:       "bg-white rounded-lg border border-[var(--gray-200)] shadow-sm p-md px-lg",
    gray:        "bg-gray-100 rounded-lg p-lg",
    transparent: "bg-transparent",
  }[background] ?? "bg-white rounded-lg border border-[var(--gray-200)] shadow-sm p-md px-lg";

  return (
    <div
      ref={ref}
      id={id || undefined}
      className={[
        "w-full max-w-content mx-auto box-border mb-xl",
        bgVariant,
        animateOnScroll
          ? (isVisible ? "fade-in" : "opacity-0 translate-y-4 transition-[opacity,transform] duration-[600ms]")
          : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {/* ── Header: title + icons + subtitle ── */}
      {(title || renderedSubtitle) && (
        <div>
          {/* Title row */}
          <div className="flex justify-between items-center w-full gap-md mb-md">
            {/* Title */}
            {isTitleString ? (
              <h3
                className="text-[var(--content-title-size,var(--font-size-lg))] text-[var(--content-title-color,var(--gray-900))] font-semibold tracking-tight border-l-[3px] border-[var(--gray-300)] pl-sm m-0 flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: renderedTitleHTML }}
              />
            ) : (
              <h3 className="text-[var(--content-title-size,var(--font-size-lg))] text-[var(--content-title-color,var(--gray-900))] font-semibold tracking-tight border-l-[3px] border-[var(--gray-300)] pl-sm m-0 flex-1 min-w-0">
                {title}
              </h3>
            )}

            {/* Icon buttons */}
            <div className="flex flex-row items-center gap-sm flex-shrink-0">
              {infoIcon && (
                <div className="relative group flex items-center">
                  <button
                    type="button"
                    className="appearance-none bg-transparent border-0 p-0 leading-none cursor-pointer inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded-[6px] text-gray-900 hover:text-gray-600 transition-colors duration-150"
                    aria-label="More info about this section"
                    aria-haspopup="dialog"
                    aria-expanded={isModalOpen}
                    aria-controls="info-modal"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="9" cy="6" r="1" fill="currentColor"/>
                      <line x1="9" y1="9" x2="9" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                      More info
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
              )}

              {downloadIcon && (
                <div className="relative group hidden sm:flex items-center">
                  <button
                    type="button"
                    className="appearance-none bg-transparent border-0 p-0 leading-none cursor-pointer inline-flex items-center text-gray-900 hover:text-gray-600 transition-colors duration-150"
                    aria-label="Download data as CSV"
                    aria-haspopup="dialog"
                    aria-expanded={isDownloadModalOpen}
                    aria-controls="download-modal"
                    onClick={() => setIsDownloadModalOpen(true)}
                  >
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 3v8M6 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                      Download data
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Subtitle */}
          {renderedSubtitle && (
            isNodeSubtitle ? (
              <div ref={subtitleRef} className="text-[var(--content-subtitle-size,var(--font-size-md))] font-body text-[var(--content-subtitle-color,var(--gray-600))] m-0">
                {renderedSubtitle}
              </div>
            ) : (
              <div
                ref={subtitleRef}
                className="text-[var(--content-subtitle-size,var(--font-size-md))] font-body text-[var(--content-subtitle-color,var(--gray-600))] m-0"
                dangerouslySetInnerHTML={{ __html: renderedSubtitle }}
              />
            )
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div className="w-full p-0 box-border">{children}</div>

      {/* Info Modal */}
      {infoIcon && modalContent && (
        <InfoModal
          id="info-modal"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalTitle}
          content={modalContent}
        />
      )}

      {/* Download / Share Modal */}
      {downloadIcon && (
        <InfoModal
          id="download-modal"
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          title="Export &amp; Share"
          content={
            <DownloadPanel
              onConfirm={() => {
                onDownloadClick?.();
                setIsDownloadModalOpen(false);
              }}
              onDownloadPNG={
                onDownloadPNG
                  ? () => {
                      onDownloadPNG();
                      setIsDownloadModalOpen(false);
                    }
                  : null
              }
              onCopyImage={onCopyImage ?? null}
              sectionId={id ?? undefined}
              previewData={downloadPreviewData}
              columnLabels={downloadColumnLabels}
              description={downloadDescription}
            />
          }
        />
      )}
    </div>
  );
};

ContentContainer.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  subtitleVariables: PropTypes.object,
  titleVariables: PropTypes.object,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  background: PropTypes.oneOf(["white", "gray", "transparent"]),
  animateOnScroll: PropTypes.bool,
  infoIcon: PropTypes.bool,
  downloadIcon: PropTypes.bool,
  modalTitle: PropTypes.string,
  modalContent: PropTypes.node,
  downloadPreviewData: PropTypes.array,
  downloadColumnLabels: PropTypes.object,
  downloadDescription: PropTypes.string,
  onDownloadClick: PropTypes.func,
  onDownloadPNG: PropTypes.func,
  onCopyImage: PropTypes.func,
};

export default ContentContainer;
