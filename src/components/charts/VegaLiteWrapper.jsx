import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext
} from "react";
import PropTypes from "prop-types";
import VegaLite from "./LazyVegaLite";
import { getVegaThemeConfig, mergeDeep } from "../../utils/vegaTheme";

import "./VegaLiteWrapper.css";
export const VegaThemeContext = createContext(false);

// PERF: stable default so `dynamicFields` doesn't change identity on every
// render (a fresh `{}` default re-ran the whole spec clone/merge each render).
const EMPTY_FIELDS = Object.freeze({});

// PERF: charts are only embedded once they come within this distance of the
// viewport. Pages carry 10+ Vega views; compiling them all up front blocked
// the main thread for seconds on load. Once mounted a chart stays mounted.
const LAZY_ROOT_MARGIN = "600px 0px";

// PERF: width changes after the first measurement are debounced so a burst
// of layout shifts (fonts loading, sidebar appearing, window drag-resize)
// triggers one re-embed instead of one per animation frame.
const RESIZE_DEBOUNCE_MS = 150;

// PERF: vega-tooltip is loaded alongside the lazy Vega chunk rather than in
// the initial page bundle. One shared promise for every chart on the page.
let tooltipModulePromise = null;
const loadTooltipHandler = () => {
  if (!tooltipModulePromise) {
    tooltipModulePromise = import("vega-tooltip").then((m) => m.Handler);
  }
  return tooltipModulePromise;
};

