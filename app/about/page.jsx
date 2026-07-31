'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AboutPage from '../../src/views/About/AboutPage';

export default function Page() {
  return (
    <Suspense>
      <AboutPage />
    </Suspense>
  );
}
