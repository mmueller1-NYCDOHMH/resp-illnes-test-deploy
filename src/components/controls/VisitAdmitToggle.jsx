import React from "react";
import PropTypes from "prop-types";

// "view-toggle" is a marker class — FloatingTogglePill.css targets
// .pill-section .data-type-toggle-group .view-toggle

const btnBase = [
  "view-toggle flex-1 text-center border-0 rounded-md cursor-pointer",
  "py-sm px-lg text-md font-medium font-body",
  "transition-[background,transform] duration-200",
  "hover:bg-gray-800 hover:text-white",
].join(" ");

const ViewToggleGroup = ({ activeView, onChange }) => {
  return (
    <div className="flex gap-md justify-end w-full max-w-[340px] md:justify-stretch md:max-w-none md:gap-2">
      <button
        className={`${btnBase} ${activeView === "visits" ? "!bg-gray-900 !text-white" : "bg-gray-300 text-gray-900"}`}
        onClick={() => onChange("visits")}
      >
        Visits
      </button>
      <button
        className={`${btnBase} ${activeView === "hospitalizations" ? "!bg-gray-900 !text-white" : "bg-gray-300 text-gray-900"}`}
        onClick={() => onChange("hospitalizations")}
      >
        Hospitalizations
      </button>
    </div>
  );
};

ViewToggleGroup.propTypes = {
  activeView: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ViewToggleGroup;
