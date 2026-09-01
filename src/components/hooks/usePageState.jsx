'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { downloadCSV } from "../../utils/downloadUtils";
import { virusBySlug, virusRegistry } from "../../utils/virusRegistry";

export const PageStateContext = createContext();
export const usePageState = () => useContext(PageStateContext);

export const PageStateProvider = ({
  children,
  initialData = [],
  enableVirusToggle = true,
  enableDataTypeToggle = false,
  initialDataType = "ed",  
}) => {
  const { virus: virusParam } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed from ?view= query param on initial load (supports deep links) — same
  // pattern as dataType below. Previously this was a bare useState("visits"),
  // so `view` never read from or wrote to the URL: switching to
  // Hospitalizations and clicking Share copied a link that silently reverted
  // to Visits for whoever opened it, since the URL never reflected the
  // change in the first place.
  const [view, setView] = useState(() => {
    const param = searchParams.get("view");
    return param === "hospitalizations" ? "hospitalizations" : "visits";
  });

  // The ONLY source of truth for activeVirus:
  const activeVirus = useMemo(() => {
    if (!enableVirusToggle) return null;
    if (!virusParam) return "COVID-19";
    const meta = virusBySlug[virusParam];
    if (meta) return meta.displayName;
    // fallback for unrecognized param
    return virusParam.charAt(0).toUpperCase() + virusParam.slice(1).toLowerCase();
  }, [virusParam, enableVirusToggle]);

  const [dataType, setDataType] = useState(() => {
    if (!enableDataTypeToggle) return null;
    // Seed from ?dataType= query param on initial load (supports deep links)
    const param = searchParams.get("dataType");
    return param || initialDataType || "ed";
  });

  // The ONLY setter — derives slug from virusRegistry (e.g. "COVID-19" → "covid-19").
  // Carries the current dataType (e.g. "cases", "death") along in the URL so
  // switching viruses keeps the user on the same data topic instead of
  // bouncing back to the "ed" default — the new route's page mount seeds its
  // dataType state from this same ?dataType= query param.
  const updateVirus = (newVirus) => {
    const slug = virusRegistry[newVirus]?.slug || newVirus.toLowerCase();
    const target =
      enableDataTypeToggle && dataType && dataType !== "ed"
        ? `/data/${slug}?dataType=${dataType}`
        : `/data/${slug}`;
    router.push(target);
  };

  // Sync dataType when the URL search params change (same-page deep-link navigation)
  useEffect(() => {
    if (!enableDataTypeToggle) return;
    const param = searchParams.get("dataType");
    if (param && param !== dataType) setDataType(param);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync view when the URL search params change (same-page deep-link
  // navigation, e.g. browser back/forward) — same pattern as dataType above.
  useEffect(() => {
    const param = searchParams.get("view");
    const next = param === "hospitalizations" ? "hospitalizations" : "visits";
    if (next !== view) setView(next);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data type fix for viruses that do not support deaths
  useEffect(() => {
    if ((activeVirus === "Flu" || activeVirus === "RSV") && dataType === "death") {
      setDataType("ed");
    }
  }, [activeVirus, dataType]);

  // Sync dataType to URL search params so Share captures the active tab
  useEffect(() => {
    if (!enableDataTypeToggle) return;
    const url = new URL(window.location.href);
    if (!dataType || dataType === "ed") {
      url.searchParams.delete("dataType");
    } else {
      url.searchParams.set("dataType", dataType);
    }
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [dataType, enableDataTypeToggle]);

  // Sync view (visits/hospitalizations) to URL search params so Share
  // captures the active toggle — same pattern as the dataType sync above.
  // This is the actual fix for the Share/deep-link bug: without this effect
  // `view` only ever lived in React state, so the URL never changed when the
  // toggle did.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!view || view === "visits") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [view]);

  const handleDownload = () => {
    const filtered = initialData.map(({ week, season, visits }) => ({
      week,
      season,
      [view]: visits,
    }));
    const prefix =
      enableVirusToggle && activeVirus
        ? `${activeVirus.toLowerCase()}-`
        : enableDataTypeToggle && dataType
        ? `${dataType}-`
        : "";
    downloadCSV(filtered, `${prefix}${view}-seasonal.csv`);
  };

  return (
    <PageStateContext.Provider
      value={{
        view,
        setView,
        handleDownload,
        activeVirus,
        setActiveVirus: updateVirus, // always updates the route, never state
        setVirus: updateVirus,
        dataType,
        setDataType,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
};
