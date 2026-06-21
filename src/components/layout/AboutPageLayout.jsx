import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import DataPageLayout from "./DataPageLayout";
import PageSidebar from "./PageSidebar";
import MarkdownCardSection from "../cards/MarkdownCardSection";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import { getText } from "../../utils/contentUtils";
import "./AboutPageLayout.css";

const resolveText = (input) =>
  typeof input === "string" && input.includes(".") ? getText(input) : input;

// ── Shared surface card ───────────────────────────────────────────────────────
const SurfaceCard = ({ id, children }) => (
  <div className="w-full max-w-content mx-auto mb-xl px-lg box-border md:px-md">
    <section
      id={id}
      className="about-surface bg-white rounded-lg shadow-md p-xl w-full box-border overflow-hidden"
    >
      {children}
    </section>
  </div>
);

// ── Chevron icon ──────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    className={`flex-shrink-0 transition-transform duration-200 ease ${open ? "rotate-180" : "rotate-0"}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Breadcrumb scroll tracker ─────────────────────────────────────────────────
// Fixed-position, self-contained. Reads scroll position to determine the active
// top-level section; accepts subLabel for the open accordion item within the
// data-group section.
const ScrollBreadcrumb = ({ sectionLinks, dataGroupId, subLabel }) => {
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      let found = null;
      for (const { id } of [...sectionLinks].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) {
          found = id;
          break;
        }
      }
      setActiveSectionId(found);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sectionLinks]);

  const activeSection = sectionLinks.find((s) => s.id === activeSectionId);
  const isDataGroup = activeSectionId === dataGroupId;
  const visible = scrolled && !!activeSection;

  const parent = isDataGroup && subLabel ? activeSection.label : null;
  const label = isDataGroup && subLabel ? subLabel : activeSection?.label;

  return (
    <div
      aria-hidden="true"
      className="scroll-breadcrumb fixed top-[112px] left-[calc(220px+28px)] right-7 z-[35] pointer-events-none flex items-center gap-[5px] transition-[opacity,transform] duration-200 ease"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-4px)",
      }}
    >
      <span className="text-[var(--gray-400)] text-xs">§</span>
      {parent && (
        <>
          <span className="text-[var(--gray-500)] text-xs">{parent}</span>
          <span className="text-[var(--gray-300)] text-[11px] mx-[1px]">›</span>
        </>
      )}
      {label && (
        <span className="text-[var(--gray-600)] text-xs font-medium">
          {label}
        </span>
      )}
    </div>
  );
};

