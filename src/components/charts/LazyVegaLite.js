// LazyVegaLite — code-split wrapper around react-vega's <VegaLite>.
//
// PERF (2026-09-29): react-vega pulls in vega + vega-lite + vega-embed,
// which is the bulk of this site's JavaScript. Importing it statically put
// all of that on the critical path of every page, so headers, text and stat
// numbers couldn't paint until the whole charting stack had downloaded and
// parsed. Loading it through next/dynamic moves it into its own chunk that
// is fetched in parallel after first paint (and is shared/cached across
// pages). ssr:false because Vega renders client-only anyway.
import dynamic from "next/dynamic";

const LazyVegaLite = dynamic(
  () => import("react-vega").then((m) => m.VegaLite),
  { ssr: false, loading: () => null }
);

export default LazyVegaLite;
