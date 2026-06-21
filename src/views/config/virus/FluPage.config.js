import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";

const fluPageConfig = {
  id: "fluPage",
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
  },

  controls: {
    ...edPageConfig.controls,
  },

  defaultView: edPageConfig.defaultView,

  summary: {
    ed:    { ...edPageConfig.summary },
    lab:   { ...caseDataPageConfig.summary },
  },

  sections: [
    ...edPageConfig.sections,
    ...caseDataPageConfig.sections.filter(
      (s) => !s.showIfVirus || s.showIfVirus === "Flu"
    ),
    {
      id: "wastewater-flu",
      navLabel: "Wastewater",
      dataType: "wastewater",
      title: "wastewaterPage.charts.viralLoad.title",
      renderAs: "custom",
      component: "WastewaterChart",
      background: "white",
      wrapInChart: false,
      disableAltTable: true,
      animateOnScroll: true,
      componentProps: { virus: "Flu" },
    },
  ],
};

export default fluPageConfig;