// ── Main layout ───────────────────────────────────────────────────────────────
const AboutPageLayout = ({ config }) => {
  const { titleKey, subtitleKey, sections = [] } = config;

  // Data group items for accordion
  const dataGroup = sections.find((s) => s.renderAs === "paragraph-group");
  const dataItems = dataGroup?.items || [];

  // Accordion — single open, first item open by default
  const [openId, setOpenId] = useState(dataItems[0]?.id ?? null);
  const toggle = useCallback((id) => setOpenId((prev) => (prev === id ? null : id)), []);

  const openItem = dataItems.find((i) => i.id === openId);
  const openItemLabel = openItem ? resolveText(openItem.titleKey) : null;

  // Section links for ProgressRail + breadcrumb
  const sectionLinks = sections
    .filter((s) => s.renderAs !== "overview" && s.renderAs !== "hidden")
    .map((s) => ({
      id: s.id,
      label:
        (s.groupTitleKey && resolveText(s.groupTitleKey)) ||
        resolveText(s.titleKey) ||
        s.id,
    }));

  // Scroll-to-hash on load
  useEffect(() => {
    const id = window.location.hash.split("#").pop();
    if (!id || id === "about") return;
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }, []);

  const sidebar = (
    <PageSidebar controls={{ virusToggle: false, dataTypeToggle: false }} />
  );

  return (
    <DataPageLayout
      title={resolveText(titleKey)}
      subtitle={resolveText(subtitleKey)}
      sidebar={sidebar}
      sectionLinks={sectionLinks}
    >
      {/* Breadcrumb tracker — fixed, outside the scroll flow */}
      <ScrollBreadcrumb
        sectionLinks={sectionLinks}
        dataGroupId={dataGroup?.id}
        subLabel={openItemLabel}
      />

      <div className="py-xl px-xl font-body lg:py-xl lg:px-lg md:p-lg">
        {sections.map((section, idx) => {
          if (section.renderAs === "overview" || section.renderAs === "hidden") return null;

          const key = section.id || `sec-${idx}`;

          // ── Info cards ───────────────────────────────────────────────────
          if (section.renderAs === "cards") {
            return (
              <SurfaceCard key={key} id={key}>
                <MarkdownCardSection
                  title={resolveText(section.titleKey)}
                  sectionSubtitle={section.subtitle}
                  cards={section.cards || []}
                />
              </SurfaceCard>
            );
          }

          // ── Accordion (paragraph-group) ──────────────────────────────────
          if (section.renderAs === "paragraph-group") {
            const items = Array.isArray(section.items) ? section.items : [];
            if (!items.length) return null;
            const groupTitle = resolveText(section.groupTitleKey || section.titleKey);

            return (
              <SurfaceCard key={key} id={key}>
                {groupTitle && (
                  <h2 className="text-[clamp(1.3rem,1.5rem+0.5vw,var(--font-size-xl))] font-bold leading-tight text-gray-900 mb-md">
                    {groupTitle}
                  </h2>
                )}

                <div className="max-w-[800px] mx-auto border-t border-[var(--gray-200)]">
                  {items.map((item) => {
                    const isOpen = openId === item.id;
                    const title = resolveText(item.titleKey);
                    return (
                      <div
                        key={item.id}
                        className="relative border-b border-[var(--gray-200)]"
                      >
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-[0_2px_2px_0] transition-[background] duration-200 ease"
                          style={{ background: isOpen ? "var(--blue-primary)" : "transparent" }}
                        />

                        <button
                          aria-expanded={isOpen}
                          aria-controls={`${item.id}-body`}
                          onClick={() => toggle(item.id)}
                          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--gray-100)"; }}
                          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = isOpen ? "rgba(30,64,175,0.04)" : "transparent"; }}
                          className="w-full flex items-center justify-between gap-3 py-[15px] pr-1 pl-4 border-0 rounded-[0_6px_6px_0] cursor-pointer text-left font-body text-[1.05rem] font-semibold transition-[color,background] duration-150"
                          style={{
                            background: isOpen ? "rgba(30,64,175,0.04)" : "transparent",
                            color: isOpen ? "var(--blue-primary)" : "var(--gray-700)",
                          }}
                        >
                          {title}
                          <ChevronIcon open={isOpen} />
                        </button>

                        {isOpen && (
                          <div
                            id={`${item.id}-body`}
                            role="region"
                            className="accordion-body pl-4 pb-5"
                          >
                            <MarkdownRenderer
                              filePath={item.markdownPath}
                              showTitle={false}
                              stripRenderDirectives={true}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SurfaceCard>
            );
          }

          // ── Single paragraph ─────────────────────────────────────────────
          if (section.renderAs === "paragraph") {
            return (
              <SurfaceCard key={key} id={key}>
                <div className="max-w-[800px]">
                  <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-4">
                    {resolveText(section.titleKey)}
                  </h2>
                  <MarkdownRenderer
                    filePath={section.markdownPath}
                    showTitle={false}
                    stripRenderDirectives={true}
                  />
                </div>
              </SurfaceCard>
            );
          }

          return null;
        })}
      </div>
    </DataPageLayout>
  );
};

AboutPageLayout.propTypes = {
  config: PropTypes.object.isRequired,
};

export default AboutPageLayout;
