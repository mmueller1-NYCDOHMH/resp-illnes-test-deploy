'use client';

/**
 * AppShell
 *
 * Client component that provides the persistent chrome (sticky header, footer)
 * around every page. Replaces the layout structure that lived in App.jsx.
 *
 * Rendered from the server-side root layout (app/layout.jsx) but marked as a
 * client component so Header/Footer hooks (dark-mode toggle, scroll state, etc.)
 * work correctly.
 */

import Header from '../../src/components/Header/Header';
import Footer from '../../src/components/Footer/Footer';
import PageTransition from './PageTransition';

export default function AppShell({ children }) {
  return (
    <>
      <div className="sticky top-0 z-[100]">
        <Header />
      </div>

      <PageTransition>
        <main id="main-content" className="flex-grow">
          {children}
        </main>
        <Footer />
      </PageTransition>
    </>
  );
}
