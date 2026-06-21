import SeasonalEDChart from "../components/charts/edSeasonalComparisonChart";
import LineChart from "../components/charts/LineChart";
import YearComparisonChart from "../components/charts/YearComparisonChart";
import SmallMultipleBarChart from "../components/charts/SmallMultipleBarChart";
import SmallMultipleLineChart from "../components/charts/SmallMultipleLineChart";
import CombinedVirusChart from "../components/charts/CombinedVirusChart";

const chartRegistry = {
  edSeasonalComparisonChart: SeasonalEDChart,
  lineChart: LineChart,
  yearComparisonChart: YearComparisonChart,
  smallMultipleBarChart: SmallMultipleBarChart,
  smallMultipleLineChart: SmallMultipleLineChart,
  combinedVirusChart: CombinedVirusChart,
};

export default chartRegistry;
