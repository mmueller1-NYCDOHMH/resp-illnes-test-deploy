/**
 * app/layout.jsx — Next.js root layout (replaces index.html + src/main.jsx)
 *
 * Ports:
 *  - <head> meta tags          →  export const metadata
 *  - Sticky header + footer    →  AppShell client component
 *  - Page transition animation →  PageTransition client component
 *  - Hash URL redirect shim    →  HashRedirectShim (backward compat)
 *  - Google Translate scripts  →  <Script strategy="beforeInteractive">
 *  - Agency analytics scripts  →  <Script strategy="afterInteractive">
 *  - CSS imports               →  direct imports
 *
 * Server Component — no "use client" here.
 */

import Script from 'next/script';
import HashRedirectShim from './components/HashRedirectShim';
import AppShell from './components/AppShell';
import '../src/index.css';
import '../src/styles/tokens.css';

export const metadata = {
  title: 'Respiratory Illness Data Pages - NYC Health',
  other: {
    // Prevents Google Translate from auto-translating the page on its own;
    // the app manages translation via the widget below.
    google: 'notranslate',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link
          rel="icon"
          type="image/x-icon"
          href="https://www.nyc.gov/favicon.ico"
        />
      </head>
      <body>
        {/* Redirect old hash URLs (/#/data/covid-19) to real paths on first load */}
        <HashRedirectShim />

        {/* Skip to main content — CSS handles show/hide via :focus */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Persistent chrome: sticky header, page transition, footer */}
        <AppShell>{children}</AppShell>

        {/* Google Translate mount point — hidden off-screen */}
        <div
          id="google_translate_element"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        />

        {/*
         * Google Translate: set the user's browser language cookie before
         * any page content renders so the widget picks up the right language.
         * Must run before hydration to avoid a flash of untranslated content.
         */}
        <Script id="google-translate-lang-init" strategy="beforeInteractive">{`
          (function setGoogleTranslateFromBrowserLang() {
            if (sessionStorage.getItem("gt_userPicked") === "1") {
              if (location.hash.indexOf("googtrans") > -1) {
                history.replaceState(null, "", location.pathname + location.search);
              }
              return;
            }

            const supported = ["en", "es", "zh-CN", "ru", "ar", "bn"];
            const raw = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
            let lang = raw.toLowerCase();

            if (lang.startsWith("zh")) {
              lang = "zh-CN";
            } else {
              lang = lang.split("-")[0];
            }

            let targetLang = "en";
            if (supported.includes(lang)) targetLang = lang;

            const pair = "/en/" + targetLang;
            const expires = "expires=Thu, 01 Jan 2099 00:00:00 GMT";
            document.cookie = "googtrans=" + pair + "; path=/; " + expires;
            try {
              const parts = location.hostname.split(".");
              if (parts.length > 1) {
                const root = "." + parts.slice(-2).join(".");
                document.cookie = "googtrans=" + pair + "; path=/; domain=" + root + "; " + expires;
              }
            } catch (_) {}

            if (location.hash.indexOf("googtrans") > -1) {
              history.replaceState(null, "", location.pathname + location.search);
            }

            window.setSiteLanguage = function setSiteLanguage(toCode) {
              const next = "/en/" + toCode;
              document.cookie = "googtrans=" + next + "; path=/; " + expires;
              try {
                const parts = location.hostname.split(".");
                if (parts.length > 1) {
                  const root = "." + parts.slice(-2).join(".");
                  document.cookie = "googtrans=" + next + "; path=/; domain=" + root + "; " + expires;
                }
              } catch (_) {}
              sessionStorage.setItem("gt_userPicked", "1");
              if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                googleTranslateElementInit();
              }
            };

            window.addEventListener("hashchange", function () {
              if (location.hash.indexOf("googtrans") > -1) {
                sessionStorage.setItem("gt_userPicked", "1");
              }
            });
          })();
        `}</Script>

        {/* Callback invoked by the Google Translate script when it's ready */}
        <Script id="google-translate-element-init" strategy="beforeInteractive">{`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement(
              {
                pageLanguage: "en",
                includedLanguages: "en,es,zh-CN,ru,ar,bn",
                autoDisplay: false,
              },
              "google_translate_element"
            );
          }
        `}</Script>

        {/* Google Translate widget loader */}
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />

        {/* NYC agency analytics.
            Stub files in public/assets/doh/js/agencies/ and
            public/assets/home/js/webtrends/ stand in on Netlify/dev;
            the real scripts are served by the agency host in production. */}
        <Script
          src="/assets/doh/js/agencies/agency-wt.js"
          strategy="afterInteractive"
        />
        <Script
          src="/assets/home/js/webtrends/webtrends_v10.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
