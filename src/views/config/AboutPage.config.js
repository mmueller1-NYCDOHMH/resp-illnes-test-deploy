// src/views/config/AboutPage.config.js
import rawAboutCards from "../../data/aboutCards.json";
import { resolveAsset, resolveContentPath } from "../../utils/pathUtils";

// Resolve relative asset paths against the deployment base URL
const resolveAssets = (card) => ({
  ...card,
  icon: card.icon?.startsWith("http")
    ? card.icon
    : card.icon ? resolveAsset(card.icon.replace(/^\.?\//, "")) : undefined,
  externalIcon: card.externalIcon?.startsWith("http")
    ? card.externalIcon
    : card.externalIcon ? resolveAsset(card.externalIcon.replace(/^\.?\//, "")) : undefined,
});

const aboutCards = Object.fromEntries(
  Object.entries(rawAboutCards).map(([group, cards]) => [
    group,
    cards.map(resolveAssets),
  ])
);

const aboutPageConfig = {
  id: "aboutPage",
  titleKey: "aboutPage.mainTitle",
  subtitleMarkdownPath: "content/about-intro.md",
  controls: { dataTypeToggle: false, virusToggle: false, viewToggle: false },

  sections: [
    {
      id: "provider-info",
      titleKey: "",
      renderAs: "cards",
      subtitle: "Find health information and guidance for each illness:",
      markdownSection: "Learn about Respiratory Illnesses",
      cards: aboutCards["provider-info"],
    },

    {
      id: "data-group",
      renderAs: "paragraph-group",
      groupTitleKey: "Data Information",
      items: [
        {
          id: "about-data",
          titleKey: "About the Data",
          markdownPath: resolveContentPath('content/sections/about/about-data.md'),
        },
        {
          id: "archived",
          titleKey: "Archived Data on Respiratory Illnesses in NYC",
          markdownPath: resolveContentPath('content/sections/about/archived.md'),
        },
        {
          id: "ed-visits",
          titleKey: "Emergency Department Visits and Hospitalizations",
          markdownPath: resolveContentPath('content/sections/about/ed-visits.md'),
        },
        {
          id: "lab-reports",
          titleKey: "Laboratory-Reported Cases",
          markdownPath: resolveContentPath('content/sections/about/lab-reports.md'),
        },
        {
          id: "covid-deaths",
          titleKey: "COVID‑19 Deaths",
          markdownPath: resolveContentPath('content/sections/about/covid-deaths.md'),
        },
        {
          id: "flu-peds-deaths",
          titleKey: "COVID-19-, Flu-, and RSV-Associated Pediatric Deaths",
          markdownPath: resolveContentPath('content/sections/about/flu-peds-deaths.md'),
        },
        {
          id: "inequities",
          titleKey: "Health Inequities",
          markdownPath: resolveContentPath('content/sections/about/inequities.md'),
        },
        {
          id: "seasonality",
          titleKey: "Respiratory Virus Seasonality",
          markdownPath: resolveContentPath('content/sections/about/seasonality.md'),
        },
        {
          id: "transparency",
          titleKey: "Data Transparency",
          markdownPath: resolveContentPath('content/sections/about/transparency.md'),
        },
      ],
    },

    {
      id: "using-this-site",
      renderAs: "paragraph-group",
      variant: "guide",
      groupTitleKey: "Using This Site",
      items: [
        {
          id: "using-navigating",
          titleKey: "Navigating the Site",
          markdownPath: resolveContentPath('content/sections/about/using-navigating.md'),
          iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
          iconViewBox: "0 0 24 24",
        },
        {
          id: "using-charts",
          titleKey: "Reading the Charts",
          markdownPath: resolveContentPath('content/sections/about/using-charts.md'),
          iconPath: "M3 3v18h18 M7 16l4-4 4 4 4-8",
          iconViewBox: "0 0 24 24",
        },
        {
          id: "using-interactions",
          titleKey: "Interacting with Charts",
          markdownPath: resolveContentPath('content/sections/about/using-interactions.md'),
          iconPath: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5",
          iconViewBox: "0 0 24 24",
        },
        {
          id: "using-data-access",
          titleKey: "Accessing the Raw Data",
          markdownPath: resolveContentPath('content/sections/about/using-data-access.md'),
          iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
          iconViewBox: "0 0 24 24",
        },
      ],
    },

    {
      id: "additional-resources",
      titleKey: "Additional Resources",
      renderAs: "cards",
      markdownSection: "Additional Resources",
      cards: aboutCards["additional-resources"],
    },
  ],
};

export default aboutPageConfig;
