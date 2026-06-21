import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";
import covidDeathPageConfig from "../CovidDeathPage.config";

const covidPageConfig = {
  id: "covidPage",

  titleKey: {
    ed:         "emergencyDeptPage.mainTitle",
    lab:        "caseDataPage.mainTitle",
    death:      "covidDeathPage.mainTitle",
    wastewater: "wastewaterPage.charts.viralLoad.title",
  },
  subtitleKey: {
    ed:         "emergencyDeptPage.mainSubtitle",
    lab:        "caseDataPage.mainSubtitle",
    death:      "covidDeathPage.mainSubtitle",
    wastewater: null,
  },


  dataPath: {
    ed: edPageConfig.dataPath,
    lab: caseDataPageConfig.dataPath,
    death: covidDeathPageConfig.dataPath,
  },

  controls: {
    ...edPageConfig.controls, // includes viewToggle
  },

  defaultView: edPageConfig.defaultView,

  summary: {
    ed:    { ...edPageConfig.summary },
    lab:   { ...caseDataPageConfig.summary },
    death: { ...covidDeathPageConfig.summary },
  },

  sections: [
    ...edPageConfig.sections,
    ...caseDataPageConfig.sections.filter(
      (s) => !s.showIfVirus || s.showIfVirus === "COVID-19"
    ),
    ...covidDeathPageConfig.sections,
    {
      id: "wastewater-covid",
      navLabel: "Wastewater",
      dataType: "wastewater",
      title: "wastewaterPage.charts.viralLoad.title",
      renderAs: "custom",
      component: "WastewaterChart",
      background: "white",
      wrapInChart: false,
      disableAltTable: true,
      animateOnScroll: true,
      componentProps: { virus: "COVID-19" },
    },
  ],
};

export default covidPageConfig;
