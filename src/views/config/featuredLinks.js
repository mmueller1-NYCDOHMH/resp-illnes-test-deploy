/**
 * featuredLinks.js
 *
 * Cross-page "Jump to" links shown in the home sidebar.
 * Edit this file to add, remove, or reorder entries.
 *
 * URL format:
 *   /data/<virus>               — defaults to ED dataType
 *   /data/<virus>?dataType=lab  — opens the Lab Cases tab
 *   /data/<virus>#<section-id>  — scrolls to that section after load
 *   Both can be combined: /data/covid-19?dataType=lab#case-reports-season
 *
 * Available dataType values: ed | lab | death | wastewater
 *
 * Future / GA integration:
 *   Replace the static array below with a fetch from the GA Data API
 *   (e.g. GA4 runReport for top pageview + hash combinations).
 *   The sidebar component expects the same { label, href } shape, so
 *   swapping the source requires no component changes.
 */

const featuredLinks = [
  {
    label: "COVID-19 ED Trends",
    href: "/data/covid-19#ed-trends",
  },
  {
    label: "COVID-19 Lab Cases by Season",
    href: "/data/covid-19?dataType=lab#case-reports-season",
  },
  {
    label: "Lab Cases by Neighborhood",
    href: "/data/covid-19?dataType=lab#case-reports-neighborhood",
  },
  {
    label: "Flu ED Trends",
    href: "/data/flu#ed-trends",
  },
];

export default featuredLinks;
