/**
 * usePageData
 *
 * Handles config hydration: if the config already embeds data, it passes through
 * immediately. Otherwise it fetches via loadConfigWithData (CSV / JSON via data paths
 * declared in the config) and re-runs whenever virus / view / dataType change.
 *
 * Results are cached in sessionStorage so switching tabs / navigating back is instant.
 * Cache is keyed by `config.id + virus + view + dataType` and lives for the browser session.
 *
 * @param {object} config
 * @param {{ activeVirus: string, view: string, dataType: string }} pageState
 * @returns {object|null}  hydratedConfig (null while loading)
 */

import { useState, useEffect } from "react";
import { loadConfigWithData } from "../../utils/loadConfigWithData";

const SESSION_PREFIX = "pgdata:";

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private-browsing restriction — degrade silently
  }
}

const usePageData = (config, { activeVirus, view, dataType }) => {
  const [hydratedConfig, setHydratedConfig] = useState(null);

  useEffect(() => {
    // Config already carries inline data — no fetch needed, no caching
    if (config.data) {
      setHydratedConfig(config);
      return;
    }

    const selectedVirus = activeVirus || config.defaultVirus || "COVID-19";
    const selectedView  = view       || config.defaultView  || "visits";
    const safeDataType  = dataType   || "ed";

    // ── Check session cache first ──────────────────────────────────────────
    const cacheKey = `${SESSION_PREFIX}${config.id}:${selectedVirus}:${selectedView}:${safeDataType}`;
    const cached = readCache(cacheKey);
    if (cached) {
      setHydratedConfig(cached);
      return;
    }

    // ── Fetch and cache ────────────────────────────────────────────────────
    loadConfigWithData(config, {
      virus: selectedVirus,
      view: selectedView,
      dataType: safeDataType,
    })
      .then((result) => {
        writeCache(cacheKey, result);
        setHydratedConfig(result);
      })
      .catch(console.error);
  }, [config, activeVirus, view, dataType]);

  return hydratedConfig;
};

export default usePageData;
