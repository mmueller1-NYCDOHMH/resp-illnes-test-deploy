/**
 * MyAreaChip
 *
 * Small "Your area: Astoria" chip under the neighborhood search box on both
 * maps (added 2026-09-29 — see useMapSelectionMemory.js). Only renders once
 * someone has picked a neighborhood from the search box at least once.
 *
 *  - Viewing a different neighborhood → the chip is a button that jumps
 *    back to theirs.
 *  - Already viewing it → a quiet "Your area" badge.
 *  - × forgets it (clears the browser-stored value).
 */
import React from "react";
import PropTypes from "prop-types";

const HomeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2.5 7.2 8 2.5l5.5 4.7V13a.5.5 0 0 1-.5.5H9.75V10h-3.5v3.5H3a.5.5 0 0 1-.5-.5V7.2Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MyAreaChip({ myArea, selectedGeocode, onGo, onForget }) {
  if (!myArea) return null;
  const isCurrent = selectedGeocode === myArea.geocode;

  return (
    <span
      className={`inline-flex items-center max-w-full rounded-full border text-2xs font-body leading-none ${
        isCurrent
          ? "border-[var(--gray-300)] bg-[var(--gray-100)] text-[var(--gray-700)]"
          : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {isCurrent ? (
        <span className="inline-flex items-center gap-1 pl-2 py-1 min-w-0" title="Saved in this browser from your last search">
          <HomeIcon />
          <span className="truncate">Your area</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={onGo}
          className="inline-flex items-center gap-1 pl-2 py-1 min-w-0 cursor-pointer bg-transparent border-0 text-inherit hover:underline"
          title="Jump back to the neighborhood you last searched for"
        >
          <HomeIcon />
          <span className="truncate">
            Your area: <strong className="font-semibold">{myArea.name}</strong>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onForget}
        className="px-1.5 py-1 cursor-pointer bg-transparent border-0 text-inherit opacity-60 hover:opacity-100"
        aria-label={`Forget ${myArea.name} as your area`}
        title="Forget this neighborhood"
      >
        ×
      </button>
    </span>
  );
}

MyAreaChip.propTypes = {
  myArea: PropTypes.shape({ geocode: PropTypes.number, name: PropTypes.string }),
  selectedGeocode: PropTypes.number,
  onGo: PropTypes.func.isRequired,
  onForget: PropTypes.func.isRequired,
};
