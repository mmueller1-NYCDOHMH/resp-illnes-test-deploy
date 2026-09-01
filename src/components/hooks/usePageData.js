/**
 * usePageData
 *
 * Handles config hydration: if the config already embeds data, it passes through
 * immediately. Otherwise it fetches via loadConfigWithData (CSV / JSON via data paths
 * declared in the config) and re-runs whenever virus / view / dataType change.
 *
 * Results are cached in sessionStorage so switching tabs / navigating back is instant.
 * Cache is keyed by `config.id + virus + view + dataType + a section-content
 * fingerprint` and lives for the browser session.
 *
 * The section fingerprint is a cheap hash of the FULL sections array (every
 * field of every section, via JSON.stringify), not just the list of section
 * ids. This exists so that editing a page config during dev — adding a
 * section, removing one, reordering, OR changing a field on an existing
 * section (title copy, infoIcon, modal, chart props, componentProps,
 * anything) — auto-invalidates any stale cache entry instead of silently
 * masking the change: without it, a tab that already visited this exact
 * virus/view/dataType combo earlier in the session would keep serving the
 * old section list from sessionStorage until the tab was closed, even
 * though the config on disk (and after a hard reload) had changed.
 *
 * (Earlier version of this fingerprint only hashed section ids, not field
 * contents — that meant adding e.g. `infoIcon`/`modal` to an existing
 * section didn't bust an already-open tab's stale cache, which caused real
 * confusion during development: a field-level config change appeared to
 * "not show up" even though the file on disk was correct. Hashing the full
 * sections array closes that gap entirely — any section edit now busts the
 * cache, at the cost of a very slightly more expensive fingerprint compute,
 * which is negligible next to the network fetch it's guarding.)
 *
 * @param {object} config
 * @param {{ activeVirus: string, view: string, dataType: string }} pageState
 * @returns {object|null}  hydratedConfig (null while loading)
 */

import { useState, useEffect } from "react";
import { loadConfigWithData } from "../../utils/loadConfigWithData";

const SESSION_PREFIX = "pgdata:";

// Small, fast, non-cryptographic string hash (djb2) — just needs to change
// whenever the serialized sections array changes; collision risk is
// irrelevant here since a false cache "hit" only ever costs a stale render
// within one browser session, never correctness of the underlying data.
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function sectionShapeFingerprint(config) {
  try {
    return hashString(JSON.stringify(config.sections || []));
  } catch {
    // Circular reference or similar — fall back to id-only so caching still
    // degrades gracefully instead of throwing.
    return (config.sections || []).map((s) => s.id || "?").join(",");
  }
}

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
    const cacheKey = `${SESSION_PREFIX}${config.id}:${selectedVirus}:${selectedView}:${safeDataType}:${sectionShapeFingerprint(config)}`;
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
