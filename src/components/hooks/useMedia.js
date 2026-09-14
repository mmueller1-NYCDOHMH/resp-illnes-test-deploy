import React from "react";

/**
 * useMedia
 *
 * Reactive matchMedia hook, parameterized by an arbitrary media query
 * string (unlike useIsMobile.js's fixed 639px breakpoint) — used wherever
 * a chart needs a different/custom breakpoint (e.g. "(max-width: 590px)",
 * "(max-width: 770px)"). SSR-safe: falls back to `false` when `window`/
 * `matchMedia` aren't available, and only subscribes in the effect.
 *
 * Consolidated here 2026-09-14 — this exact hook was defined verbatim in
 * both LineChart.jsx and YearComparisonChart.jsx; both now import it from
 * here instead.
 */
const useMedia = (query) => {
  const get = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia !== "undefined" &&
    window.matchMedia(query).matches;

  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    setMatches(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
};

export default useMedia;
