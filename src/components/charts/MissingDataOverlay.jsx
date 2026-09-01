import React from "react";
import PropTypes from "prop-types";

/**
 * MissingDataOverlay
 *
 * Sits on top of a chart (absolute, covers the chart body) and replaces the
 * visual data with an explanation once missing race/ethnicity data crosses
 * a reliability threshold (see footnoteUtils.shouldShowMissingDataOverlay).
 * The chart still mounts underneath (kept aria-hidden) so layout height is
 * preserved; sighted + AT users both get this message instead of the chart
 * or its accessible table.
 */
const MissingDataOverlay = ({ virus, unknownPct, metricLabel = "cases" }) => (
  <div
    role="note"
    aria-label={`${virus} ${metricLabel} by race and ethnicity — data not shown`}
    className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/93 backdrop-blur-[2px] p-md"
  >
    <div className="max-w-[420px] text-center bg-white border border-gray-200 rounded-lg shadow-sm px-lg py-lg">
      <div
        aria-hidden="true"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-muted/15 text-orange-text mx-auto mb-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-900 m-0 mb-xs">
        Data not shown
      </p>
      <p className="text-sm text-gray-700 leading-relaxed m-0">
        <span className="bg-highlight">{unknownPct}%</span> of {virus} {metricLabel} during this period were missing race and ethnicity information — too high to show by group. This chart will return once more complete data is available.
      </p>
    </div>
  </div>
);

MissingDataOverlay.propTypes = {
  virus: PropTypes.string.isRequired,
  unknownPct: PropTypes.number.isRequired,
  metricLabel: PropTypes.string,
};

export default MissingDataOverlay;
