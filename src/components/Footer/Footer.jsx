'use client';

import React, { useCallback, useState } from "react";
import { resolveAsset } from "../../utils/pathUtils";
import footerLinks from "../../data/footerLinks.json";

// Shared link class used in every footer column.
// Color/underline hover state lives in footer-nav-link (index.css) — Tailwind's
// hover: utilities can't win against the global `a { text-decoration: none }`
// reset in this project's cascade-layer setup, so layout-only classes stay here.
const linkCls = "footer-nav-link text-sm font-semibold";

// Shared link class for the small legal/utility row (Privacy Policy, Terms Of Use, accessibility)
const legalLinkCls = "footer-legal-link text-xs";

// Pulls a friendly hostname out of a link href, e.g. "https://www.nyc.gov/x" → "nyc.gov"
const getHost = (href) => {
  try {
    return new URL(href, "https://nyc.gov").hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const Footer = () => {
  // Small text bubble that follows the cursor while hovering a footer link,
  // showing where the link actually goes.
  const [hoverTip, setHoverTip] = useState(null);

  const handleEnter = useCallback((e, href, label) => {
    const host = getHost(href);
    setHoverTip({
      text: host ? `${label ? label + " · " : ""}${host} ↗` : label || "Visit link",
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleMove = useCallback((e) => {
    setHoverTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
  }, []);

  const handleLeave = useCallback(() => setHoverTip(null), []);

  const hoverHandlers = (href, label) => ({
    onMouseEnter: (e) => handleEnter(e, href, label),
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
  });

  return (
  <footer className="bg-footer-bg py-md text-footer-text font-body relative">
    <div className="max-w-content mx-auto px-lg">

      {/* ── Main grid: link columns + right panel ── */}
      <div className="flex justify-center items-start flex-wrap gap-xl">

        {/* Left: three link columns — edit links in src/data/footerLinks.json */}
        <div
          className={[
            "flex flex-1 justify-between gap-xl max-w-[640px] min-w-[320px]",
            "lg:flex-wrap lg:justify-start lg:gap-lg lg:max-w-full",
            "max-md:flex-col max-md:items-center max-md:w-full max-md:min-w-0",
          ].join(" ")}
        >
          {footerLinks.map((column, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col flex-1 min-w-[160px] gap-xs max-md:w-full max-md:max-w-[280px] max-md:items-center"
            >
              {column.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                  {...hoverHandlers(href, label)}
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Right: logo + legal */}
        <div
          className={[
            "flex flex-1 flex-col items-start min-w-[260px] max-w-[320px]",
            "lg:max-w-[280px]",
          ].join(" ")}
        >
          <a
            href="https://www.nyc.gov/"
            title="NYC.gov"
            rel="noopener noreferrer"
            className="footer-logo-link inline-block"
            {...hoverHandlers("https://www.nyc.gov/", "NYC.gov")}
          >
            <img
              src={resolveAsset('assets/NYC_Health_color_main.png')}
              alt="NYC Health Logo"
              className="w-[86px] h-auto mb-sm [filter:var(--footer-logo-filter)]"
            />
          </a>

          <p className="text-sm text-footer-text leading-relaxed text-left">
            © City of New York - {new Date().getFullYear()} All Rights Reserved. Notify NYC is a trademark and service mark of the City of New York.
          </p>

          <div className="flex items-center justify-between w-full mt-xs">
            <a
              href="https://www.nyc.gov/home/privacy-policy.page"
              title="Privacy Policy"
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkCls}
              {...hoverHandlers("https://www.nyc.gov/home/privacy-policy.page", "Privacy Policy")}
            >
              Privacy Policy
            </a>
            <a
              href="https://www.nyc.gov/home/terms-of-use.page"
              title="Terms Of Use"
              target="_blank"
              rel="noopener noreferrer"
              className={legalLinkCls}
              {...hoverHandlers("https://www.nyc.gov/home/terms-of-use.page", "Terms Of Use")}
            >
              Terms Of Use
            </a>
            <a
              href="https://www.nyc.gov/site/mopd/index.page"
              title="Mayor's Office for People with Disabilities"
              aria-label="Mayor's Office for People with Disabilities"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-icon-link shrink-0"
              {...hoverHandlers("https://www.nyc.gov/site/mopd/index.page", "Accessibility")}
            >
              <svg
                className="w-[20px] h-[20px] fill-footer-link align-middle [filter:var(--footer-img-filter)]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                role="img"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M423.9 255.8L411 413.1c-3.3 40.7-63.9 35.1-60.6-4.9l10-122.5-41.1 2.3c10.1 20.7 15.8 43.9 15.8 68.5 0 41.2-16.1 78.7-42.3 106.5l-39.3-39.3c57.9-63.7 13.1-167.2-74-167.2-25.9 0-49.5 9.9-67.2 26L73 243.2c22-20.7 50.1-35.1 81.4-40.2l75.3-85.7-42.6-24.8-51.6 46c-30 26.8-70.6-18.5-40.5-45.4l68-60.7c9.8-8.8 24.1-10.2 35.5-3.6 0 0 139.3 80.9 139.5 81.1 16.2 10.1 20.7 36 6.1 52.6L285.7 229l106.1-5.9c18.5-1.1 33.6 14.4 32.1 32.7zm-64.9-154c28.1 0 50.9-22.8 50.9-50.9C409.9 22.8 387.1 0 359 0c-28.1 0-50.9 22.8-50.9 50.9 0 28.1 22.8 50.9 50.9 50.9zM179.6 456.5c-80.6 0-127.4-90.6-82.7-156.1l-39.7-39.7C36.4 287 24 320.3 24 356.4c0 130.7 150.7 201.4 251.4 122.5l-39.7-39.7c-16 10.9-35.3 17.3-56.1 17.3z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Cursor-following label showing where the hovered footer link goes */}
    {hoverTip && (
      <span
        className={[
          "fixed z-50 pointer-events-none select-none whitespace-nowrap",
          "rounded-full bg-gray-900 px-sm py-1 text-xs font-medium text-white shadow-md",
          "transition-opacity duration-100",
        ].join(" ")}
        style={{ left: hoverTip.x + 14, top: hoverTip.y + 14 }}
      >
        {hoverTip.text}
      </span>
    )}
  </footer>
  );
};

export default Footer;
