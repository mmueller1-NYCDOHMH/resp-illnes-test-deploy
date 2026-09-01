import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";
import { resolveAsset } from "../../../utils/pathUtils";

const fluPageConfig = {
  id: "fluPage",
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
    ed:    { ...edPageConfig.summary },
    lab:   { ...caseDataPageConfig.summary },
    wastewater: {
      title: "Page Overview",
      markdownPath: "content/sections/wastewaterSectionText-flu.md",
      showTrendArrow: false,
      showSecondaryTitle: false,
    },
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
      disableAltTable: true,
      animateOnScroll: true,
      downloadIcon: true,
      componentProps: {
        virus: "Flu",
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

export default fluPageConfig;
