// src/components/maps/useGeoWeeks.js
//
// Week handling for the neighborhood maps' season time-lapse (added
// 2026-09-29).
//
// RPU's staged "by neighborhood" rows currently cover a single week
// (2026-08-15), so `weeks.length` is 1 and the time-lapse control stays
// hidden (see TimelapseControl). As soon as the files carry 2+ weeks of
// neighborhood rows, the play button appears on its own — no code change.
//
// This also fixes a latent multi-week bug: buildUhfMetricMap keeps the LAST
// matching row per geocode in file order, so a multi-week file would have
// silently shown whichever week happened to be listed last rather than the
// latest one. The map now always builds from exactly one week's rows
// (`rowsForWeek`), defaulting to the most recent.

import { useEffect, useMemo, useState } from "react";

const STEP_MS = 900;

const dateKey = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * @param {object[]} rows - Parsed CSV rows (loadCSVData output).
 * @param {string[]} metricNames - The "by neighborhood" metrics this map uses.
 */
export default function useGeoWeeks(rows, metricNames) {
  const metricKey = metricNames.join("|");

  const { weeks, dateByKey } = useMemo(() => {
    const set = new Set(metricKey.split("|"));
    const byKey = new Map();
    for (const r of rows) {
      if (!set.has(r.metric)) continue;
      const k = dateKey(r.date);
      if (k && !byKey.has(k)) byKey.set(k, r.date);
    }
    return { weeks: [...byKey.keys()].sort(), dateByKey: byKey };
  }, [rows, metricKey]);

  // null = "latest week" (the default view, and what the map snaps back to
  // whenever the week list changes, e.g. switching virus).
  const [index, setIndex] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(null);
    setPlaying(false);
  }, [weeks.length, metricKey]);

  const lastIndex = weeks.length - 1;
  const currentIndex = index ?? lastIndex;
  const currentKey = weeks[currentIndex] ?? null;
  const currentDate = currentKey ? dateByKey.get(currentKey) : null;

  // Advance one week per tick; stop on the latest week.
  useEffect(() => {
    if (!playing) return;
    if (currentIndex >= lastIndex) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex(currentIndex + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, currentIndex, lastIndex]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    // Starting from the end (the default view) replays from the first week.
    if (currentIndex >= lastIndex) setIndex(0);
    setPlaying(true);
  };

  const seek = (i) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(lastIndex, i)));
  };

  // This map's metrics filtered to the displayed week; every other row is
  // passed through untouched (buildUhfDataByGeocode ignores them anyway).
  const rowsForWeek = useMemo(() => {
    if (weeks.length <= 1 || !currentKey) return rows;
    const set = new Set(metricKey.split("|"));
    return rows.filter((r) => !set.has(r.metric) || dateKey(r.date) === currentKey);
  }, [rows, weeks.length, currentKey, metricKey]);

  // All values of one metric across every week — so the color scale can be
  // fixed for the whole season while animating (otherwise the same color
  // would mean a different value each frame).
  const allValuesFor = (metric) =>
    rows.filter((r) => r.metric === metric && r.valueNum != null).map((r) => r.valueNum);

  return {
    weeks,
    hasTimeline: weeks.length > 1,
    currentIndex,
    currentDate,
    isLatest: currentIndex === lastIndex,
    playing,
    togglePlay,
    seek,
    rowsForWeek,
    allValuesFor,
    dateForIndex: (i) => dateByKey.get(weeks[i]) ?? null,
  };
}
