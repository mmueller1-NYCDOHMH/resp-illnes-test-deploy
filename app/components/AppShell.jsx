'use client';

/**
 * AppShell
 *
 * Client component that provides the persistent chrome (header, sticky nav,
 * footer) around every page. Replaces the layout structure that lived in
 * App.jsx.
 *
 * Header (blue banner) scrolls away normally — it's only visible at the top
 * of the page. NavBar is the only piece that stays pinned, in its own sticky
 * block directly below the Header. A ResizeObserver measures that sticky
 * block's height into the --header-h CSS variable so any sticky element
 * further down the page (e.g. DataPageLayout's sidebar) can offset itself
 * with `top-[var(--header-h)]` instead of a hardcoded value — since NavBar
 * is the only thing still pinned once the user has scrolled, --header-h
 * tracks its height rather than the combined Header+NavBar height.
 *
 * Rendered from the server-side root layout (app/layout.jsx) but marked as a
 * client component so Header/NavBar/Footer hooks (dark-mode toggle, scroll
 * state, etc.) work correctly.
 */

import { useEffect, useRef } from 'react';
import Header from '../../src/components/Header/Header';
import NavBar from '../../src/components/Header/NavBar';
import Footer from '../../src/components/Footer/Footer';
import PageTransition from './PageTransition';

export default function AppShell({ children }) {
  const navRef = useRef(null);

  useEffect(() => {
    const node = navRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${node.offsetHeight}px`);
    };

    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />

      <div ref={navRef} className="sticky top-0 z-[100] w-full bg-white border-b border-[var(--gray-200)]">
        <div className="w-full max-w-content mx-auto px-md">
          <NavBar />
        </div>
      </div>

      <PageTransition>
        <main id="main-content" className="flex-grow pt-10">
          {children}
        </main>
        <Footer />
      </PageTransition>
    </>
  );
}