const getInitialDark = () => {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

const VegaLiteWrapper = ({
  data,
  specTemplate,
  dynamicFields = EMPTY_FIELDS,
  rendererMode = "canvas",
  onNewView,
  actions = true
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDark, setIsDark] = useState(getInitialDark);
  const [isRendered, setIsRendered] = useState(false);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined"
  );

  const [TooltipHandler, setTooltipHandler] = useState(null);
  useEffect(() => {
    if (!inView || TooltipHandler) return;
    let cancelled = false;
    loadTooltipHandler().then((H) => {
      if (!cancelled) setTooltipHandler(() => H);
    });
    return () => { cancelled = true; };
  }, [inView, TooltipHandler]);

  /** Mount the Vega view only once the container nears the viewport */
  useEffect(() => {
    if (inView) return;
    const node = containerRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: LAZY_ROOT_MARGIN }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [inView]);

  /** Track container width with ResizeObserver (for responsive width) */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let rafId;
    let timerId;
    let hasWidth = false;
    const observer = new ResizeObserver((entries) => {
      const w = Math.round(entries[entries.length - 1]?.contentRect?.width || 0);
      if (w <= 0) return;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      if (!hasWidth) {
        // First measurement: apply right away so the chart can start rendering.
        hasWidth = true;
        rafId = requestAnimationFrame(() => setContainerWidth(w));
      } else {
        timerId = setTimeout(() => setContainerWidth(w), RESIZE_DEBOUNCE_MS);
      }
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      observer.disconnect();
    };
  }, []);

  /** Watch data-theme on <html> and flip dark mode */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const mo = new MutationObserver(() => {
      const theme = el.getAttribute("data-theme");
      if (theme === "dark") setIsDark(true);
      else if (theme === "light") setIsDark(false);
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  /** Fallback: adopt system preference if page hasn’t explicitly set data-theme */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (!attr) setIsDark(e.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  /** Build a concrete spec from the template + dynamic fields + current width */
  const finalSpec = useMemo(() => {
    // 1) Deep-clone and resolve {placeholders}
    const resolvedSpec = JSON.parse(
      JSON.stringify(specTemplate),
      (_, val) => {
        if (typeof val === "string" && val.startsWith("{") && val.endsWith("}")) {
          const key = val.slice(1, -1);
          if (key === "containerWidth") return containerWidth || 1;
          return dynamicFields[key] ?? val;
        }
        // Embedded placeholder inside a larger string — e.g. a Vega
        // expression like "min(36, {containerWidth} / 40)" used in a
        // `calculate` transform. Unlike the whole-string case above (which
        // can resolve to a non-string, such as the raw numeric
        // containerWidth), this always stays a string since it's part of a
        // larger expression.
        if (typeof val === "string" && val.includes("{containerWidth}")) {
          return val.replaceAll("{containerWidth}", String(containerWidth || 1));
        }
        return val;
      }
    );

    // 2) Provide data, responsive width/height, and autosize defaults
    resolvedSpec.data = { values: Array.isArray(data) ? data : [] };
    resolvedSpec.width = Math.max(1, containerWidth);
    if (!resolvedSpec.height) resolvedSpec.height = 320;
    if (!resolvedSpec.autosize) {
      resolvedSpec.autosize = { type: "fit", contains: "padding", resize: true };
    }

    // 3) Compute theme (returns { background, config: { axis, legend, … } })
    const theme = getVegaThemeConfig(isDark ? "dark" : "light");

    // 4) Merge ORDER: spec first → theme last (theme should win for axis colors)
    let merged = mergeDeep(mergeDeep({}, resolvedSpec), theme);

    // 5) Ensure guide styles mirror axis colors in all Vega versions
    const axisLabel = merged.config?.axis?.labelColor;
    const axisTitle = merged.config?.axis?.titleColor;
    merged.config = merged.config || {};
    merged.config.style = {
      ...(merged.config.style || {}),
      "guide-label": {
        ...(merged.config.style?.["guide-label"] || {}),
        ...(axisLabel ? { fill: axisLabel } : {}),
      },
      "guide-title": {
        ...(merged.config.style?.["guide-title"] || {}),
        ...(axisTitle ? { fill: axisTitle } : {}),
      },
    };

    return merged;
  }, [data, specTemplate, dynamicFields, containerWidth, isDark]);

  /** Force a full re-embed on width/height/theme changes */
  const embedKey = `w_${containerWidth}_${finalSpec?.height}_${isDark ? "d" : "l"}`;

  /** Reset rendered state on re-embed so skeleton shows during transitions */
  useEffect(() => { setIsRendered(false); }, [embedKey]);

  /** Hide tooltip helper */
  const hideTooltip = React.useCallback(() => {
    const el = document.getElementById("vg-tooltip-element");
    // Skip the style write when already hidden — every chart on the page
    // runs this on every scroll event.
    if (el && el.style.display !== "none") el.style.display = "none";
  }, []);

  /** Global listeners to dismiss tooltip on outside tap/scroll/escape */
  useEffect(() => {
    const onDocPointerDown = (e) => {
      const node = containerRef.current;
      if (!node) return;
      if (!node.contains(e.target)) hideTooltip();
    };
    const onKeyDown = (e) => { if (e.key === "Escape") hideTooltip(); };
    const onScroll = () => hideTooltip();

    document.addEventListener("pointerdown", onDocPointerDown, true); // capture outside first
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hideTooltip);
    window.addEventListener("orientationchange", hideTooltip);
    document.addEventListener("visibilitychange", hideTooltip);

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hideTooltip);
      window.removeEventListener("orientationchange", hideTooltip);
      document.removeEventListener("visibilitychange", hideTooltip);
    };
  }, [hideTooltip]);

  /** vega-tooltip with mobile-friendly positioning (center + clamp) */
  const tooltip = useMemo(() => {
    if (!TooltipHandler) return undefined;
    const base = new TooltipHandler({
      theme: isDark ? "dark" : "light",
      offsetX: 0,
      offsetY: 12,
      style: {
        maxWidth: "min(320px, 92vw)",
        fontSize: "12px",
        lineHeight: "1.35",
        padding: "8px 10px",
      },
    });
    const call = base.call;

    return (handler, event, item, value) => {
      call(handler, event, item, value);
      // Reposition + ensure visible
      requestAnimationFrame(() => {
        const el = document.getElementById("vg-tooltip-element");
        if (!el || !event) return;

        // Re-show if a previous tap hid it
        el.style.display = "block";
        el.style.position = "fixed";

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = el.getBoundingClientRect();

        // Center under the touch/cursor with 12px offset
        const gutter = 8;
        let left = Math.round((event.clientX ?? 0) - rect.width / 2);
        let top  = Math.round((event.clientY ?? 0) + 12);

        // Clamp to viewport
        left = Math.max(gutter, Math.min(left, vw - rect.width - gutter));
        top  = Math.max(gutter, Math.min(top,  vh - rect.height - gutter));

        el.style.left = `${left}px`;
        el.style.top  = `${top}px`;
      });
    };
  }, [isDark, TooltipHandler]);

  const onError = (err) => {
    console.error("Vega error:", err);
  };

  return (
    <VegaThemeContext.Provider value={isDark}>
      <div
        ref={containerRef}
        className="vega-lite-wrapper"
        style={{
          width: "100%",
          minWidth: 0,
          position: "relative",
          // Reserve the chart's height until Vega has drawn, so lazy
          // loading doesn't shift the content below it.
          minHeight: isRendered ? undefined : finalSpec?.height || 200,
        }}
        onPointerDownCapture={hideTooltip}
      >
        {/* Shimmer skeleton while Vega initialises */}
        {containerWidth > 0 && !isRendered && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 6,
              background: "linear-gradient(90deg, var(--gray-200) 25%, var(--gray-300) 50%, var(--gray-200) 75%)",
              backgroundSize: "600px 100%",
              animation: "shimmer 1.4s ease-in-out infinite",
              zIndex: 1,
              minHeight: finalSpec?.height || 200,
            }}
          />
        )}
        {containerWidth > 0 && inView && tooltip ? (
          <VegaLite
            key={embedKey}
            spec={finalSpec}
            actions={actions}
            renderer={rendererMode}
            tooltip={tooltip}
            onError={onError}
            onNewView={(view) => {
              setIsRendered(true);
              onNewView?.(view);
            }}
          />
        ) : null}
      </div>
    </VegaThemeContext.Provider>
  );
};

VegaLiteWrapper.propTypes = {
  data: PropTypes.array.isRequired,
  specTemplate: PropTypes.object.isRequired,
  dynamicFields: PropTypes.object,
  rendererMode: PropTypes.oneOf(["canvas", "svg"]),
  onNewView: PropTypes.func,
  actions: PropTypes.bool,
};

export default VegaLiteWrapper;
