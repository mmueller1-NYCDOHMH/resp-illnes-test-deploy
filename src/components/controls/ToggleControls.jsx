import React from "react";
import PropTypes from "prop-types";

// Active color defaults to gray-900 (no virus accent on overview page).
// toggle-controls / toggle-button class names are kept — ChartContainer.css
// targets them with cross-component selectors in stack-sidebar mode.

const BTN_BASE = "toggle-button appearance-none border-0 py-[0.45rem] px-[0.8rem] cursor-pointer text-sm font-semibold leading-tight outline-none transition-[background-color,color] duration-150 focus:outline-none focus-visible:relative focus-visible:z-[1] focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-[var(--chart-toggle-active-color,#1f2937)]";
const BTN_ACTIVE = "bg-[var(--chart-toggle-active-color,#1f2937)] text-white";
const BTN_IDLE   = "bg-transparent text-[var(--gray-700)] hover:bg-[var(--gray-100)]";

const ToggleControls = ({ data, view, onToggle }) => {
  const handleToggle = (type) => {
    if (onToggle && type !== view) onToggle(type);
  };

  return (
    <div
      className="toggle-controls inline-flex border border-[var(--gray-300)] rounded-full overflow-hidden bg-white"
      role="group"
      aria-label="Toggle between visits and hospitalizations"
      style={{ "--chart-toggle-active-color": "var(--gray-900, #1f2937)" }}
    >
      <button
        type="button"
        className={`${BTN_BASE} ${view === "visits" ? BTN_ACTIVE : BTN_IDLE}`}
        onClick={() => handleToggle("visits")}
        aria-pressed={view === "visits"}
      >
        Visits
      </button>
      <button
        type="button"
        className={`${BTN_BASE} ${view === "hospitalizations" ? BTN_ACTIVE : BTN_IDLE}`}
        onClick={() => handleToggle("hospitalizations")}
        aria-pressed={view === "hospitalizations"}
      >
        Hospitalizations
      </button>
    </div>
  );
};

ToggleControls.propTypes = {
  data:     PropTypes.array.isRequired,
  view:     PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ToggleControls;
