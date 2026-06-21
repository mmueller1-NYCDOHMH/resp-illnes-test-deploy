'use client';

/**
 * HashRedirectShim
 *
 * Runs once on first load. If the URL contains a hash route left over from the
 * old Vite/HashRouter SPA (e.g. /#/data/covid-19), it redirects the browser to
 * the equivalent Next.js file-based path (/data/covid-19) without a page reload.
 *
 * This preserves bookmarks and shared links from users of the previous version.
 * Safe to remove once the old hash URLs are no longer in circulation.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HashRedirectShim() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;

    // Match #/path or #!/path (hashbang) patterns only — ignore plain anchors like #section-id
    if (!hash || !hash.startsWith('#/')) return;

    // Strip the leading # to get the real path
    const path = hash.slice(1); // "#/data/covid-19" → "/data/covid-19"

    // Replace the current history entry so Back doesn't loop back to the hash URL
    router.replace(path);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
