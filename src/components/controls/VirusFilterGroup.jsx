import React from "react";
import PropTypes from "prop-types";
import VirusFilterButton from "./VirusFilterButton";
import { resolveAsset } from "../../utils/pathUtils";

// "virus-filter-group" is a marker class — FloatingTogglePill.css targets
// .floating-pill .pill-dropdown .pill-section .virus-filter-group

export const virusOptions = [
  { label: "COVID-19", icon: resolveAsset('assets/covid-vector.svg') },
  { label: "Flu", icon: resolveAsset('assets/flu-vector.svg') },
  { label: "RSV", icon: resolveAsset('assets/rsv-vector.svg') },
];

const VirusFilterGroup = ({ activeVirus, onChange }) => {
  return (
    <div className="virus-filter-group flex flex-row gap-lg justify-start flex-nowrap max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:my-[10px] max-sm:w-full">
      {virusOptions.map(({ label, icon }) => (
        <VirusFilterButton
          key={label}
          label={label}
          icon={icon}
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
