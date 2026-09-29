/**
 * TimelapseControl
 *
 * Play/pause + week scrubber overlaid on the bottom-left of a neighborhood
 * map (added 2026-09-29). Driven by useGeoWeeks — renders nothing until the
 * data has at least two weeks of neighborhood rows, so today (one staged
 * week) it stays hidden and turns itself on once RPU ships more.
 *
 * Keyboard: the play button and the range input are both native controls,
 * so Tab / Space / arrow keys work without extra wiring. The week label is
 * a polite live region so screen readers hear the week change while
 * playing.
 */
import React from "react";
import PropTypes from "prop-types";
import { formatShortDate } from "../../utils/trendUtils";

export default function TimelapseControl({ timeline, accent = "#1E40AF", idPrefix = "map" }) {
  if (!timeline?.hasTimeline) return null;
  const { weeks, currentIndex, currentDate, playing, togglePlay, seek, dateForIndex, isLatest } = timeline;
  const first = dateForIndex(0);
  const label = currentDate ? formatShortDate(currentDate) : "";

  return (
    <div
      className="absolute bottom-2 left-2 right-14 sm:right-auto sm:w-[340px] bg-white/95 rounded-md border border-[var(--gray-200)] shadow-sm px-2 py-1.5 flex items-center gap-2"
      style={{ zIndex: 1000 }}
      role="group"
      aria-label="Season time-lapse"
    >
      <button
        type="button"
        onClick={togglePlay}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer border-0 transition-transform duration-150 hover:scale-105"
        style={{ backgroundColor: accent }}
        aria-label={playing ? "Pause time-lapse" : isLatest ? "Play season time-lapse from the first week" : "Resume time-lapse"}
        title={playing ? "Pause" : "Play the season week by week"}
      >
        {playing ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="1" y="1" width="3" height="8" fill="currentColor" />
            <rect x="6" y="1" width="3" height="8" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <label htmlFor={`${idPrefix}-timelapse-range`} className="sr-only">
          Week shown on map
        </label>
        <input
          id={`${idPrefix}-timelapse-range`}
          type="range"
          min={0}
          max={weeks.length - 1}
          step={1}
          value={currentIndex}
          onChange={(e) => seek(Number(e.target.value))}
          aria-valuetext={`Week ending ${label}`}
          className="w-full h-1 cursor-pointer"
          style={{ accentColor: accent }}
        />
        <div className="flex justify-between items-baseline gap-2 mt-0.5">
          <span className="text-2xs font-body text-[var(--gray-500)] truncate">
            {first ? formatShortDate(first) : ""}
          </span>
          <span
            className="text-2xs font-semibold font-body text-[var(--gray-800)] tabular-nums whitespace-nowrap"
            aria-live="polite"
          >
            Week ending {label}
            {isLatest ? " (latest)" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

TimelapseControl.propTypes = {
  timeline: PropTypes.object,
  accent: PropTypes.string,
  idPrefix: PropTypes.string,
};
