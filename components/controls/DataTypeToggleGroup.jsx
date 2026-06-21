import React from "react";
import PropTypes from "prop-types";

// "data-type-toggle-group" and "view-toggle" kept as marker classes so
// FloatingTogglePill.css descendant selectors can still override them.

const btnBase = [
  "view-toggle whitespace-nowrap py-sm px-md text-center",
  "border-0 rounded-md text-md font-medium font-body cursor-pointer",
  "transition-[background,transform] duration-200",
  "hover:bg-gray-800 hover:text-white hover:shadow-sm",
  "md:w-full",
].join(" ");

const DataTypeToggleGroup = ({ options, activeType, onChange }) => (
  <div className="data-type-toggle-group flex gap-sm justify-start items-center flex-nowrap w-full overflow-x-auto md:flex-col md:items-stretch md:overflow-x-visible md:gap-2">
    {options.map(({ label, value }) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`${btnBase} ${activeType === value ? "active !bg-gray-900 !text-white" : "bg-gray-400 text-gray-900"}`}
      >
        {label}
      </button>
    ))}
  </div>
);

DataTypeToggleGroup.propTypes = {
  options:    PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.string })).isRequired,
  activeType: PropTypes.string.isRequired,
  onChange:   PropTypes.func.isRequired,
};

export default DataTypeToggleGroup;
