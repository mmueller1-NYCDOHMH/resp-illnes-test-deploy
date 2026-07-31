// src/utils/loadConfigWithData.js
import { loadCSVData } from "./loadCSVData";
import { hydrateConfigData } from "./filterMetricData";
import { interpolate } from "./interpolate";
import { toSourceVirus } from "./virusMap";
import { DATA_PATHS_BLOB } from "../views/config/Data.config";
import { groupByMetric } from "./groupByMetric";

/**
 * Fetch the latest commit date from the GitHub API for a blob URL.
 */
async function getGitHubFileUploadDate(url) {
  try {
    const match = url.match(
      /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/
    );
    if (!match) return null;

    const [, owner, repo, branch, path] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(
      path
    )}&sha=${branch}&page=1&per_page=1`;

    const res = await fetch(apiUrl);
    if (!res.ok) return null;

    const commits = await res.json();
    const latest = commits?.[0]?.commit?.committer?.date;
    return latest ? new Date(latest) : null;
  } catch {
    return null;
  }
}

/**
 * Load page config and hydrate each section with filtered data.
 * Layout metadata is preserved and never passed into hydration.
 */
export async function loadConfigWithData(config, variables = {}) {
  if (!config?.dataPath) {
    throw new Error("Config is missing 'dataPath'");
  }

  /* ------------------------------------------------------------------
   * Resolve dataPath
   * ------------------------------------------------------------------ */
  let resolvedDataPath = config.dataPath;
  const dataType = variables.dataType || config.defaultDataType || "ed";

  if (typeof resolvedDataPath === "object" && resolvedDataPath !== null) {
    resolvedDataPath = resolvedDataPath[dataType];
    if (!resolvedDataPath) {
      // No remote data source for this dataType (e.g. "wastewater").
      // Custom sections that self-fetch will still render correctly.
      return {
        ...config,
        uploadDate: null,
        data: { statCardData: {}, __raw: [] },
      };
    }
  }

  if (typeof resolvedDataPath !== "string") {
    throw new Error("Invalid dataPath");
  }

  /* ------------------------------------------------------------------
   * Upload date (GitHub)
   * ------------------------------------------------------------------ */
  const blobUrl =
    typeof DATA_PATHS_BLOB === "object" ? DATA_PATHS_BLOB[dataType] : null;

  const uploadDate = blobUrl
    ? await getGitHubFileUploadDate(blobUrl)
    : null;

  /* ------------------------------------------------------------------
   * Load raw data
   * ------------------------------------------------------------------ */
  const rawData = await loadCSVData(resolvedDataPath);
  const statCardData = groupByMetric(rawData);

  /* ------------------------------------------------------------------
   * Interpolation variables
   * ------------------------------------------------------------------ */
  const resolvedVirus = toSourceVirus(variables.virus);

  const resolvedVars = {
    ...variables,
    virus: resolvedVirus,
    view: variables.view || config.defaultView || "visits",
    dataType,
    display: (config.defaultDisplay || "Percent").trim().toLowerCase(),
  };

  /* ------------------------------------------------------------------
   * Strip layout metadata BEFORE hydration
   * ------------------------------------------------------------------ */
  const layoutMetaById = new Map();

  const resolvedConfig = {
    ...config,
    sections: (config.sections || []).map((section) => {
      const {
        id,
        showIfVirus,
        dataType,
        renderAs,
        animateOnScroll,
        background,
        wrapInChart,
        component,
        componentProps,
        ...rest
      } = section;

      // Store layout-only metadata safely
      layoutMetaById.set(id, {
        showIfVirus,
        dataType,
        renderAs,
        animateOnScroll,
        background,
        wrapInChart,
        component,
        componentProps,
      });

      const chart = section.chart || {};
      const props = chart.props || {};

      const interpolatedProps = Object.fromEntries(
        Object.entries(props).map(([key, val]) => {
          if (typeof val === "string") {
            const interpolated = interpolate(val, resolvedVars);
            if (key === "display") {
              return [key, interpolated.trim().toLowerCase()];
            }
            return [key, interpolated];
          }
          return [key, val];
        })
      );

      if (interpolatedProps.submetric === "undefined") {
        interpolatedProps.submetric = undefined;
      }

      if (
        !interpolatedProps.metricName &&
        typeof props.getMetricNames === "function"
      ) {
        interpolatedProps.metricName = props.getMetricNames({
          virus: resolvedVirus,
          view: resolvedVars.view,
        });
      }

      return {
        id,
        ...rest,
        chart: {
          ...chart,
          props: interpolatedProps,
        },
      };
    }),
  };

  /* ------------------------------------------------------------------
   * Merge vars for hydration
   * ------------------------------------------------------------------ */
  const mergedVars = {
    ...resolvedVars,
    ...Object.fromEntries(
      resolvedConfig.sections.flatMap((s) =>
        Object.entries(s.chart?.props || {})
      )
    ),
  };

  /* ------------------------------------------------------------------
   * Hydrate data (chart-only)
   * ------------------------------------------------------------------ */
  const hydratedConfig = hydrateConfigData(
    resolvedConfig,
    rawData,
    mergedVars
  );

  /* ------------------------------------------------------------------
   * Re-attach layout metadata AFTER hydration
   * ------------------------------------------------------------------ */
  hydratedConfig.sections = hydratedConfig.sections.map((section) => {
    const meta = layoutMetaById.get(section.id);
    return meta ? { ...section, ...meta } : section;
  });

  return {
    ...hydratedConfig,
    uploadDate,
    data: {
      ...hydratedConfig.data,
      statCardData,
      __raw: rawData

    },
  };
  
  
}
