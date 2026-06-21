import { DATA_PATHS } from "./Data.config";
import { toSourceVirus } from "../../utils/virusMap";


const caseDataPageConfig = {
  id: "caseDataPage",
  titleKey: "caseDataPage.mainTitle",
  subtitleKey: "caseDataPage.mainSubtitle",
  dataPath: DATA_PATHS.lab,
  dataType: "lab",

  controls: {
    dataTypeToggle: true,
    virusToggle: true,
    viewToggle: false,
  },

  summary: {
    title: "Page Overview",
    markdownPath: "content/sections/caseDataSectionText.md",
    lastUpdated: "05/01/2025",
    showTrendArrow: false,
    showSecondayTitle: false,
    bullets: [
      {
        id: "peds-deaths",
        renderAs: "custom",
        component: "SeasonalBullet",
        dataSourceKey: "deathData",
        componentProps: {
          dataPath: DATA_PATHS.death,
          season: { start: { month: 10, day: 4 }, end: { month: 5, day: 31 } },
          weeklyField: "value",
          seasonalSubmetric: "Seasonal 2025-2026",
          dateField: "date",
          as: "p",
          className: "seasonal-bullet",
        },
      }
    ],
    metricLabel: "cases",
  },

  sections: [
    {
      id: "case-reports-season",
      navLabel: "By Season",
      dataType: "lab",
      title: "caseDataPage.charts.seasonalComparison.title",
      subtitle: "caseDataPage.charts.seasonalComparison.subtitle",
      infoIcon: true,
      downloadIcon: true,
      trendEnabled: true,
      animateOnScroll: true,
      modal: {
        title: "caseDataPage.charts.seasonalComparison.title",
        markdownPath: "content/modals/cases-explainer.md",
      },
      chart: {
        type: "lineChart",
        props: {
          dataSourceKey: "seasonalCaseTrends",
          dataSource: null,
          seasonal: true,
          metricName: "{virus} cases",
          submetric: "Total",
          xField: "weekOfSeason",
          yField: "value",
          colorField: "season",
          tooltipFields: ["date", "season", "value"],
          defaultDisplay: "Number",
          isPercent: false,
          columnLabels: {
            date: "Date",
            season: "Season",
            value: "Confirmed cases",
          },
        },
        altTable: {
          caption: "{virus} confirmed cases by season",
          srOnly: true,
          columns: [
            { key: "date",   header: "Date",            format: "date" },
            { key: "season", header: "Season",          format: "text" },
            { key: "value",  header: "Confirmed cases", format: "number" },
          ],
        },
      },
    },

    {
      id: "case-reports-neighborhood",
      navLabel: "Neighborhood",
      dataType: "lab",
      title: "caseDataPage.charts.reportsByNeighborhood.title",
      renderAs: "custom",
      component: "LabCasesNeighborhoodMap",
      background: "white",
      wrapInChart: false,
      disableAltTable: true,
      animateOnScroll: true,
      componentProps: {
        virus: "{virus}",
      },
    },


    {
      id: "case-reports-subtype",
      navLabel: "By Subtype",
      dataType: "lab",
      title: "caseDataPage.charts.reportsBySubtype.title",
      subtitle: null,
      showIfVirus: "Flu",
      infoIcon: true,
      downloadIcon: true,
      trendEnabled: true,
      animateOnScroll: true,
      modal: {
        title: "caseDataPage.charts.reportsBySubtype.title",
        markdownPath: "content/modals/cases-explainer.md",
      },
      chart: {
        type: "yearComparisonChart",
        props: {
          dataSourceKey: "casesBySubType",
          dataSource: null,
          metricName: "{virus} cases by subtype",
          groupField: "submetric",
          xField: "date",
          yField: "value",
          colorField: "submetric",
          barMode: "grouped", 
          tooltipFields: ["date", "value"],
          defaultDisplay: "Number",
          showRollingAvg: false,
          showFluViewToggle: true,
          columnLabels: {
            date: "Date",
            value: "Confirmed cases",
            submetric: "Type",
          },
        },
        altTable: {
          caption: "{virus} confirmed cases by subtype",
          srOnly: true,
          columns: [
            { key: "date",      header: "Date",            format: "date" },
            { key: "submetric", header: "Subtype",         format: "text" },
            { key: "value",     header: "Confirmed cases", format: "number" },
          ],
        },
      },
    },

    {
      id: "case-reports-age",
      navLabel: "By Age",
      dataType: "lab",
      title: "caseDataPage.charts.reportsByAge.title",
      subtitle: null,
      infoIcon: true,
      downloadIcon: true,
      animateOnScroll: true,
      modal: {
        title: "caseDataPage.charts.reportsByAge.title",
        markdownPath: "content/modals/cases-explainer.md",
      },
      chart: {
        type: "smallMultipleLineChart",
        props: {
          dataSourceKey: "casesByAge",
          dataSource: null,
          footnote: {
            independent: "Y-axis scales are different to clearly show trends for each age group.",
            shared: "Y-axis scales are the same across groups to support comparison between age groups.",
          },          
          seasonal: null,
          metricName: "{virus} cases by age group",
          groupField: "submetric",
          xField: "date",
          yField: "value",
          colorField: "submetric",
          tooltipFields: ["date", "submetric", "value"],
          defaultDisplay: "Number",
          customColor: "#4F32B3",
          columnLabels: {
            date: "Date",
            value: "Confirmed cases",
            submetric: "Age Group",
          },
        },
        altTable: {
          caption: "{virus} confirmed cases by age group",
          srOnly: true,
          columns: [
            { key: "date",      header: "Date",            format: "date" },
            { key: "submetric", header: "Age Group",       format: "text" },
            { key: "value",     header: "Confirmed cases", format: "number" },
          ],
        },
      },
    },

    {
      id: "case-reports-borough",
      navLabel: "By Borough",
      dataType: "lab",
      title: "caseDataPage.charts.reportsByBorough.title",
      subtitle: null,
      infoIcon: true,
      downloadIcon: true,
      animateOnScroll: true,
      modal: {
        title: "caseDataPage.charts.reportsByBorough.title",
        markdownPath: "content/modals/cases-explainer.md",
      },
      chart: {
        type: "smallMultipleLineChart",
        props: {
          dataSourceKey: "casesByBorough",
          dataSource: null,
          seasonal: null,
         footnote: {
            independent: "Y-axis scales are different to clearly show trends for each borough.",
            shared: "Y-axis scales are the same across groups to support comparison between boroughs.",
          },          
          metricName: "{virus} cases by borough",
          groupField: "submetric",
          xField: "date",
          yField: "value",
          colorField: "submetric",
          tooltipFields: ["date", "submetric", "value"],
          defaultDisplay: "Number",
          columnLabels: {
            date: "Date",
            value: "Confirmed cases",
            submetric: "Borough",
          },
        },
        altTable: {
          caption: "{virus} confirmed cases by borough",
          srOnly: true,
          columns: [
            { key: "date",      header: "Date",            format: "date" },
            { key: "submetric", header: "Borough",         format: "text" },
            { key: "value",     header: "Confirmed cases", format: "number" },
          ],
        },
      },
    },

    {
      id: "case-reports-re",
      navLabel: "By Race & Ethnicity",
      dataType: "lab",
      title: "caseDataPage.charts.reportsByRE.title",
      subtitle: null,
      // showIfVirus: "COVID-19",
      showWhen: ({ virus, dataType }) =>
      dataType === "lab" &&
      ["flu", "COVID-19"].includes(toSourceVirus(virus)),
      infoIcon: true,
      downloadIcon: true,
      animateOnScroll: true,
      modal: {
        title: "caseDataPage.charts.reportsByRE.title",
        markdownPath: "content/modals/cases-explainer.md",
      },
      chart: {
        type: "smallMultipleLineChart",
        footer: {
          independent: "caseDataPage.charts.reportsByRE.footer.independent",
          shared: "caseDataPage.charts.reportsByRE.footer.shared",
        },
        props: {
          dataSourceKey: "casesByRE",
          dataSource: null,
          seasonal: null,
          // footnote: "Y-axis scales are different to clearly show trends for a given race and ethnicity.",
          metricName: "{virus} cases by race and ethnicity",
          groupField: "submetric",
          xField: "date",
          yField: "value",
          colorField: "submetric",
          tooltipFields: ["date", "submetric", "value"],
          defaultDisplay: "Number",
          columnLabels: {
            date: "Date",
            value: "Confirmed cases",
            submetric: "Race & Ethnicity",
          },
        },
        altTable: {
          caption: "{virus} confirmed cases by race and ethnicity",
          srOnly: true,
          columns: [
            { key: "date",      header: "Date",                 format: "date" },
            { key: "submetric", header: "Race & Ethnicity",     format: "text" },
            { key: "value",     header: "Confirmed cases",      format: "number" },
          ],
        },
      },
    },
    {
      id: "case-info-flu-re",
      dataType: "lab",
      renderAs: "custom",
      // title: "caseDataPage.noRaceEthnicitySection.title",
      //textKey: "caseDataPage.noRaceEthnicitySection.body", 
      showIfVirus: "Flu",
      infoIcon: false,
      downloadIcon: false,
      animateOnScroll: true,
      background: "transparent"

    },

    {
      id: "case-info-rsv-re",
      dataType: "lab",
      renderAs: "custom",
      dataSourceKey: "casesByAge",
      wrapInChart: false,
      // title: "caseDataPage.noRaceEthnicitySection.title",
      // textKey: "caseDataPage.noRaceEthnicitySection.body", 
      showIfVirus: "RSV",
      infoIcon: false,
      downloadIcon: false,
      animateOnScroll: true,
      background: "transparent"

    },

    
  ],
};

export default caseDataPageConfig;
