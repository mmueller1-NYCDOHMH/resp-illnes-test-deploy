// src/utils/rankFeaturedLinks.js
//
// Ranks the "Jump to" links on the home page by how much each metric has
// moved week-over-week, instead of showing a hand-picked static list.
//
// Candidate metrics live in trackableMetrics.json (one entry per virus /
// data-type combo that has a valid deep-link on a /data page). Each data
// file backing those metrics is fetched once (shared cache via loadCSVData),
// then every candidate's latest two weeks are compared using the same
// WoW %-change math the rest of the site already uses (trendUtils), so the
// ranking is consistent with the trend arrows/chips shown elsewhere.

import { loadCSVData } from "./loadCSVData";
import {
  getWoWPercentChange,
  getTrendDirection,
  formatPercentChange,
  getLastTwoValuesSameSeries,
  classifyAbsoluteChange,
} from "./trendUtils";
import trackableMetrics from "../views/config/trackableMetrics.json";
import { DATA_PATHS } from "../views/config/Data.config";

// Same live GitHub-sourced URLs every data page loads through
// loadConfigWithData → DATA_PATHS (see Data.config.js). Using the identical
// URL here means this ranking shares loadCSVData's in-memory cache with the
// rest of the app — one fetch, not a second copy of the data.
export function resolveDataUrl(entry) {
  if (!entry.dataType) return null;
  return DATA_PATHS[entry.dataType] || null;
}

// Series under these floors in BOTH of the last two weeks are excluded from
// ranking — at very low magnitude, a tiny absolute move registers as a huge
// relative % change but isn't a meaningful public-health signal.
//
// - MIN_RAW_VOLUME: for "Number" series (case/death counts). Weekly COVID-19
//   deaths, e.g., sit in the single/low-double digits with occasional blank
//   weeks — a move from 5 to 10 is real noise, not a trend.
// - MIN_PERCENT_POINT: for "Percent" series (ED visit rates, etc). RSV and
//   Flu ED visits often sit at 0.01–0.06% of all visits — going from 0.01%
//   to 0.02% is a "+100%" move on paper but is well below the reporting
//   noise floor. COVID-19/overall ED rates (0.3%+) clear this easily.
const MIN_RAW_VOLUME = 20;
const MIN_PERCENT_POINT = 0.2;

// Ranking is recomputed at most once per browser session — the underlying
// data only updates weekly, so there's no need to refetch/recompute on
// every remount (e.g. navigating home → about → home).
let cachedRanked = null;

function filterSeries(rows, entry) {
  return rows.filter(
    (r) => r.metric === entry.metric && (!entry.submetric || r.submetric === entry.submetric)
  );
}

// Wastewater viral load is naturally much noisier week-to-week than clinical
// metrics — real single-week swings of 100%+ show up in the raw data (e.g.
// RSV going from ~1M to ~3.5M copies/mL between two consecutive weeks), which
// isn't a computation bug, but it dwarfs every other metric and dominates
// the ranking with numbers that look implausible. Wastewater guidance (NWSS)
// treats these series as noisy by design and reads them as short rolling
// trends rather than single-week deltas — so for pathogen-based entries we
// compare the average of the last 2 weeks against the average of the 2
// weeks before that, instead of a raw week-over-week comparison.
const WASTEWATER_SMOOTHING_WINDOW = 2;

function getSmoothedPercentChange(series, window = WASTEWATER_SMOOTHING_WINDOW) {
  const values = series.map((r) => Number(r.value)).filter(Number.isFinite);
  if (values.length < window * 2) return getWoWPercentChange(series);

  const avg = (arr) => arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const recentAvg = avg(values.slice(-window));
  const priorAvg = avg(values.slice(-window * 2, -window));

  if (priorAvg === 0) return recentAvg === 0 ? 0 : 100;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

function isLowVolume(series) {
  const isPercent = series.some((r) => r.display === "Percent");
  const floor = isPercent ? MIN_PERCENT_POINT : MIN_RAW_VOLUME;

  const lastTwo = series.slice(-2).map((r) => Number(r.value));
  return lastTwo.every((v) => Number.isFinite(v) && Math.abs(v) < floor);
}

function scoreEntry(entry, rowsByUrl) {
  const url = resolveDataUrl(entry);
  const rows = rowsByUrl[url] || [];
  const series = filterSeries(rows, entry);
  if (series.length < 2) return null;

  // Wastewater is noisier week-to-week than clinical metrics (see
  // getSmoothedPercentChange's comment) — smooth by dataType, not by the
  // now-removed `pathogen` field wastewater entries used to be keyed on.
  const pctChange =
    entry.dataType === "wastewater"
      ? getSmoothedPercentChange(series)
      : getWoWPercentChange(series);
  if (pctChange === null) return null;

  // ED rows are already percentages — call direction with the same absolute
  // percentage-point thresholds as the home stat grid and the ED data pages
  // (classifyAbsoluteChange), so a Quick Link can't show ▲ for a change the
  // rest of the site calls "stable". Magnitude/ranking still uses pctChange.
  let direction;
  if (entry.dataType === "ed") {
    const pair = getLastTwoValuesSameSeries(series, "value");
    direction = pair ? classifyAbsoluteChange(pair[0], pair[1], entry.metric)?.direction : null;
  } else {
    direction = getTrendDirection(pctChange);
  }
  if (!direction || direction === "same") return null; // not a "mover"

  if (isLowVolume(series)) return null;

  return {
    ...entry,
    pctChange,
    direction,
    pctDisplay: formatPercentChange(pctChange),
  };
}

/**
 * Returns the top `limit` trackable metrics, ranked by absolute WoW %
 * change (biggest movers first, regardless of direction). Entries with no
 * data file (e.g. the neighborhood map link), too little data, no real
 * change, or too little volume to be meaningful are excluded. Wastewater
 * entries are excluded outright from the home page's Quick Links list (an
 * editorial choice — the data itself now comes from the live GitHub feed
 * via DATA_PATHS.wastewater like everything else).
 */
// PERF: share one in-flight ranking so an early warm-up call (see
// ConfigDrivenPage) and the sidebar's own call don't each score the data.
let rankingPromise = null;

export function getRankedJumpLinks({ limit = 3 } = {}) {
  if (cachedRanked) return Promise.resolve(cachedRanked.slice(0, limit));
  if (!rankingPromise) {
    rankingPromise = computeRankedJumpLinks().finally(() => {
      rankingPromise = null;
    });
  }
  return rankingPromise.then((ranked) => ranked.slice(0, limit));
}

async function computeRankedJumpLinks() {

  const rankable = trackableMetrics.filter(
    (entry) => entry.dataType !== "wastewater" && resolveDataUrl(entry)
  );
  const dataUrls = [...new Set(rankable.map((entry) => resolveDataUrl(entry)))];

  const rowsByUrl = {};
  await Promise.all(
    dataUrls.map(async (url) => {
      rowsByUrl[url] = await loadCSVData(url);
    })
  );

  const ranked = rankable
    .map((entry) => scoreEntry(entry, rowsByUrl))
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  cachedRanked = ranked;
  return ranked;
}
