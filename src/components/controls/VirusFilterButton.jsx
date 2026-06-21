import React from "react";
import PropTypes from "prop-types";

// "filter-button" is a marker class — FloatingTogglePill.css targets
// .floating-pill .pill-dropdown .pill-section .virus-filter-group .filter-button
// "virus-label" is a marker class used by FloatingTogglePill.css font-size override.
const VirusFilterButton = ({ label, icon, active, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={[
        "filter-button inline-flex items-center justify-center gap-2",
        "w-[140px] py-[12px] px-[24px] rounded-full",
        "bg-gray-300 text-gray-800 border-0 cursor-pointer",
        "font-body text-sm font-semibold transition-[background-color] duration-200 whitespace-nowrap",
        "hover:bg-gray-400 hover:shadow-sm",
        "focus-visible:outline-none",
        "active:translate-y-[0.5px]",
        // max-sm: = mobile only (<640px); sm: would wrongly apply to desktop
        "max-sm:w-[80%] max-sm:max-w-[80%] max-sm:h-[40px] max-sm:rounded-md",
        active ? "!bg-gray-900 !text-white" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        <img
          src={icon}
          alt={label}
          className="w-[18px] h-[18px] inline-block align-middle [filter:var(--img-on-light-filter)]"
        />
        <span className="virus-label">{label}</span>
      </span>
    </button>
  );
};

VirusFilterButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default VirusFilterButton;
