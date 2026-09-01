import edPageConfig from "../EmergencyDeptPage.config";
import caseDataPageConfig from "../CaseDataPage.config";
import covidDeathPageConfig from "../CovidDeathPage.config";
import { resolveAsset } from "../../../utils/pathUtils";

const covidPageConfig = {
  id: "covidPage",

  titleKey: {
    ed:         "emergencyDeptPage.mainTitle",
    lab:        "caseDataPage.mainTitle",
    death:      "covidDeathPage.mainTitle",
    wastewater: "wastewaterPage.mainTitle",
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
    wastewater: {
      title: "Page Overview",
      markdownPath: "content/sections/wastewaterSectionText-covid.md",
      showTrendArrow: false,
      showSecondaryTitle: false,
    },
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
      disableAltTable: true,
      animateOnScroll: true,
      downloadIcon: true,
      componentProps: {
        virus: "COVID-19",
        // WastewaterChart self-fetches from this same file, so there's no
        // filtered row set for the CSV button to export — this path feeds
        // the "raw file" fallback in buildDownloadHandler instead.
        dataPath: resolveAsset("data/wastewaterData.csv"),
        downloadDescription:
          "Downloads the full wastewater dataset (all viruses and metrics).",
      },
    },
    // COVID-only: RPU's variant breakdown only exists for SARS-CoV-2
    // wastewater sequencing, not Flu/RSV — see WastewaterVariantChart.jsx.
    {
      id: "wastewater-covid-variants",
      navLabel: "Variants",
      dataType: "wastewater",
      title: "wastewaterPage.charts.variants.title",
      renderAs: "custom",
      component: "WastewaterVariantChart",
      background: "white",
      disableAltTable: true,
      animateOnScroll: true,
      infoIcon: true,
      downloadIcon: true,
      modal: {
        title: "About SARS-CoV-2 variants in wastewater",
        markdownPath: "content/modals/wastewater-variants-explainer.md",
      },
      componentProps: {
        // Same self-fetching situation as WastewaterChart — this feeds
        // buildDownloadHandler's "raw file" fallback for the CSV button.
        dataPath: resolveAsset("data/wastewaterData.csv"),
        downloadDescription:
          "Downloads the full wastewater dataset (all viruses and metrics).",
      },
    },
  ],
};

export default covidPageConfig;
