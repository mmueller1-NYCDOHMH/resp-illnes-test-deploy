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

  const [view, setView] = useState("visits");

  // The ONLY source of truth for activeVirus:
  const activeVirus = useMemo(() => {
    if (!enableVirusToggle) return null;
    if (!virusParam) return "COVID-19";
    const meta = virusBySlug[virusParam];
    if (meta) return meta.displayName;
    // fallback for unrecognized param
    return virusParam.charAt(0).toUpperCase() + virusParam.slice(1).toLowerCase();
  }, [virusParam, enableVirusToggle]);

  // The ONLY setter — derives slug from virusRegistry (e.g. "COVID-19" → "covid-19")
  const updateVirus = (newVirus) => {
    const slug = virusRegistry[newVirus]?.slug || newVirus.toLowerCase();
    router.push(`/data/${slug}`);
  };

  const [dataType, setDataType] = useState(() => {
    if (!enableDataTypeToggle) return null;
    // Seed from ?dataType= query param on initial load (supports deep links)
    const param = searchParams.get("dataType");
    return param || initialDataType || "ed";
  });

  // Sync dataType when the URL search params change (same-page deep-link navigation)
  useEffect(() => {
    if (!enableDataTypeToggle) return;
    const param = searchParams.get("dataType");
    if (param && param !== dataType) setDataType(param);
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
