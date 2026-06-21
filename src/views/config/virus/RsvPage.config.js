import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";


const RSV_CONTEXT = {
  virus: "RSV",
  dataType: "lab",
  view: undefined,
};


function includeSectionForRSV(section) {
  if (typeof section.showWhen === "function") {
    return section.showWhen(RSV_CONTEXT);
  }

  if (section.showIfVirus) {
    const allowed = Array.isArray(section.showIfVirus)
      ? section.showIfVirus
      : [section.showIfVirus];

    return allowed.includes("RSV");
  }

  return true;
}

const rsvPageConfig = {
  id: "rsvPage",

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
    ed:  { ...edPageConfig.summary },
    lab: { ...caseDataPageConfig.summary },
  },

  sections: [
    ...edPageConfig.sections,

    ...caseDataPageConfig.sections.filter(includeSectionForRSV),
    {
      id: "wastewater-rsv",
      navLabel: "Wastewater",
      dataType: "wastewater",
      title: "wastewaterPage.charts.viralLoad.title",
      renderAs: "custom",
      component: "WastewaterChart",
      background: "white",
      wrapInChart: false,
      disableAltTable: true,
      animateOnScroll: true,
      componentProps: { virus: "RSV" },
    },
  ],
};

export default rsvPageConfig;
