/**
 * NeighborhoodSearchInput
 *
 * Search input + grouped autocomplete dropdown for neighborhood map sections.
 * Styled to match the Community Health Profiles neighborhood selector.
 *
 * Features:
 * - Opens on typing; closes on outside click or Escape
 * - Results grouped by borough with borough headers
 * - Query text highlighted inside matching names
 * - Slide-in dropdown animation (opacity + translateY)
 * - "/" keyboard shortcut to focus input
 * - ↑ ↓ Enter keyboard navigation (skips headers)
 * - Clear (×) button; "/" hint when empty
 * - "current" badge on the active neighborhood
 *
 * Styled entirely with Tailwind utilities (design tokens already exposed as
 * Tailwind colors/fontSize/fontFamily in tailwind.config.js) — no inline
 * `style={}` objects or JS-driven hover/focus swapping, matching the rest
 * of the tree. The two rgba(59,130,246,…) accents are intentionally literal
 * (not the `--blue-primary` token) — that's what the original design used
 * for the subtle match highlight/row tint, so it's preserved as-is here.
 *
 * Props:
 *   value            — controlled string (search query)
 *   onChange         — (string) => void — called on every keystroke
 *   onSelect         — ([geocode, data]) => void — called when user picks a result
 *   suggestions      — array of [geocode, {name,...}] tuples (pre-filtered by parent)
 *   selectedGeocode  — currently selected geocode int (for "current" badge)
 *   placeholder      — input placeholder text
 *   id               — base id for aria attributes
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";

// ── Borough ordering + derivation ─────────────────────────────────────────────

const BOROUGH_ORDER = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"];

function getBoroughFromGeocode(geocode) {
  const code = parseInt(geocode, 10);
  if (code >= 101 && code <= 199) return "Manhattan";
  if (code >= 201 && code <= 299) return "The Bronx";
  if (code >= 301 && code <= 399) return "Brooklyn";
  if (code >= 401 && code <= 499) return "Queens";
  if (code >= 501 && code <= 599) return "Staten Island";
  return "Other";
}

// ── Text highlight ────────────────────────────────────────────────────────────

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[rgba(59,130,246,0.12)] text-blue-primary rounded-[2px] px-[2px] not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const NeighborhoodSearchInput = ({
  value,
  onChange,
  onSelect,
  suggestions = [],
  selectedGeocode = null,
  placeholder = "Search neighborhoods…",
  id = "neighborhood-search",
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const inputRef     = useRef(null);
  const itemRefs     = useRef([]);
  const containerRef = useRef(null);

  const isOpen = showDropdown && (value.trim().length > 0 || suggestions.length > 0);
  const listId = `${id}-results`;

  // Slide-in: trigger rAF after isOpen flips true
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setDropdownVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDropdownVisible(false);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // "/" shortcut to focus
  useEffect(() => {
    function handleSlash(e) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleSlash);
    return () => document.removeEventListener("keydown", handleSlash);
  }, []);

  // Group suggestions by borough
  const { grouped, flat } = useMemo(() => {
    const map = {};
    BOROUGH_ORDER.forEach((b) => { map[b] = []; });

    suggestions.forEach(([geocode, data]) => {
      const borough = getBoroughFromGeocode(geocode);
      const key = map[borough] !== undefined ? borough : "Other";
      if (!map[key]) map[key] = [];
      map[key].push([geocode, data]);
    });

    const groups = Object.entries(map).filter(([, ns]) => ns.length > 0);
    const flatList = groups.flatMap(([, ns]) => ns);
    return { grouped: groups, flat: flatList };
  }, [suggestions]);

  // Reset keyboard focus when query changes
  useEffect(() => { setFocusedIndex(-1); }, [value]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  function handleKeyDown(e) {
    if (!isOpen) {
      // Open dropdown on ArrowDown even when input is empty
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        e.preventDefault();
        setShowDropdown(true);
        setFocusedIndex(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? -1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = focusedIndex >= 0 ? flat[focusedIndex] : flat[0];
      if (target) handleSelect(target);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }

  function handleSelect(entry) {
    setShowDropdown(false);
    onSelect(entry);
  }

  return (
    <div ref={containerRef} className="relative">

      {/* ── Input ── */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-600"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => { if (value.trim()) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-label="Search neighborhoods"
          aria-keyshortcuts="/"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={
            focusedIndex >= 0 ? `${listId}-opt-${focusedIndex}` : undefined
          }
          className={[
            "w-full box-border pl-9 pr-8 py-2",
            "text-sm font-body text-gray-900",
            "bg-white border border-gray-200 rounded-lg outline-none",
            "focus:border-transparent focus:ring-2 focus:ring-blue-primary",
          ].join(" ")}
        />

        {/* "/" hint when empty */}
        {!value && (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-gray-600 border border-gray-200 rounded-[3px] py-px px-1 font-mono leading-none pointer-events-none select-none">
            /
          </kbd>
        )}

        {/* Clear button */}
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { onChange(""); setShowDropdown(false); inputRef.current?.focus(); }}
            className={[
              "absolute right-1.5 top-1/2 -translate-y-1/2",
              "flex items-center p-[3px] rounded-full",
              "bg-transparent border-0 cursor-pointer text-gray-600",
              "transition-colors duration-[120ms]",
              "hover:text-gray-700 hover:bg-gray-200",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
            ].join(" ")}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Neighborhoods"
          className={[
            "absolute z-[9999] w-full mt-1.5 py-1 list-none",
            "bg-white border border-gray-200 rounded-lg",
            "shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
            "max-h-64 overflow-y-auto",
            "transition-[opacity,transform] duration-150 ease-out",
            dropdownVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
          ].join(" ")}
        >
          {flat.length === 0 ? (
            <li className="py-3 px-4 text-sm font-body text-gray-600 text-center">
              No neighborhoods found
            </li>
          ) : (() => {
            let globalIdx = 0;
            return grouped.map(([borough, ns]) => (
              <li key={borough} role="none">
                {/* Borough group header */}
                <p className="text-2xs font-semibold text-gray-600 uppercase tracking-[0.1em] pt-2.5 px-3 pb-1 m-0 select-none">
                  {borough}
                </p>
                <ul role="group" aria-label={borough} className="list-none m-0 p-0">
                  {ns.map(([geocode, data]) => {
                    const idx       = globalIdx++;
                    const isCurrent = parseInt(geocode, 10) === selectedGeocode;
                    const isFocused = idx === focusedIndex;
                    const highlight = isFocused || isCurrent;
                    return (
                      <li
                        key={geocode}
                        id={`${listId}-opt-${idx}`}
                        ref={(el) => { itemRefs.current[idx] = el; }}
                        role="option"
                        aria-selected={highlight}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect([geocode, data]); }}
                        onMouseEnter={() => setFocusedIndex(idx)}
                        className={[
                          "flex items-center justify-between px-3 py-2",
                          "text-sm font-body cursor-pointer transition-colors duration-100",
                          highlight ? "bg-[rgba(59,130,246,0.07)] text-blue-primary" : "text-gray-800",
                        ].join(" ")}
                      >
                        <span className="font-medium">
                          <Highlight text={data.name} query={value.trim()} />
                        </span>
                        {isCurrent && (
                          <span className="text-2xs text-blue-primary font-semibold uppercase tracking-[0.08em] ml-2 flex-shrink-0 opacity-75">
                            current
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ));
          })()}
        </ul>
      )}
    </div>
  );
};

NeighborhoodSearchInput.propTypes = {
  value:           PropTypes.string.isRequired,
  onChange:        PropTypes.func.isRequired,
  onSelect:        PropTypes.func.isRequired,
  suggestions:     PropTypes.array,
  selectedGeocode: PropTypes.number,
  placeholder:     PropTypes.string,
  id:              PropTypes.string,
};

export default NeighborhoodSearchInput;
