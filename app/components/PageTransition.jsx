'use client';

/**
 * PageTransition
 *
 * Re-triggers the .page-enter CSS animation on every route change.
 * Replaces the React Router location-keyed version from App.jsx.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth; // force reflow so re-adding the class triggers the animation
    el.classList.add('page-enter');
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
