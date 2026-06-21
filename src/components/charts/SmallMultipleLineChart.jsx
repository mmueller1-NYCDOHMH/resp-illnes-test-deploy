import React, { useMemo, useState, useEffect } from "react";
import VegaLiteWrapper from "./VegaLiteWrapper";
import { tokens } from "../../styles/tokens";
import ChartFooter from "./ChartFooter";

const { colors, typography } = tokens;
const { covid, flu, rsv } = tokens.colorScales;

function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

const SmallMultipleLineChart = ({
  data,
  xField = "date",
  yField = "value",
  colorField = "submetric",
  virus,
  color,
  title,
  metricName,
  display,
  legendTitle = "Category",
  showRollingAvg = false,
  groupedAges,
  monthly,
  dataSource,
  footnote,
  sharedY = false,
  columnLabels = {},
  onNewView,
  showScaleToggle = true,
  onResolveFootnote,
}) => {
  const [scaleMode, setScaleMode] = useState(sharedY ? "shared" : "independent");


  



const resolvedFootnote =
  typeof footnote === "object"
    ? footnote[scaleMode === "shared" ? "shared" : "independent"]
    : footnote;

useEffect(() => {
  if (onResolveFootnote) {
    onResolveFootnote({
      footnote: resolvedFootnote,
      scaleMode,
    });
  }
}, [resolvedFootnote, scaleMode, onResolveFootnote]);

  const virusColorMap = {
    "COVID-19": colors.purplePrimary,
    Flu: colors.bluePrimary,
    RSV: colors.orangePrimary,
  };

  const toSourceVirus = (v) => (v === "Flu" ? "Influenza" : v);
  const sourceVirus = toSourceVirus(virus);

  const filteredData =
    virus && Array.isArray(data) && data.some((d) => d.virus === sourceVirus)
      ? data.filter((d) => d.virus === sourceVirus)
      : Array.isArray(data)
      ? data
      : [];

  const explicitTokenColor =
    color && tokens.colors?.[color] ? tokens.colors[color] : null;

  const selectedColor =
    explicitTokenColor ||
    (virus && virusColorMap[virus]) ||
    (metricName?.includes("COVID")
      ? colors.purplePrimary
      : metricName?.match(/Influenza|Flu/i)
      ? colors.bluePrimary
      : metricName?.includes("RSV")
      ? colors.orangePrimary
      : colors.gray600);

  const normalizedDisplay =
    typeof display === "string" ? display.trim().toLowerCase() : null;

  const parsed = useMemo(() => {
    return filteredData.map((d) => {
      const dateObj = new Date(d[xField] ?? d.date);
      const year = dateObj.getFullYear();
      const week = getISOWeek(dateObj);
      const rawDisplay = typeof d.display === "string" ? d.display.trim() : "";
      const normalizedRowDisplay = rawDisplay.toLowerCase();
      const numeric = Number(d[yField] ?? d.value);
      const valueNum = Number.isFinite(numeric) ? numeric : null;

      return {
        ...d,
        date: dateObj,
        year,
        isoWeek: `${year}-W${String(week).padStart(2, "0")}`,
        value: valueNum,
        valueRaw: d.valueRaw ?? d[yField] ?? d.value,
        metric: d.metric ?? metricName,
        [colorField]: d[colorField] ?? "Unknown",
        display: normalizedRowDisplay || "unknown",
      };
    });
  }, [filteredData, xField, yField, metricName, colorField]);

  const filtered = useMemo(() => {
    return parsed
      .filter((d) => {
        const isMatch =
          !metricName ||
          d.metric?.toLowerCase().includes(metricName.toLowerCase()) ||
          metricName.toLowerCase().includes(d.metric?.toLowerCase() || "");

        const isDisplayMatch = !normalizedDisplay || d.display === normalizedDisplay;

        const isExcludedAge =
          virus === "COVID-19" &&
          metricName?.toLowerCase().includes("death") &&
          (d[colorField] === "0-17" || d[colorField] === "0–17");

        return isMatch && isDisplayMatch && !isExcludedAge;
      })
      .filter((d) => Number.isFinite(d.value));
  }, [parsed, metricName, normalizedDisplay, virus, colorField]);

  let groups;
  if (metricName?.includes("age") && !groupedAges) {
    groups = ["0-4", "5-17", "18-64", "65+"];
  } else if (metricName?.includes("age") && groupedAges) {
    groups = ["0-17", "18-64", "65+"];
  } else if (metricName?.includes("borough")) {
    groups = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
  } else if (metricName?.includes("race")) {
    groups = [
      "Asian/Pacific Islander",
      "Black/African American",
      "White",
      "Hispanic/Latino",
    ];
  } else {
    const set = new Set(filtered.map((d) => d[colorField]).filter(Boolean));
    groups = [...new Set(Array.from(set))];
  }

  if (virus === "COVID-19" && metricName?.toLowerCase().includes("death")) {
    groups = groups.filter((g) => g !== "0-17");
  }

  groups = groups.filter(Boolean);

  const allDates = [...new Set(filtered.map((d) => d.date.getTime()))].map(
    (t) => new Date(t)
  );

  const filled = groups.flatMap((group) => {
    const groupData = filtered.filter((d) => d[colorField] === group);

    return allDates.map((date) => {
      const existing = groupData.find((d) => d.date.getTime() === date.getTime());

      return (
        existing || {
          date,
          value: 0,
          [colorField]: group,
          metric: metricName,
          display: normalizedDisplay || "number",
        }
      );
    });
  });

  if (!groups || groups.length === 0) {
    return (
      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ padding: "1rem", color: colors.gray600 }}>No data to display.</div>
        <ChartFooter dataSource={dataSource}   footnote={resolvedFootnote} />
      </div>
    );
  }

  const globalMax = Math.max(...filled.map((d) => d.value ?? 0), 0);
  const sharedDomainMax = globalMax === 0 ? 1 : globalMax;

  const dateFormat = monthly ? "%b" : "%b %d";

  const specTemplate = {
    width: "container",
    autosize: { type: "fit", contains: "padding", resize: true },
    title: {
      text: title,
      subtitlePadding: 10,
      fontWeight: "normal",
      anchor: "start",
      fontSize: 14,
      baseline: "top",
      dy: -10,
    },
    config: {
      background: colors.white,
      axis: {
        labelColor: colors.gray700,
        titleColor: colors.gray800,
        labelFontSize: 12,
      },
      axisY: {
        domain: false,
        ticks: false,
        tickCount: 2,
        orient: "left",
        zindex: 0,
        gridDash: [2],
      },
      axisX: { domain: true, grid: false },
      view: { stroke: "transparent" },
      legend: {
        labelFont: typography.body,
        titleFont: typography.heading,
        labelColor: colors.gray600,
        titleColor: colors.gray700,
        symbolSize: 100,
        symbolStrokeWidth: 5,
        orient: "bottom",
        title: legendTitle,
      },
    },
    vconcat: [],
  };

  const valueTooltipField = filtered.some((d) => d.valueRaw != null)
    ? { field: "valueRaw", title: columnLabels.value || "Reported" }
    : { field: "value", title: columnLabels.value || "Reported" };

  specTemplate.vconcat = groups.map((group) => {
    const groupValues = filled
      .filter((d) => d[colorField] === group)
      .map((d) => d.value ?? 0);

    const allZero = groupValues.length > 0 && groupValues.every((v) => v === 0);
    const groupMax = Math.max(...groupValues, 0);

    const yAxis =
      scaleMode === "shared"
        ? {
            format: "d",
            tickMinStep: 1,
          }
        : allZero
        ? {
            format: "d",
            values: [0, 1],
          }
        : {
            format: "d",
            tickMinStep: 1,
          };

    const yScale =
      scaleMode === "shared"
        ? {
            domain: [0, sharedDomainMax],
            nice: true,
            zero: true,
          }
        : allZero
        ? {
            domain: [0, 1],
            nice: false,
            zero: true,
          }
        : {
            domain: [0, groupMax === 0 ? 1 : groupMax],
            nice: true,
            zero: true,
          };

    return {
      title: {
        text: group,
        anchor: "start",
        align: "left",
        fontSize: 14,
        fontWeight: "bold",
        color: "#374151",
      },
      height: 75,
      width: "{containerWidth}",
      transform: [{ filter: `datum['${colorField}'] === '${group}'` }],
      encoding: {
        x: {
          field: "date",
          type: "temporal",
          axis: {
            title: null,
            format: dateFormat,
            tickCount: 6,
            labelAngle: 0,
          },
        },
        y: {
          field: "value",
          type: "quantitative",
          title: null,
          axis: yAxis,
          scale: yScale,
        },
      },
      layer: [
        {
          mark: { type: "area", opacity: 0.15, color: selectedColor },
        },
        {
          mark: {
            type: "line",
            point: { filled: true, size: 40 },
            strokeWidth: 2,
          },
          encoding: {
            color: { value: selectedColor },
            tooltip: [
              { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
              {
                field: colorField,
                type: "nominal",
                title: columnLabels[colorField] || "Group",
              },
              valueTooltipField,
            ],
          },
        },
        {
          mark: { type: "point", size: 300, opacity: 0.001 },
          encoding: {
            color: { value: selectedColor },
            tooltip: [
              { field: "date", type: "temporal", format: "%b %d, %Y", title: "Date" },
              {
                field: colorField,
                type: "nominal",
                title: columnLabels[colorField] || "Group",
              },
              valueTooltipField,
            ],
          },
        },
      ],
    };
  });

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {showScaleToggle && groups.length > 1 && (
        <div className="flex justify-end mb-3">
          <div
            className="inline-flex border border-[var(--gray-300)] rounded-full overflow-hidden bg-white"
            role="group"
            aria-label="Toggle chart scale mode"
            style={{ "--chart-toggle-active-color": selectedColor }}
          >
            {[
              { mode: "independent", label: "Scale to group" },
              { mode: "shared",      label: "Same scale" },
            ].map(({ mode, label }) => {
              const active = scaleMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScaleMode(mode)}
                  aria-pressed={active}
                  className={`appearance-none border-0 py-[0.45rem] px-[0.8rem] cursor-pointer text-sm font-semibold leading-tight outline-none transition-[background-color,color] duration-150 focus:outline-none focus-visible:relative focus-visible:z-[1] focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-[var(--chart-toggle-active-color,#2563eb)] ${active ? "bg-[var(--chart-toggle-active-color,#2563eb)] text-white" : "bg-transparent text-[var(--gray-700)] hover:bg-[var(--gray-100)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <VegaLiteWrapper
        data={filled}
        specTemplate={specTemplate}
        rendererMode="svg"
        onNewView={onNewView}
      />

 {/* <ChartFooter
  latestDate={
    filteredData?.length > 0
      ? Math.max(...filteredData.map((d) => new Date(d["date"])))
      : null
  }
  dataSource={dataSource}
  footnote={resolvedFootnote}
/> */}
    </div>
  );
};

export default SmallMultipleLineChart;