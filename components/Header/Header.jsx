/**
 * Header
 *
 * Single unified branded bar — merges the former TopBar and banner into one
 * blue gradient strip. Contains:
 *   - NYC Health logo (white-filtered for the dark background)
 *   - Site title + tagline
 *   - Language toggle (right-aligned)
 *
 * Dark-mode toggle has been hidden per design decision; the theme system
 * remains wired (DataPageLayout / tokens.css) and can be re-exposed later.
 *
 * Google Translate suppression CSS lives in index.css.
 * TopBar.css (language-select + toggle-switch styles) is imported by
 * LanguageToggle.jsx, which is the component that actually uses those classes.
 */

import React from "react";
import { resolveAsset } from "../../utils/pathUtils";

const logoPath = resolveAsset('assets/NYC_Health_color_main.png');

const Header = () => (
  /* notranslate: prevent Google Translate from mangling the UI chrome */
  <header className="w-full notranslate bg-blue-primary border-b border-white/[0.12]">
    <div className="w-full max-w-content mx-auto box-border flex items-center justify-between gap-md min-h-[56px] py-[10px] px-md">

      {/* ── Left: NYC Health logo + site title ── */}
      <div className="flex items-center gap-md min-w-0">
        <a
          href="https://www.nyc.gov/site/doh/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
          aria-label="NYC Health — opens in a new tab"
        >
          <img
            src={logoPath}
            alt="NYC Health"
            className="object-contain block"
            style={{
              height: "clamp(26px, 5vw, 34px)",
              maxWidth: "clamp(80px, 18vw, 110px)",
              filter: "brightness(0) invert(1)",
            }}
          />
        </a>

        {/* Thin vertical divider */}
        <div aria-hidden="true" className="w-px h-8 bg-white/30 flex-shrink-0" />

        <div className="min-w-0">
          <p
            className="font-heading font-bold leading-tight m-0 text-header-title-color"
            style={{ fontSize: "clamp(15px, 2vw, 20px)" }}
          >
            Respiratory Illness Data
          </p>
          <p
            className="font-body m-0 leading-tight hidden sm:block text-header-subtitle-color mt-[2px] opacity-85"
            style={{ fontSize: "11px" }}
          >
            NYC Department of Health and Mental Hygiene
          </p>
        </div>
      </div>

    </div>
  </header>
);

export default Header;
