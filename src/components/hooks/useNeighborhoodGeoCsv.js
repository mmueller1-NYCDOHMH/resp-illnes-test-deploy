// src/components/hooks/useNeighborhoodGeoCsv.js
//
// Loads the case/ED CSVs for the neighborhood choropleth maps.
//
// Reads the live caseData.csv / emergencyDeptData.csv from the
// nychealth/respiratory-illness-data GitHub repo (DATA_PATHS), same URLs as
// the rest of the site, so loadCSVData's cache is shared. The "by
// neighborhood" rows were merged into the live feed by 2026-10-01; the
// local public/data copies are no longer read.
import { useEffect, useState } from "react";
import { loadCSVData } from "../../utils/loadCSVData";
import { DATA_PATHS } from "../../views/config/Data.config";

const CASE_DATA_URL = DATA_PATHS.lab;
const ED_DATA_URL = DATA_PATHS.ed;

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
