'use client';

// force-dynamic prevents Next.js from statically rendering this page,
// which is required because it uses useSearchParams inside PageStateProvider.
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import OverviewPage from '../src/views/Overview/OverviewPage';

export default function Page() {
  return (
    <Suspense>
      <OverviewPage />
    </Suspense>
  );
}
