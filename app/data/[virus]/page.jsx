'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import VirusDataPage from '../../../src/views/DataExplorer/VirusDataPage';

export default function Page() {
  return (
    <Suspense>
      <VirusDataPage />
    </Suspense>
  );
}
