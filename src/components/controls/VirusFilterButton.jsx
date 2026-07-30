import React from "react";
import PropTypes from "prop-types";

// "filter-button" is a marker class — FloatingTogglePill.css targets
// .floating-pill .pill-dropdown .pill-section .virus-filter-group .filter-button
// "virus-label" is a marker class used by FloatingTogglePill.css font-size override.
//
// No icon artwork — virus identity is carried by color instead. The active
// state fills with the virus's own accent color (same value that drives
// --page-accent elsewhere: DataPageLayout's header bar, ProgressRail's
// active dot) instead of a generic dark gray, so selecting "COVID-19" here
// reads as the same purple used throughout that virus's page.
const VirusFilterButton = ({ label, accentColor, active, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        "filter-button inline-flex items-center justify-center gap-2",
        "w-[140px] py-[12px] px-[24px] rounded-full",
        "bg-gray-300 text-gray-800 border-0 cursor-pointer",
        "font-body text-sm font-semibold transition-[background-color] duration-200 whitespace-nowrap",
        "hover:bg-gray-400 hover:shadow-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        "active:translate-y-[0.5px]",
        // max-sm: = mobile only (<640px); sm: would wrongly apply to desktop
        "max-sm:w-[80%] max-sm:max-w-[80%] max-sm:h-[40px] max-sm:rounded-md",
        active ? "!text-white" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={active ? { backgroundColor: accentColor || "var(--gray-900)" } : undefined}
    >
      <span className="virus-label">{label}</span>
    </button>
  );
};

VirusFilterButton.propTypes = {
  label: PropTypes.string.isRequired,
  accentColor: PropTypes.string,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default VirusFilterButton;
