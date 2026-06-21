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
 * Props:
 *   value            — controlled string (search query)
 *   onChange         — (string) => void — called on every keystroke
 *   onSelect         — ([geocode, data]) => void — called when user picks a result
 *   suggestions      — array of [geocode, {name,...}] tuples (pre-filtered by parent)
 *   selectedGeocode  — currently selected geocode int (for "current" badge)
 *   placeholder      — input placeholder text
 *   id               — base id for aria attributes
 */

import React, { useState, useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
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
      <mark style={{
        backgroundColor: "rgba(59,130,246,0.12)",
        color: "var(--blue-primary)",
        borderRadius: "2px",
        padding: "0 2px",
        fontStyle: "normal",
      }}>
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--gray-400)" }}
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
          style={{
            width: "100%",
            paddingLeft: "2.25rem",
            paddingRight: "2rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-body)",
            border: "1px solid var(--gray-200)",
            borderRadius: "0.5rem",
            background: "white",
            outline: "none",
            boxSizing: "border-box",
            color: "var(--gray-900)",
          }}
          onFocusCapture={(e) => {
            e.target.style.boxShadow = "0 0 0 2px var(--blue-primary)";
            e.target.style.borderColor = "transparent";
          }}
          onBlurCapture={(e) => {
            e.target.style.boxShadow = "";
            e.target.style.borderColor = "var(--gray-200)";
          }}
        />

        {/* "/" hint when empty */}
        {!value && (
          <kbd style={{
            position: "absolute",
            right: "0.625rem",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "10px",
            color: "var(--gray-400)",
            border: "1px solid var(--gray-200)",
            borderRadius: "3px",
            padding: "1px 4px",
            fontFamily: "monospace",
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
          }}>
            /
          </kbd>
        )}

        {/* Clear button */}
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { onChange(""); setShowDropdown(false); inputRef.current?.focus(); }}
            style={{
              position: "absolute",
              right: "0.375rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: "3px",
              borderRadius: "50%",
              cursor: "pointer",
              color: "var(--gray-400)",
              display: "flex",
              alignItems: "center",
              transition: "background 120ms, color 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--gray-700)";
              e.currentTarget.style.background = "var(--gray-200)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--gray-400)";
              e.currentTarget.style.background = "none";
            }}
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
          style={{
            position: "absolute",
            zIndex: 9999,
            width: "100%",
            background: "white",
            border: "1px solid var(--gray-200)",
            marginTop: "6px",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: "16rem",
            overflowY: "auto",
            padding: "4px 0",
            listStyle: "none",
            // Slide-in animation
            opacity: dropdownVisible ? 1 : 0,
            transform: dropdownVisible ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 150ms ease-out, transform 150ms ease-out",
          }}
        >
          {flat.length === 0 ? (
            <li style={{
              padding: "12px 16px",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-body)",
              color: "var(--gray-400)",
              textAlign: "center",
            }}>
              No neighborhoods found
            </li>
          ) : (() => {
            let globalIdx = 0;
            return grouped.map(([borough, ns]) => (
              <li key={borough} role="none">
                {/* Borough group header */}
                <p style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--gray-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "10px 12px 4px",
                  userSelect: "none",
                  margin: 0,
                }}>
                  {borough}
                </p>
                <ul role="group" aria-label={borough} style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          fontSize: "var(--font-size-sm)",
                          fontFamily: "var(--font-body)",
                          cursor: "pointer",
                          transition: "background 100ms, color 100ms",
                          background: highlight ? "rgba(59,130,246,0.07)" : "transparent",
                          color: highlight ? "var(--blue-primary)" : "var(--gray-800)",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>
                          <Highlight text={data.name} query={value.trim()} />
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: "10px",
                            color: "var(--blue-primary)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginLeft: "8px",
                            flexShrink: 0,
                            opacity: 0.75,
                          }}>
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
