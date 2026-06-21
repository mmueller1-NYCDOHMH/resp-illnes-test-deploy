import { DATA_PATHS } from "./Data.config";


const overviewConfig = {
  id: "overviewPage",
  titleKey: "overview.title",
  subtitleKey: "overview.subtitle",
  dataPath: DATA_PATHS.ed,

  controls: {
    viewToggle: false,
    virusToggle: false,
    dataTypeToggle: false,
  },

  // ── Layout overrides for the overview page ───────────────────────────────
  // Revert by removing this block or changing values.
  layout: {
    pageBackground: "gray",
    contentGap: "0px",
    headerBackground: null,
    updateNoteKey: "overview.updateNote",
  },

  sections: [
    {
      id: "stat-cards",
      anchorId: "ed-trends",
      navLabel: "ED Trends",
      renderAs: "custom",
      component: "StatGrid",
      background: "white",
      dataSourceKey: "statCardData",
      disableAltTable: true,
      wrapInChart: false,
      chart: {
        props: {
          metrics: [
            "Respiratory illness visits", "Respiratory illness hospitalizations",
            "COVID-19 visits", "COVID-19 hospitalizations",
            "Influenza visits", "Influenza hospitalizations",
            "RSV visits", "RSV hospitalizations"
          ],
          submetric: "Overall",
          display: "Percent",
        }
      }
    },

    {
      id: "neighborhood-map",
      anchorId: "neighborhood-map",
      navLabel: "Neighborhood Map",
      renderAs: "custom",
      component: "NeighborhoodMap",
      background: "white",
      wrapInChart: false,
      disableAltTable: true,
      animateOnScroll: true,
    },

    {
      id: "other-resp-paragraph",
      anchorId: "panel-results",
      navLabel: "Panel Results",
      title: "overview.otherResp.title",
      infoIcon: true,
      downloadIcon: true,
      renderAs: "custom",
      component: "DynamicParagraph",
      dataSourceKey: "otherRespData",
      modal: {
        title: "overview.otherResp.title",
        markdownPath: "content/modals/metric-explainer.md",
      },
      componentProps: {
        textKeyBase: "overview.otherResp",
        display: "Percent",
        dataPath: DATA_PATHS.ed,
        order: [
          "Adenovirus",
          "Human Coronavirus",
          "SARS-CoV-2",
          "Enterovirus/Rhinovirus",
          "Human Metapneumovirus",
          "Influenza",
          "Parainfluenza",
          "Respiratory Syncytial Virus"
        ]
      },
      animateOnScroll: true,
      background: "white"
    },

    {
      id: "overview-disclaimer",
      renderAs: "custom",
      component: "DisclaimerNote",
      background: "transparent",
      wrapInChart: false,
      animateOnScroll: false,
      componentProps: {
        textKey: "overview.disclaimer",
      },
    },
  ],
};

export default overviewConfig;
