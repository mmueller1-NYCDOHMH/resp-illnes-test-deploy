import React from "react";
import { resolveAsset } from "../../utils/pathUtils";
import footerLinks from "../../data/footerLinks.json";

// Shared link class used in every footer column
const linkCls = [
  "text-sm text-footer-link no-underline font-semibold",
  "hover:text-footer-link-hover hover:underline hover:decoration-2 hover:[text-underline-offset:3px]",
].join(" ");

const Footer = () => (
  <footer className="bg-footer-bg py-md text-footer-text font-body">
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
                <a key={href} href={href} className={linkCls}>
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Right: logo + legal */}
        <div
          className={[
            "flex flex-1 flex-col items-end min-w-[260px] max-w-[320px]",
            "lg:items-center lg:mt-lg lg:max-w-[280px]",
            "md:mt-md md:items-center md:self-center",
          ].join(" ")}
        >
          <img
            src={resolveAsset('assets/NYC_Health_color_main.png')}
            alt="NYC Health Logo"
            className="w-[86px] h-auto mb-sm [filter:var(--footer-logo-filter)]"
          />

          <div className="text-sm text-footer-text leading-relaxed text-right lg:text-center md:text-center">
            <p>NYC is a trademark and service mark of the City of New York.</p>
            <p>
              <a
                href="https://www.nyc.gov/nyc-resources/website-accessibility-statement.page"
                aria-label="Learn more about Digital Accessibility from the Mayor's Office for People with Disabilities."
              >
                <svg
                  className="w-[25px] h-[25px] fill-footer-link align-middle [filter:var(--footer-img-filter)] transition-[fill] duration-200 hover:fill-footer-link-hover"
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
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom divider ── */}
      <div className="border-t border-footer-border pt-md text-center mt-xl">
        <p className="text-xs text-footer-text">
          © City of New York. {new Date().getFullYear()} All Rights Reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
