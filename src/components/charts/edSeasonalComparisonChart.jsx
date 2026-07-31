import React from "react";
import { VegaLite } from "react-vega";
import { tokens } from "../../styles/tokens";
import { getVirusMeta } from "../../utils/virusRegistry";

const { colors } = tokens;

const SeasonalEDChart = ({ data = [], virus = "COVID-19", view = "visits" }) => {
  if (!data.length) return null;
  const dynamicColor = getVirusMeta(virus)?.chartColor ?? colors.gray700;

  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Simple weekly bar chart of ED activity",
    data: { name: "table" },
    width: 800,
    height: 300,
    mark: { type: "bar", opacity: 1, stroke: "#1E3A8A", strokeWidth: 0.8 },
    encoding: {
      x: { field: "week", type: "ordinal", title: "Week" },
      y: {
        field: view,
        type: "quantitative",
        title: `ED ${view === "hospitalizations" ? "Hospitalizations" : "Visits"}`,
      },
      color: { value: dynamicColor },
      tooltip: [
        { field: "week", type: "ordinal" },
        {
          field: view,
          type: "quantitative",
          title: view === "hospitalizations" ? "Hospitalizations" : "Visits",
        },
      ],
    },
  };

  return <VegaLite spec={spec} data={{ table: data }} />;
};

export default SeasonalEDChart;
