// src/components/TopBar/TopBar.jsx
import React, { useEffect, useState } from "react";
import "./TopBar.css"; // retains only: toggle-switch pseudo-elements + Google Translate suppression
import { resolveAsset } from "../../utils/pathUtils";

const logoPath = resolveAsset('assets/NYC_Health_color_main.png');

const TopBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light"
  );

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    // notranslate prevents Google from altering the bar's UI text
    <div className="bg-top-bar-bg text-top-bar-text w-full py-2 border-b border-top-bar-border relative z-10 notranslate">
      <div className="mx-auto px-4 flex items-center justify-between flex-wrap gap-4">

        {/* Logo */}
        <a href="https://www.nyc.gov/site/doh/" target="_blank" rel="noopener noreferrer">
          <img
            src={logoPath}
            alt="NYC Health Logo"
            className="h-[38px] max-w-[120px] object-contain block [filter:var(--top-bar-logo-filter,none)]"
          />
        </a>

        {/* Hamburger: hidden on desktop (≥640px), shown on mobile */}
        <button
          className={[
            "flex-col justify-center items-center gap-[5px]",
            "bg-transparent border-0 cursor-pointer p-2",
            // visible only on mobile
            "flex sm:hidden",
          ].join(" ")}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="top-bar-nav"
          type="button"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-6 h-0.5 bg-top-bar-text rounded-sm" />
          ))}
        </button>

        {/* Mobile nav panel — shown when hamburger is open */}
        <div
          id="top-bar-nav"
          className={[
            "w-full",
            menuOpen ? "flex flex-col items-end gap-3 p-3" : "hidden",
            // always hide above mobile breakpoint
            "sm:hidden",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--modal-text)]">
              {theme === "dark" ? "Dark" : "Light"} Mode
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
              <span className="slider">
                <span className="icon">{theme === "dark" ? "🌙" : "☀️"}</span>
              </span>
            </label>
          </div>
        </div>

        {/* Desktop extras — hidden on mobile (< 640px) */}
        <div className="hidden sm:flex items-center gap-4 ml-auto flex-wrap">
          <div className="flex items-center gap-2">
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
              <span className="slider">
                <span className="icon">{theme === "dark" ? "🌙" : "☀️"}</span>
              </span>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TopBar;
