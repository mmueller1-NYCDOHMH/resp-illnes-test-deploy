'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const DataIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </svg>
);

const AboutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8"  x2="12.01" y2="8" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const LINKS = [
  { label: "Home",  to: "/",              Icon: HomeIcon  },
  { label: "Data",  to: "/data/covid-19", Icon: DataIcon  },
  { label: "About", to: "/about",         Icon: AboutIcon },
];

/** Semantic <a> link via Next.js Link — supports right-click, keyboard, a11y */
const NavLink = ({ label, to, isActive, Icon }) => (
  <Link
    href={to}
    aria-current={isActive ? "page" : undefined}
    className={[
      "flex items-center gap-[5px] whitespace-nowrap no-underline",
      "p-[10px] sm:py-[14px] sm:px-[18px]",
      "text-[14px] sm:text-[15px] font-body -mb-px",
      "border-b-[3px] transition-[color,border-color] duration-150",
      isActive
        ? "font-semibold text-blue-primary border-blue-primary"
        : "font-normal text-gray-600 border-transparent hover:text-blue-primary hover:border-blue-primary",
    ].join(" ")}
  >
    {Icon && <Icon />}
    {/* Label hidden on mobile — icon remains visible */}
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

/** Vertical divider — hidden on mobile alongside the text labels */
const NavDivider = () => (
  <span
    aria-hidden="true"
    className="hidden sm:block w-px h-4 bg-gray-300 flex-shrink-0"
  />
);

const NavBar = () => {
  const pathname = usePathname();
  // Start false to avoid SSR mismatch; effect syncs on mount
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const activePage =
    pathname.startsWith("/data")  ? "/data/covid-19" :
    pathname.startsWith("/about") ? "/about" : "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className={[
        "flex items-center w-full transition-[background-color,box-shadow] duration-200",
        scrolled
          ? "bg-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
          : "bg-transparent shadow-none",
      ].join(" ")}
    >
      {LINKS.map(({ label, to, Icon }, i) => (
        <React.Fragment key={to}>
          {i > 0 && <NavDivider />}
          <NavLink label={label} to={to} isActive={activePage === to} Icon={Icon} />
        </React.Fragment>
      ))}

      <span className="flex-1" />

      <NavDivider />

      <button
        onClick={handleCopy}
        title="Copy link to this page"
        className={[
          "flex items-center gap-[5px] whitespace-nowrap",
          "py-[14px] px-md border-0 bg-transparent cursor-pointer",
          "text-[14px] font-body font-normal transition-colors duration-150",
          copied ? "text-[#16a34a]" : "text-gray-600 hover:text-blue-primary",
        ].join(" ")}
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
        <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
      </button>
    </nav>
  );
};

export default NavBar;
