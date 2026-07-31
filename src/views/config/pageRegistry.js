/**
 * pageRegistry
 *
 * Maps URL slugs to their page config objects.
 * VirusDataPage reads this registry rather than maintaining an inline map.
 *
 * To add a new virus data page:
 *   1. Create its config file under pages/config/virus/
 *   2. Import and register it here with its slug key
 *   No other file needs to change.
 */

import covidPageConfig from "./virus/CovidPage.config";
import fluPageConfig   from "./virus/FluPage.config";
import rsvPageConfig   from "./virus/RsvPage.config";

export const pageRegistry = {
  "covid-19": covidPageConfig,
  "flu":      fluPageConfig,
  "rsv":      rsvPageConfig,
};

/** Slug used when no matching route is found */
export const defaultSlug = "covid-19";

/** Convenience: get a config by slug, falling back to the default */
export const getPageConfig = (slug) =>
  pageRegistry[slug] ?? pageRegistry[defaultSlug];
