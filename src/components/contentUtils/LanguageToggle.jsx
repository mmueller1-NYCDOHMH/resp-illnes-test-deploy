// src/components/contentUtils/LanguageToggle.jsx
import React, { useEffect, useState } from "react";
import "../TopBar/TopBar.css"; // language-select + toggle-switch styles
import {
  onGoogleComboReady,
  setLanguage,
  reapplyPreferredLanguage,
} from "../../utils/translate";

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "zh-CN", label: "中文" },
  { value: "ru", label: "Русский" },
  { value: "it", label: "Italiano" },
  { value: "ht", label: "Kreyòl ayisyen" },
  { value: "bn", label: "বাংলা" },
  { value: "yi", label: "ײִדיש" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "pl", label: "Polski" },
  { value: "ur", label: "اردو" },
  { value: "pt", label: "Português" },
];

/**
 * Props:
 * - className:      applied to the <select> (so your .language-select styles hit the control)
 * - wrapperClassName: optional class for the outer <label> if you want layout styling there
 */
export default function LanguageToggle({ className = "", wrapperClassName = "", showIcon = true }) {
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem("preferredLang") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    onGoogleComboReady(() => {
      setReady(true);
      // Reapply a stored preference once the Google widget is present
      reapplyPreferredLanguage();
    });
  }, []);

  const handleChange = (e) => {
    const lang = e.target.value;
    setValue(lang);

    // If the widget isn't ready yet, cache the preference and it will reapply later.
    if (!setLanguage(lang)) {
      try {
        localStorage.setItem("preferredLang", lang);
      } catch {
        // localStorage may be unavailable (e.g. private browsing) — ignore
      }
    }
  };

  return (
    <label
      className={wrapperClassName}
      // With a wrapperClassName the caller owns layout/visibility (inline
      // display would override responsive classes like sm:hidden).
      style={wrapperClassName ? undefined : { display: "inline-flex", alignItems: "center", width: "100%" }}
    >
      <span className="sr-only">Select language</span>
      {showIcon && (
        <span className="language-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
          </svg>
        </span>
      )}
      <select
        className={className}
        aria-label="Select language"
        value={value}
        onChange={handleChange}
        // Never disabled: if the Google widget is slow or blocked (ad
        // blockers, network), a disabled <select> drops out of the tab order
        // and strands users on a non-English preference. handleChange caches
        // the choice and it's reapplied once the widget is ready.
        aria-busy={!ready && value !== "en" ? true : undefined}
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
