'use client';

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageStateProvider } from "../../components/hooks/usePageState";
import ConfigDrivenPage from "../../components/layout/ConfigDrivenPage";
import { getPageConfig } from "../config/pageRegistry";

// Ordered list of routable virus slugs for ← / → cycling
const VIRUS_SLUGS = ["covid-19", "flu", "rsv"];

const VirusDataPage = () => {
  const { virus } = useParams();
  const router    = useRouter();
  const config    = getPageConfig(virus);

  // ── Arrow-key navigation across viruses ────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Skip when focus is inside a text input or interactive element
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (document.activeElement?.isContentEditable) return;

      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const current = VIRUS_SLUGS.indexOf(virus ?? "covid-19");
      const next = e.key === "ArrowRight"
        ? (current + 1) % VIRUS_SLUGS.length
        : (current - 1 + VIRUS_SLUGS.length) % VIRUS_SLUGS.length;

      router.push(`/data/${VIRUS_SLUGS[next]}`);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [virus, router]);

  return (
    <PageStateProvider enableDataTypeToggle={true}>
      <ConfigDrivenPage config={config} />
    </PageStateProvider>
  );
};

export default VirusDataPage;
