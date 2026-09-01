// src/components/hooks/useNeighborhoodGeoCsv.js
//
// Loads the case/ED CSVs for the neighborhood choropleth maps.
//
// Every other chart on this site reads DATA_PATHS.lab / DATA_PATHS.ed —
// the *live* caseData.csv / emergencyDeptData.csv on the production
// nychealth/respiratory-illness-data GitHub repo (see Data.config.js). As
// of 2026-08-19 that live feed does not yet include the "by neighborhood"
// rows this hook needs — RPU's new geo-enabled files are staging-only for
// now (Hilary Parton's "RPU webpage - new long files for staging" email,
// 2026-08-18). So for just this UHF geo data, load from the local
// public/data copies instead, which have been updated with RPU's staged
// files (see public/data/caseData.csv, emergencyDeptData.csv).
//
// TODO: once RPU merges "by neighborhood" rows into the live feed, point
// this hook at DATA_PATHS.lab / DATA_PATHS.ed like the rest of the site
// (see project memory: the trending-sidebar fix already made that switch
// for its own data) and delete the local public/data copies.
import { useEffect, useState } from "react";
import { loadCSVData } from "../../utils/loadCSVData";
import { resolvePublicPath } from "../../utils/pathUtils";

const CASE_DATA_URL = resolvePublicPath("data/caseData.csv");
const ED_DATA_URL = resolvePublicPath("data/emergencyDeptData.csv");

/**
 * @returns {{ caseRows: object[], edRows: object[], loading: boolean, error: boolean, snapshotDate: Date|null }}
 */
export default function useNeighborhoodGeoCsv() {
  const [state, setState] = useState({
    caseRows: [],
    edRows: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCSVData(CASE_DATA_URL), loadCSVData(ED_DATA_URL)])
      .then(([caseRows, edRows]) => {
        if (cancelled) return;
        setState({ caseRows, edRows, loading: false, error: false });
      })
      .catch((err) => {
        console.error("[useNeighborhoodGeoCsv] load failed:", err);
        if (cancelled) return;
        setState({ caseRows: [], edRows: [], loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Latest date among any "by neighborhood" row — the CSVs currently ship
  // one snapshot week for the geo rows, but this doesn't assume that stays
  // true. Falls back to null (callers should keep their own placeholder)
  // if nothing's loaded yet.
  const snapshotDate = [...state.caseRows, ...state.edRows]
    .filter((r) => r.metric?.includes("by neighborhood") && r.date)
    .reduce((max, r) => (max == null || r.date > max ? r.date : max), null);

  return { ...state, snapshotDate };
}
