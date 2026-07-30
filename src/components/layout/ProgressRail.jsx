/**
 * ProgressRail
 *
 * A vertical scrubber that lives on the right edge of the sidebar column.
 * – A thin track line spans 15 %–85 % of the viewport height.
 * – A fill line advances as the user scrolls.
 * – One dot per section, pinned proportionally based on the section's
 *   offsetTop relative to total page height.
 * – Hovering a dot shows a tooltip label; clicking scrolls to the section.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
// Rail occupies this slice of the viewport (gives breathing room top/bottom)
const RAIL_TOP  = 15; // vh
const RAIL_BOT  = 85; // vh
const RAIL_SPAN = RAIL_BOT - RAIL_TOP; // 70 vh

// The dot's own box never changes size — hover/active states scale it via
// `transform` instead (see the dot's inline style below). Transform is
// compositor-only, so it can never perturb the wrapper's centering; sizing
// via width/height instead would force the wrapper's shrink-to-fit box (and
// therefore its `translateX(-50%)` centering anchor) to be recomputed on
// every frame of the grow/shrink transition, which is what caused dots to
// visibly drift sideways as they grew.
const DOT_BASE_PX = 10;

const ProgressRail = ({ sectionLinks }) => {
  const [positions,  setPositions]  = useState([]); // { id, label, pct }
  const [scrollPct,  setScrollPct]  = useState(0);
  const [activeId,   setActiveId]   = useState(null);
  const [hoveredId,  setHoveredId]  = useState(null);
  const [pulsingId,  setPulsingId]  = useState(null);
  const prevActiveRef = useRef(null);
  const footerHeightRef = useRef(0);
  const scrollRafRef = useRef(null);

  // Stable key — lets effects diff cheaply
  const sectionKey = sectionLinks.map((s) => s.id).join(",");

  // ── Helpers ─────────────────────────────────────────────────────────────
  // Exclude footer height so rail calculations are bounded to content area,
  // preventing the track/fill from visually overlapping the footer on shorter
  // pages (e.g. wastewater, which has only one chart section).
  // Measured once on mount/resize and cached in a ref — reading it from the
  // DOM on every scroll event (as this used to) is one of the two things
  // that made the rail feel jumpy; see the scroll effect below for the other.
  const measureFooterHeight = useCallback(() => {
    const footer = document.querySelector("footer");
    footerHeightRef.current = footer ? footer.offsetHeight : 0;
  }, []);

  // ── Position calculation ────────────────────────────────────────────────
  const recalcPositions = useCallback(() => {
    measureFooterHeight();
    const pageH = document.documentElement.scrollHeight - footerHeightRef.current;
    if (!pageH) return;
    setPositions(
      sectionLinks
        .map(({ id, label }) => {
          const el = document.getElementById(id);
          return el ? { id, label, pct: el.offsetTop / pageH } : null;
        })
        .filter(Boolean)
    );
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPositions([]);
    setActiveId(null);
    // Delay so sections are in the DOM after data load / animation
    const timer = setTimeout(recalcPositions, 500);
    window.addEventListener("resize", recalcPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalcPositions);
    };
  }, [recalcPositions]);

  // ── Scroll tracking ─────────────────────────────────────────────────────
  // Raw `scroll` events can fire many times per animation frame. Running the
  // section-offset scan and two setState calls on every single one raced
  // ahead of the browser's paint cycle and was the main cause of the fill
  // bar / active-dot jumpiness. Coalescing to a single rAF-scheduled update
  // per frame keeps it in step with paint instead of fighting it.
  useEffect(() => {
    const updateFromScroll = () => {
      scrollRafRef.current = null;
      const scrollY   = window.scrollY;
      const footerH   = footerHeightRef.current;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight - footerH;
      setScrollPct(maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0);

      // Active = last section whose top is above 35 % of the viewport
      let active = null;
      const threshold = scrollY + window.innerHeight * 0.35;
      for (const { id } of [...sectionLinks].reverse()) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= threshold) { active = id; break; }
      }
      setActiveId(active);
    };

    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(updateFromScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateFromScroll(); // seed on mount
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the URL hash in sync with the active section so Share copies a deep link.
  // Preserves existing search params (e.g. ?dataType=wastewater) when updating the hash.
  useEffect(() => {
    const { pathname, search } = window.location;
    if (activeId) {
      history.replaceState(null, "", `${pathname}${search}#${activeId}`);
    } else if (window.location.hash) {
      history.replaceState(null, "", `${pathname}${search}`);
    }
  }, [activeId]);

  // Pulse the dot whenever activeId changes to a new section
  useEffect(() => {
    if (activeId && activeId !== prevActiveRef.current) {
      setPulsingId(activeId);
      const t = setTimeout(() => setPulsingId(null), 600);
      prevActiveRef.current = activeId;
      return () => clearTimeout(t);
    }
  }, [activeId]);

  if (!positions.length) return null;

  const fillHeight = `${Math.min(scrollPct, 1) * RAIL_SPAN}vh`;

  return (
    /*
     * Outer: absolute, full sidebar column height.
     * -right-2 = -8px centres the rail on the sidebar's right border.
     */
    <div
      aria-hidden="true"
      className="absolute -right-2 top-0 bottom-0 w-4 pointer-events-none z-10"
    >
      {/* Inner: sticky, always fills the viewport */}
      <div className="sticky top-0 h-screen pointer-events-auto">

        {/* ── Track ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[var(--gray-200)] rounded-[1px]"
          style={{ top: `${RAIL_TOP}vh`, height: `${RAIL_SPAN}vh` }}
        />

        {/* ── Fill — height is dynamic, transition stays in style ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[var(--page-accent,var(--gray-500))] rounded-[1px]"
          style={{
            top:        `${RAIL_TOP}vh`,
            height:     fillHeight,
            transition: "height 80ms linear, background-color 300ms ease",
          }}
        />

        {/* ── Dots ── */}
        {positions.map(({ id, label, pct }) => {
          const isActive  = id === activeId;
          const isHovered = id === hoveredId;
          const topPos    = `${RAIL_TOP + pct * RAIL_SPAN}vh`;

          const scale = isActive ? 1 : isHovered ? 0.9 : 0.7;

          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              aria-label={`Jump to ${label}`}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[2] p-[6px] box-border rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ top: topPos, width: DOT_BASE_PX + 12, height: DOT_BASE_PX + 12 }}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(id)}
              onBlur={() => setHoveredId(null)}
              onClick={() =>
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {/* Dot — fixed box size; hover/active only ever scale it via
                  transform (color is still state-driven, kept in style) */}
              <div
                className={`rounded-full border-2 border-[var(--gray-100)] mx-auto${pulsingId === id ? " progress-dot-pulse" : ""}`}
                style={{
                  width:           `${DOT_BASE_PX}px`,
                  height:          `${DOT_BASE_PX}px`,
                  transform:       `scale(${scale})`,
                  backgroundColor: isActive  ? "var(--page-accent, var(--gray-900))"
                                 : isHovered ? "var(--gray-600)"
                                 :             "var(--gray-300)",
                  transition: "transform 150ms ease, background-color 300ms ease",
                }}
              />

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute right-[18px] top-1/2 -translate-y-1/2 bg-[var(--gray-900)] text-white py-1 px-[10px] rounded-md text-xs font-medium whitespace-nowrap pointer-events-none shadow-[0_2px_8px_rgba(0,0,0,0.2)] z-20">
                  {label}
                  {/* Arrow caret — CSS border trick, keep as style */}
                  <div
                    className="absolute -right-[5px] top-1/2 -translate-y-1/2"
                    style={{
                      borderTop:    "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderLeft:   "5px solid var(--gray-900)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

ProgressRail.propTypes = {
  sectionLinks: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })
  ).isRequired,
};

export default ProgressRail;
