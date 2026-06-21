import React from "react";
import PropTypes from "prop-types";
import DataTypeToggleGroup from "../controls/DataTypeToggleGroup";
import ViewToggleGroup from "../controls/VisitAdmitToggle";
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
          <DataTypeToggleGroup
            options={dataTypeOptions}
            activeType={dataType}
            onChange={onDataTypeChange}
          />
        </div>
      )}

      {viewToggle && dataType === "ed" && (
        <div className="flex flex-col gap-xs min-w-0">
          <span className="sr-only">Choose Between</span>
          <ViewToggleGroup activeView={view} onChange={onViewChange} />
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
