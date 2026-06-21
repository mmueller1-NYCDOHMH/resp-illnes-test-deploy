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
  subtitleKey: "aboutPage.mainSubtitle",
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
      id: "additional-resources",
      titleKey: "Additional Resources",
      renderAs: "cards",
      markdownSection: "Additional Resources",
      cards: aboutCards["additional-resources"],
    },
  ],
};

export default aboutPageConfig;
