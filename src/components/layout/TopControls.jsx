import React from "react";
import PropTypes from "prop-types";
import ToggleGroup from "../controls/ToggleGroup";
import VirusFilterGroup from "../controls/VirusFilterGroup";
import { getDataTypeOptions } from "../../utils/dataTypeOptions";

const TopControls = ({
  controls = {},
  activeVirus,
  onVirusChange,
  dataType,
  onDataTypeChange,
  view,
  onViewChange,
}) => {
  const { virusToggle, dataTypeToggle, viewToggle } = controls;

  const dataTypeOptions = getDataTypeOptions(activeVirus);

  return (
    <div className="flex flex-wrap gap-lg items-start w-full md:flex-col md:gap-md">
      {virusToggle && (
        <div className="flex flex-col gap-xs min-w-0">
          <span className="sr-only">Virus</span>
          <VirusFilterGroup activeVirus={activeVirus} onChange={onVirusChange} />
        </div>
      )}

      {dataTypeToggle && (
        <div className="flex flex-col gap-xs min-w-0 flex-1">
          <span className="sr-only">Data Type</span>
          <ToggleGroup
            options={dataTypeOptions}
            value={dataType}
            onChange={onDataTypeChange}
            ariaLabel="Data type"
            variant="solid"
          />
        </div>
      )}

      {viewToggle && dataType === "ed" && (
        <div className="flex flex-col gap-xs min-w-0">
          <span className="sr-only">Choose Between</span>
          <ToggleGroup
            options={[
              { label: "Visits", value: "visits" },
              { label: "Hospitalizations", value: "hospitalizations" },
            ]}
            value={view}
            onChange={onViewChange}
            ariaLabel="View"
            variant="stretch"
          />
        </div>
      )}
    </div>
  );
};

TopControls.propTypes = {
  controls: PropTypes.shape({
    virusToggle: PropTypes.bool,
    dataTypeToggle: PropTypes.bool,
    viewToggle: PropTypes.bool,
  }),
  activeVirus: PropTypes.string,
  onVirusChange: PropTypes.func,
  dataType: PropTypes.string,
  onDataTypeChange: PropTypes.func,
  view: PropTypes.string,
  onViewChange: PropTypes.func,
};

export default TopControls;
