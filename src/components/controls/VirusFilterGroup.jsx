import React from "react";
import PropTypes from "prop-types";
import VirusFilterButton from "./VirusFilterButton";
import { virusAccentColors } from "../../styles/tokens";

// "virus-filter-group" is a marker class — FloatingTogglePill.css targets
// .floating-pill .pill-dropdown .pill-section .virus-filter-group

export const virusOptions = [
  { label: "COVID-19" },
  { label: "Flu" },
  { label: "RSV" },
];

const VirusFilterGroup = ({ activeVirus, onChange }) => {
  return (
    <div
      role="group"
      aria-label="Filter by virus"
      className="virus-filter-group flex flex-row gap-lg justify-start flex-nowrap max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:my-[10px] max-sm:w-full"
    >
      {virusOptions.map(({ label }) => (
        <VirusFilterButton
          key={label}
          label={label}
          accentColor={virusAccentColors[label]}
          active={activeVirus === label}
          onClick={() => onChange(label)}
        />
      ))}
    </div>
  );
};

VirusFilterGroup.propTypes = {
  activeVirus: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default VirusFilterGroup;
