import React from "react";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
import ChartFooter from "./ChartFooter";

const { covid, flu, rsv, ari } = tokens.colorScales;
const { colors, typography } = tokens;

const useMedia = (query) => {
  const get = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia !== "undefined" &&
    window.matchMedia(query).matches;

  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    setMatches(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
};

const getXAxisFormat = (data, xKey) => {
  if (!data || data.length < 2) return "%b %d";
  const first = new Date(data[0][xKey]);
  const second = new Date(data[1][xKey]);
  const delta = Math.abs(second - first);
  const oneDay = 86400000;
  const oneWeek = oneDay * 7;
  const oneMonth = oneDay * 28;

  if (delta <= oneDay) return "%b %d";
  if (delta <= oneWeek + oneDay) return "%b %d";
  if (delta <= oneMonth) return "%b";
  return "%b %Y";
};

const LineChart = ({
  data,
  title,
  xField,
  yField,
  colorField,
  tooltipFields,
  virus,
  legend,
  legendTitle,
  color,
  metricName = "Category",
  isPercent = true,
  seasonal,
  dataSource = "NYC Health Department Syndromic Surveillance",
  footnote,
  columnLabels = {},
  onNewView,
}) => {
  const virusColorMap = {
    "COVID-19": colors.bluePrimary,
    Flu: colors.purplePrimary,
    RSV: colors.greenPrimary,
    ARI: colors.orangePrimary,
  };

  const virusColorRangeMap = {
    "COVID-19": covid,
    Flu: flu,
    RSV: rsv,
    ARI: ari,
  };

  
  const isMobile = useMedia("(max-width: 590px)");
  const legendColumns = isMobile ? 2 : undefined;
  const chartBg = getComputedStyle(document.documentElement).getPropertyValue("--chart-bg").trim();
  const chartLabelColor = getComputedStyle(document.documentElement).getPropertyValue("--chart-subtitle-color").trim();
  const chartTitleColor = getComputedStyle(document.documentElement).getPropertyValue("--chart-title-color").trim();

  const defaultColor = colors.gray600;
  const selectedColor = tokens.colors[color] || color || virusColorMap[virus] || defaultColor;

  // Defaults for fields
  const xKey = xField || "date";
  const yKey = yField || "value";

  const normalizeVirus = (v) => {
    if (v === "Influenza") return "Flu";
    return v;
  };

  const normalizeMetric = (m) => {
    if (!m) return m;
    return m.replace("Influenza", "Flu");
  };
  // Map UI "Flu" -> data "Influenza"
  const sourceVirus = normalizeVirus(virus);

  // Add display label for legend/tooltips
  const withDisplayLabels = Array.isArray(data)
  ? data.map((d) => ({
      ...d,
      virus: normalizeVirus(d.virus),
      metric: normalizeMetric(d.metric),
    }))
  : [];

  const hasVirusField = withDisplayLabels.some((d) => d.virus != null);
  let filteredData =
    virus && hasVirusField
      ? withDisplayLabels.filter((d) => d.virus === sourceVirus)
      : withDisplayLabels;

  // For seasonal charts, filter to only include data starting from the first full week's Saturday in September
  // A "full week" means a week that starts on Sunday and ends on Saturday, entirely within September
  if (seasonal && xField === "weekOfSeason") {
    // Calculate the first full week's Saturday for each season year
    const getFirstFullWeekSaturday = (year) => {
      // September 1st of the given year
      const sept1 = new Date(year, 8, 1); // month 8 = September
      const dayOfWeek = sept1.getDay(); // 0 = Sunday, 6 = Saturday
      
      // If Sept 1 is Sunday (0), the first full week's Saturday is Sept 7
      // If Sept 1 is Monday (1), we need to get to the next Sunday (Sept 7), then Saturday is Sept 13
      // If Sept 1 is Tuesday (2), next Sunday is Sept 6, Saturday is Sept 12
      // etc.
      
      // Days until next Sunday (or 0 if already Sunday)
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      // First Sunday in September
      const firstSunday = new Date(year, 8, 1 + daysToSunday);
      
      // If the first Sunday is Sept 1, the first full week's Saturday is Sept 7
      // Otherwise, we need the second Sunday's week (next full week)
      let targetSunday = firstSunday;
      if (firstSunday.getDate() > 1) {
        // First Sunday is after Sept 1, so this week is the first full week
        // Saturday is 6 days after Sunday
      } else {
        // First Sunday is Sept 1, but we need a full week, so use next Sunday
        targetSunday = new Date(year, 8, 1 + 7);
      }
      
      // Saturday is 6 days after Sunday
      const saturday = new Date(targetSunday);
      saturday.setDate(targetSunday.getDate() + 6);
      
      return saturday;
    };

    // Group by season and calculate start dates
    const seasonStartDates = {};
    filteredData.forEach((d) => {
      const date = new Date(d.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      // Determine season year (Sept-Dec uses current year, Jan-Aug uses previous year)
      const seasonYear = month >= 8 ? year : year - 1;
      const season = `${seasonYear}-${seasonYear + 1}`;
      
      if (!seasonStartDates[season]) {
        seasonStartDates[season] = getFirstFullWeekSaturday(seasonYear);
      }
    });

    // Filter to only include dates >= the first full week's Saturday for each season
    filteredData = filteredData.filter((d) => {
      const date = new Date(d.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const seasonYear = month >= 8 ? year : year - 1;
      const season = `${seasonYear}-${seasonYear + 1}`;
      
      const startDate = seasonStartDates[season];
      return startDate ? date >= startDate : true;
    });
  }

  const hasValidDate = filteredData.some((d) => {
    const v = d?.[xKey] ?? d?.date;
    const t = v ? new Date(v).getTime() : NaN;
    return Number.isFinite(t);
  });

  const hasFinite = filteredData.some((d) => {
    const raw = d?.[yKey] ?? d?.value;
    if (raw == null) return false;
    // allow "3.2", "3.2%", "+0.5", etc.
    const n = typeof raw === "string" ? parseFloat(raw.replace('%', '')) : raw;
    return Number.isFinite(n);
  });

  if (!hasValidDate || !hasFinite) {
    return (
      <div style={{ width: "100%" }}>
        <div style={{ padding: "1rem", color: tokens.colors.gray600 }}>No data to display.</div>
        <ChartFooter dataSource={dataSource} footnote={footnote} />
      </div>
    );
  }

  const maxValue = Math.max(...filteredData.map(d => d.value));
  const maxPlus = maxValue * 1.25;

  const axisFormat = getXAxisFormat(filteredData, xKey);

  const labelOffset = seasonal ? 0 : 0.05

  const xEncoding = seasonal
    ? {
        field: "weekOfSeason",
        type: "quantitative",
        axis: {
          title: null,
          values: [1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48],
          labelExpr: "['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'][indexof([1,5,9,14,18,22,27,31,35,40,44,48], datum.value)]"
        },
        scale: { domain: [1, 52] },
      }
    : {
        field: xKey,
        type: "temporal",
        axis: { 
          title: null, 
          format: axisFormat, 
          tickCount: 12,
          values: {
            signal: "utcSequence('day', utcOffset('day', domain('x')[0], (6 - utcday(domain('x')[0]) + 7) % 7), domain('x')[1], 7)"
        }
        },
        scale: { padding: 10 },
      };

  const valueDisplayCalc = isPercent
    ? "datum.valueRaw != null ? (test(/%$/, '' + datum.valueRaw) ? '' + datum.valueRaw : ('' + datum.valueRaw) + '%') : (isValid(datum.value) ? format(datum.value, '.1f') + '%' : 'N/A')"
    : "datum.valueRaw != null ? '' + datum.valueRaw : (isValid(datum.value) ? format(datum.value, ',.0f') : 'N/A')";

let sharedTooltip = (tooltipFields ?? [xKey, yKey, ...(colorField ? [colorField] : [])]).map((field) => {
  if (field === yKey) {
    return { field: "valueDisplay", title: columnLabels.value || "Reported", type: "nominal" };
  }
  if (field === xKey || field === "date") {
    return {
      field: field === "date" ? "date" : xKey,
      type: "temporal",
      format: "%b %d, %Y",
      title: columnLabels[field] || "Date",
    };
  }
  const sample = filteredData.find((d) => d[field] != null)?.[field];
  return { field, type: typeof sample === "number" ? "quantitative" : "nominal", title: columnLabels[field] };
});

// If seasonal mode is on, add the Week tooltip
if (seasonal === true) {
  sharedTooltip.push({
    field: "weekOfSeason",
    type: "quantitative",
    title: "Week"
  });
}


  // Add season field to data if it's a seasonal chart
  if (seasonal) {
    filteredData = filteredData.map(d => {
      if (d.season) return d; // already has season
      const date = new Date(d.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const startYear = month >= 8 ? year : year - 1;
      return {
        ...d,
        season: `${startYear}-${String(startYear + 1).slice(2)}`
      };
    });
  }

  // Only apply special coloring for multi-year seasonal charts
  const hasMultipleSeasons =
    seasonal &&
    filteredData.some((d, i, arr) => d.season && arr.some(e => e.season !== d.season));

  // Get unique seasons sorted by startYear (descending) so latest season gets darkest color
  const seasonDomain = hasMultipleSeasons
    ? [...new Set(filteredData.map(d => d.season))]
      .sort((a, b) => {
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA; // descending order
      })
    : [];

  const lineColorEncoding =
    hasMultipleSeasons
      ? {
          field: "season",
          type: "nominal",
          scale: { 
            range: virusColorRangeMap[virus],
            domain: seasonDomain
          },
          legend: null,
            // legend === null
            //   ? null
            //   : {
            //       labelExpr:
            //         "datum.label === 'Influenza' ? 'Flu' : datum.label",
            //       labelLimit: 300,
            //       clipHeight: 30,
            //       title: legendTitle ?? null,
            //     },
        }
      : colorField
      ? {
          field: colorField,
          type: "nominal",
          sort: ["0-4", "5-17", "18-64", "65+"], 
          scale: { range: virusColorRangeMap[virus] },
          legend: null,
            // legend === null
            //   ? null
            //   : {
            //       labelExpr:
            //         "datum.label === 'Influenza' ? 'Flu' : datum.label",
            //       labelLimit: 300,
            //       clipHeight: 30,
            //       title: legendTitle ?? null,
            //     },
        }
      : { value: selectedColor };

const pointColorEncoding = colorField
  ? {
      field: colorField,
      type: "nominal",
      sort: ["0-4", "5-17", "18-64", "65+"], 
    }
  : { value: selectedColor };

  // Opacity with hover effect - fade non-hovered lines only when hovering
  const lineOpacityEncoding = hasMultipleSeasons
    ? {
        condition: [
          {
            test: "datum.startYear == datum.latestStartYear",
            value: 1,
          },
          {
            param: "hover",
            empty: false,
            value: 1
          }
        ],
        value: {
          expr: "length(data('hover_store')) > 0 ? 0.2 : 0.4"  // Fade more when hovering, normal fade when not
        }
      }
    : colorField
    ? {
        condition: {
          param: "hover",
          empty: false,
          value: 1
        },
        value: {
          expr: "length(data('hover_store')) > 0 ? 0.2 : 1"  // Full opacity by default, fade when hovering others
        }
      }
    : { value: 1 };

  const specTemplate = {
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    title: {
      text: title,
      subtitlePadding: 10,
      fontWeight: "normal",
      anchor: "start",
      fontSize: 14,
      baseline: "top",
      dy: -10,
      subtitleFontSize: 13,
    },
    config: {
      background: chartBg || colors.white,
      axis: {
        labelFont: typography.body,
        titleFont: typography.heading,
        labelColor: chartLabelColor || colors.gray700,
        titleColor: chartTitleColor || colors.gray800,
        labelFontSize: 12,
      },
      axisX: { ticks: true, domain: true, domainColor: "lightgray", grid: false },
      axisY: { domain: false, ticks: false, tickCount: 3, orient: "left", zindex: 0, gridDash: [2] },
      legend: {
        labelFont: typography.body,
        titleFont: typography.heading,
        labelColor: colors.gray600,
        titleColor: colors.gray700,
        symbolSize: 100,
        symbolStrokeWidth: 5,
        orient: "bottom",
        title: metricName,
        labelFontSize: 16,
        direction: "horizontal",
        columns: legendColumns,
        columnPadding: 10,
        labelLimit: isMobile ? 160 : 300,
      },
      view: { stroke: "transparent" },
    },

    transform: [
      {
        calculate: "datum.virus === 'Influenza' ? 'Flu' : datum.virus",
        as: "virus"
      },
      
      { calculate: "year(datum.date)", as: "year" },
      { calculate: "month(datum.date)", as: "month" },
      { calculate: "dayofyear(datum.date)", as: "day" },
      {
        calculate: "month(datum.date) > 7 ? year(datum.date) : year(datum.date) - 1",
        as: "startYear",
      },
      // 1️ Determine the season start year (Aug–Jul season)
      {
        calculate: "month(datum.date) >= 8 ? year(datum.date) : year(datum.date) - 1",
        as: "seasonStartYear"
      },

      // 2️ Create the Sept 7–13 range start date
      {
        calculate: "datetime(datum.seasonStartYear, 8, 7)",
        as: "sept7"
      },

      // 3️ Find the first Saturday in that range (week 1 anchor)
      {
        calculate: "datetime(datum.seasonStartYear, 8, 7 + ((6 - day(datum.sept7)) % 7))",
        as: "week1Anchor"
      },

      // 4️ Compute weekOfSeason relative to the anchor
      {
        calculate: "floor((datetime(year(datum.date), month(datum.date), date(datum.date)) - datum.week1Anchor) / (1000*60*60*24*7)) + 1",
        as: "weekOfSeason"
      },

      // 5️ Season label for grouping
      {
        calculate: "toString(datum.seasonStartYear) + '-' + substring(toString(datum.seasonStartYear + 1), 2)",
        as: "season"
      },
      { calculate: "toString(datum.startYear) + '-' + substring(toString(datum.startYear + 1), 2)", as: "season" },
      { calculate: valueDisplayCalc, as: "valueDisplay" },
      
      {
        window: [{ op: "max", field: "startYear", as: "latestStartYear" }],
        frame: [null, null]
      }
    ],

    layer: [
      ...(colorField || seasonal
        ? []
        : [
            {
              mark: { type: "area", interpolate: "linear", opacity: 0.15, color: selectedColor },
              encoding: { x: xEncoding, y: { field: "{yField}", type: "quantitative" } },
            },
          ]),
      {
        mark: { type: "line", interpolate: "linear", strokeWidth: 3, point: false },
        encoding: {
          x: xEncoding,
          y: {
            field: "{yField}",
            type: "quantitative",
            axis: { 
              title: null, 
              tickCount: 4, 
              ...(isPercent ? { labelExpr: "datum.value + '%'" } : {}),
            },
            scale: {
              domain: [0, maxPlus]
            }
          },
          color: lineColorEncoding,
          opacity: lineOpacityEncoding,
          tooltip: sharedTooltip
        },
        layer: [
          // LINE LAYER
          {
            mark: { type: "line", interpolate: "linear", strokeWidth: 3, point: false },
          },
          // TEXT LAYER WITH OFFSET ALGORITHM
          {
          transform: [
            // Get final date entry
            {
              joinaggregate: [
                {op: "max", field: xField, as: "maxDate"}
              ],
              groupby: [`${colorField}`]
            },

            // Get max value for whole chart
            {
              joinaggregate: [
                { op: "max", field: yField, as: "maxValue" }
              ]
            },

            {filter: `datum['${xField}'] === datum.maxDate`},


            // Set collision and move thresholds
            { calculate: "datum.maxValue * 0.075", as: "collisionThreshold" },
            { calculate: "datum.maxValue * 0.075", as: "moveAmount" },

            // Set initial label value
            { calculate: `datum['${yField}']`, as: "labelValue" },

            // ---- PASS 1 ----
            {
              window: [
                { op: "lag", field: "labelValue", as: "prevLabel1" }
              ],
              sort: [{ field: "labelValue", order: "ascending" }]
            },
            { calculate: "datum.prevLabel1 === null ? 0 : datum.labelValue - datum.prevLabel1", as: "labelDiff1" },
            { calculate: `datum.prevLabel1 === null ? (datum.labelValue - datum.maxValue * ${labelOffset}) : (datum.labelDiff1 < datum.collisionThreshold ? datum.prevLabel1 + datum.moveAmount : datum.labelValue)`, as: "labelValue1" },

            // ---- PASS 2 ----
            {
              window: [
                { op: "lag", field: "labelValue1", as: "prevLabel2" }
              ],
              sort: [{ field: "labelValue1", order: "ascending" }]
            },
            { calculate: "datum.prevLabel2 === null ? 0 : datum.labelValue1 - datum.prevLabel2", as: "labelDiff2" },
            { calculate: "datum.prevLabel2 === null ? datum.labelValue1 : (datum.labelDiff2 < datum.collisionThreshold ? datum.prevLabel2 + datum.moveAmount : datum.labelValue1)", as: "labelValue2" },

            // ---- PASS 3 ----
            {
              window: [
                { op: "lag", field: "labelValue2", as: "prevLabel3" }
              ],
              sort: [{ field: "labelValue2", order: "ascending" }]
            },
            { calculate: "datum.prevLabel3 === null ? 0 : datum.labelValue2 - datum.prevLabel3", as: "labelDiff3" },
            { calculate: "datum.prevLabel3 === null ? datum.labelValue2 : (datum.labelDiff3 < datum.collisionThreshold ? datum.prevLabel3 + datum.moveAmount : datum.labelValue2)", as: "labelValue3" },

            // ---- PASS 4 ----
            {
              window: [
                { op: "lag", field: "labelValue3", as: "prevLabel4" }
              ],
              sort: [{ field: "labelValue3", order: "ascending" }]
            },
            { calculate: "datum.prevLabel4 === null ? 0 : datum.labelValue3 - datum.prevLabel4", as: "labelDiff4" },
            { calculate: "datum.prevLabel4 === null ? datum.labelValue3 : (datum.labelDiff4 < datum.collisionThreshold ? datum.prevLabel4 + datum.moveAmount : datum.labelValue3)", as: "newLabelValue" }
          ],
          description: "Hover text",
            encoding: {
              y: {field: "newLabelValue"},
              text: {field: colorField},
              tooltip: []
            },
            mark: {
              type: "text",
              align: "left",
              dx: 8,
              dy: 0,
              fontSize: 12,
              fontWeight: "bold"
            }
          }
        ]
      }, 
      
      {
        params: hasMultipleSeasons || colorField
          ? [{
              name: "hover",
              select: {
                type: "point",
                fields: hasMultipleSeasons ? ["season"] : [colorField || "metric"],
                on: "mouseover",
                nearest: false,
                clear: "mouseout"
              }
            }]
          : [],
        mark: { type: "point", filled: true, size: 40, strokeWidth: 1.5 },
        encoding: {
          x: xEncoding,
          y: { field: "{yField}", type: "quantitative" },
          color: pointColorEncoding,
          opacity: lineOpacityEncoding,
          tooltip: sharedTooltip,
        },
      },
    ],
  };

  const latestDate = (() => {
    const ts = filteredData
      .map((d) => new Date(d["date"]).getTime())
      .filter((n) => Number.isFinite(n));
    return ts.length ? Math.max(...ts) : null;
  })();

  return (
    <div style={{ width: "100%" }}>
      <VegaLiteWrapper
        data={filteredData}
        specTemplate={specTemplate}
        dynamicFields={{ xField: xKey, yField: yKey, colorField }}
        rendererMode="svg"
        onNewView={onNewView}
      />
      {/* <ChartFooter dataSource={dataSource} latestDate={latestDate} footnote={footnote} /> */}
    </div>
  );
};

export default LineChart;