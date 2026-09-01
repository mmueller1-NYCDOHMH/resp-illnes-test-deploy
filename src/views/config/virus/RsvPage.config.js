import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";
import { resolveAsset } from "../../../utils/pathUtils";


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
    wastewater: "wastewaterPage.mainTitle",
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
    wastewater: {
      title: "Page Overview",
      markdownPath: "content/sections/wastewaterSectionText-rsv.md",
      showTrendArrow: false,
      showSecondaryTitle: false,
    },
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
      disableAltTable: true,
      animateOnScroll: true,
      downloadIcon: true,
      componentProps: {
        virus: "RSV",
        // WastewaterChart self-fetches from this same file, so there's no
        // filtered row set for the CSV button to export — this path feeds
        // the "raw file" fallback in buildDownloadHandler instead.
        dataPath: resolveAsset("data/wastewaterData.csv"),
        downloadDescription:
          "Downloads the full wastewater dataset (all viruses and metrics).",
      },
    },
  ],
};

export default rsvPageConfig;
