// Server component wrapper (no 'use client') so Next can pre-render the
// page shell for each known virus at build time.
//
// PERF (2026-09-29): this used to be a client component with
// `force-dynamic`, which made /data/[virus] server-rendered on every request
// (ƒ in the build output) even though all data loads client-side anyway.
// generateStaticParams lets the three data pages ship as static HTML like
// the home page does — faster first byte, cacheable by any CDN/static host,
// and a prerequisite if the agency server ends up being static-only.
// Unknown slugs still work (dynamicParams defaults to true) and fall back to
// the COVID config exactly as before.

import { Suspense } from 'react';
import VirusDataPage from '../../../src/views/DataExplorer/VirusDataPage';
import { pageRegistry } from '../../../src/views/config/pageRegistry';

export function generateStaticParams() {
  return Object.keys(pageRegistry).map((virus) => ({ virus }));
}

export default function Page() {
  return (
    <Suspense>
      <VirusDataPage />
    </Suspense>
  );
}
