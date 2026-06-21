import React from "react";
import PropTypes from "prop-types";
import AccessibleTable from "../accessibility/AccessibleTable";
import { getText, interpolateTokens } from "../../utils/contentUtils";

import ChartFooter from "../charts/ChartFooter";
import "./ChartContainer.css"; // retains only: stack-sidebar cross-component overrides

const ChartContainer = ({
  title,
  subtitle,
  chart,
  sidebar,
  footer,
  footerVariables = {},
  stackSidebarAbove = false,
  altTableData,
  altTableColumns,
  altTableCaption,
  altTableSrOnly = true,
  altTableLabelledBy,
  altTableVariables = {},
  disableAltTable = false,
  uploadDate,
  footnote,
  onNewView,
}) => {

  const hasAltTable =
    !disableAltTable && Array.isArray(altTableData) && altTableData.length > 0;
const [resolvedMeta, setResolvedMeta] = React.useState(null);

const chartWithProps = React.cloneElement(chart, {
  uploadDate: chart.props.uploadDate ?? uploadDate,
  footnote: chart.props.footnote ?? footnote,
  onNewView,
  onResolveFootnote: setResolvedMeta, 
});

const scaleMode = resolvedMeta?.scaleMode || "independent";

const resolvedFootnote = resolvedMeta?.footnote ?? footnote;

const resolvedFooter =
  typeof footer === "object"
    ? interpolateTokens(getText(footer[scaleMode]), footerVariables)
    : footer;
    
    
  // CSS class kept for the cross-component `.chart-content.stack .chart-sidebar` overrides
  const layoutCls = stackSidebarAbove ? "chart-content stack" : "chart-content side";

  return (
    <div className="chart-container rounded-lg w-full max-w-content mx-auto box-border">
      {/* Chart + sidebar layout — class names drive ChartContainer.css stack/side rules */}
      <div className={`${layoutCls} flex w-full box-border ${stackSidebarAbove ? "flex-col gap-md" : "flex-row gap-lg"}`}>
        {sidebar && (
          <div className={`chart-sidebar ${stackSidebarAbove ? "w-full flex-none mb-md" : "flex-[0_0_120px]"}`}>
            {sidebar}
          </div>
        )}

        <div className="chart-body flex-[1_1_auto] min-w-0">
          {chartWithProps && (
            <div className="chart-vega w-full min-w-0 flex-1 touch-manipulation" aria-hidden="true">
              {chartWithProps}
            </div>
          )}

          {hasAltTable && (
            <div>
              <AccessibleTable
                data={altTableData}
                columns={altTableColumns}
                caption={altTableCaption || title}
                srOnly={altTableSrOnly}
                labelledBy={altTableLabelledBy}
                allowToggleForSighted
                variables={altTableVariables}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <ChartFooter
          uploadDate={uploadDate}
          footnote={resolvedFootnote}
          dataSource={resolvedFooter}
        />
      </div>
    </div>
  );
};

ChartContainer.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.node,
  chart: PropTypes.node,
  sidebar: PropTypes.node,
  stackSidebarAbove: PropTypes.bool,
  altTableData: PropTypes.arrayOf(PropTypes.object),
  altTableVariables: PropTypes.object,
  altTableColumns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      format: PropTypes.oneOf([
        "text",
        "number",
        "percent",
        "date",
        "passthrough",
      ]),
    })
  ),
  altTableCaption: PropTypes.string,
  altTableSrOnly: PropTypes.bool,
  altTableLabelledBy: PropTypes.string,
  disableAltTable: PropTypes.bool,
  uploadDate: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  footnote: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]),
  footer: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.object,
  ]),
  onNewView: PropTypes.func,
};

export default ChartContainer;
