// src/components/maps/useMapSelectionMemory.js
//
// Shared by both neighborhood maps (home NeighborhoodMap + per-virus
// LabCasesNeighborhoodMap). Added 2026-09-29. Two jobs:
//
// 1. Shareable map state in the URL — `?uhf=<selected>[,<pinned>]`, e.g.
//    `?uhf=402,105` opens with Long Island City/Astoria (402) selected and
//    Hunts Point/Mott Haven (105) pinned for comparison. Written with
//    history.replaceState (same approach as usePageState's ?dataType=), so
//    clicking around never floods the back button, and every other query
//    param / #hash is preserved. The site's existing Share/Copy-link
//    buttons read window.location, so they pick this up for free.
//
// 2. "My neighborhood" memory — the last neighborhood someone explicitly
//    picked from the search box (name or ZIP) is saved in their browser
//    (see browserMemory.js) and pre-selected on every map next visit.
//    Map clicks and arrow-key browsing deliberately do NOT overwrite it —
//    those are exploration, not "this is where I live."
//
// Restore priority on load: a `?uhf=` link wins (the person opened a
// specific shared view), otherwise their saved area, otherwise nothing.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyArea,
  setMyArea as storeMyArea,
  clearMyArea as removeMyArea,
  subscribeMyArea,
} from "../../utils/browserMemory";

export const URL_PARAM = "uhf";

function parseUhfParam(dataByGeocode) {
  try {
    const raw = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (!raw) return null;
    const [sel, pin] = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .map((n) => (Number.isFinite(n) && dataByGeocode[n] ? n : null));
    if (sel == null) return null;
    return { selected: sel, pinned: pin ?? null };
  } catch {
    return null;
  }
}

function writeUhfParam(selected, pinned) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    // Appended by hand rather than via searchParams.set so the comma stays
    // a literal "," (URLSearchParams would encode it as %2C, which works
    // but makes the link uglier to read/share).
    let search = url.searchParams.toString();
    if (selected != null) {
      const parts = [selected];
      if (pinned != null && pinned !== selected) parts.push(pinned);
      search += `${search ? "&" : ""}${URL_PARAM}=${parts.join(",")}`;
    }
    const next = url.pathname + (search ? `?${search}` : "") + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) window.history.replaceState(window.history.state, "", next);
  } catch {
    /* noop */
  }
}

/**
 * @param {object} opts
 * @param {object} opts.dataByGeocode - geocode -> { name, ... } (all 42 UHF
 *   neighborhoods are present from the first render, before CSV data loads,
 *   so restore can run immediately).
 * @param {number|null} opts.selectedGeocode
 * @param {(g: number|null) => void} opts.setSelectedGeocode
 * @param {(s: string) => void} opts.setSearch
 * @param {number|null} opts.pinnedGeocode
 * @param {(g: number|null) => void} opts.setPinnedGeocode
 */
export default function useMapSelectionMemory({
  dataByGeocode,
  selectedGeocode,
  setSelectedGeocode,
  setSearch,
  pinnedGeocode,
  setPinnedGeocode,
}) {
  const [myArea, setMyAreaState] = useState(null);
  const restoredRef = useRef(false);

  // Keep the chip in sync with storage (other map on the page, other tabs).
  useEffect(() => {
    setMyAreaState(getMyArea());
    return subscribeMyArea(() => setMyAreaState(getMyArea()));
  }, []);

  // One-time restore on mount: shared link first, then saved area.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const fromUrl = parseUhfParam(dataByGeocode);
    if (fromUrl) {
      setSelectedGeocode(fromUrl.selected);
      setSearch(dataByGeocode[fromUrl.selected]?.name ?? "");
      if (fromUrl.pinned != null && fromUrl.pinned !== fromUrl.selected) {
        setPinnedGeocode(fromUrl.pinned);
      }
      return;
    }

    const saved = getMyArea();
    if (saved && dataByGeocode[saved.geocode]) {
      setSelectedGeocode(saved.geocode);
      setSearch(dataByGeocode[saved.geocode].name);
    }
  }, [dataByGeocode, setSelectedGeocode, setSearch, setPinnedGeocode]);

  // Mirror selection + pin into the URL after the restore has run.
  useEffect(() => {
    if (!restoredRef.current) return;
    writeUhfParam(selectedGeocode, pinnedGeocode);
  }, [selectedGeocode, pinnedGeocode]);

  // Called from the search box's onSelect only (see file header).
  const rememberArea = useCallback(
    (geocode) => {
      const name = dataByGeocode[geocode]?.name;
      if (name) storeMyArea(geocode, name);
    },
    [dataByGeocode]
  );

  const forgetArea = useCallback(() => removeMyArea(), []);

  const goToMyArea = useCallback(() => {
    if (!myArea || !dataByGeocode[myArea.geocode]) return;
    setSelectedGeocode(myArea.geocode);
    setSearch(dataByGeocode[myArea.geocode].name);
  }, [myArea, dataByGeocode, setSelectedGeocode, setSearch]);

  return { myArea, rememberArea, forgetArea, goToMyArea };
}
