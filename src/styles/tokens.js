/**
 * tokens.js — JavaScript colour and design tokens
 *
 * WHO EDITS THIS FILE
 * ───────────────────
 * • To change chart / sparkline colours for a virus → edit `colorScales`
 * • To change card header tints or icon colours    → edit `colors` below
 * • To change UI colors (header, footer, links)    → edit tokens.css instead
 *   (UI colors live as CSS custom properties so dark-mode overrides work)
 *
 * The `virusAccentColors` export drives both the page-accent CSS variable
 * (sidebar rail, focus rings) AND the chart theme, so editing colorScales
 * automatically keeps everything in sync.
 */

// ── Grayscale ──────────────────────────────────────────────────────────────────
const colors = {
  white:           "#FFFFFF",
  black:           "#000000",
  gray100:         "#F9FAFB",
  gray200:         "#F3F4F6",
  gray300:         "#E5E7EB",
  gray400:         "#D1D5DB",
  gray500:         "#9CA3AF",
  gray600:         "#6B7280",
  gray700:         "#4B5563",
  gray800:         "#374151",
  gray900:         "#1F2937",
  grayTransparent: "rgba(0, 0, 0, 0)",

  // ── Virus primary colours (used in card headers, icon tints) ──────────────
  purplePrimary: "#8739B7",   // COVID-19
  purpleAccent:  "#BC6AEB",
  tealPrimary:   "#387781",   // Flu
  tealAccent:    "#629FAA",
  orangePrimary: "#AA4C34",   // RSV
  orangeAccent:  "#D47056",

  // ── UI accent (links, active states — mirrors --blue-primary in tokens.css) ─
  blueAccent: "#1E40AF",

  // ── Semantic backgrounds ──────────────────────────────────────────────────
  bgLightBlue:   "#08519C26",
  bgLightPurple: "#4A148624",
  bgLightGreen:  "#00441A26",
  bgLightOrange: "#AA4C3466",
  bgLightRed:    "#AF233F66",
  bgLightTeal:   "#38778166",
  bgMutedPink:   "#F4C4A5",
  bgMutedPurple: "#F5F3FF",
  bgMutedGray:   "#ADAEBC",
  bgOrange:      "#AA4C34",
  bgPurple:      "#8739B7",
  bgTeal:        "#387781",
  bgBlue:        "#2248c5",
};

// ── Chart colour scales ────────────────────────────────────────────────────────
// Each array is ordered dark→light. Index [2] is the primary display colour
// used for the page accent, card headers, and sparklines.
const colorScales = {
  covid: [
    "#520583",  // [0] darkest
    "#1F003D",  // [1] dark
    "#8739B7",  // [2] primary ← this drives the page accent + chart line
    "#BC6AE8",  // [3] light
    "#A020C8",  // [4] lightest
  ],
  flu: [
    "#03515B",  // [0] darkest
    "#002B35",  // [1] dark
    "#387781",  // [2] primary ← this drives the page accent + chart line
    "#629FAA",  // [3] light
    "#2F8F9D",  // [4] lightest
  ],
  rsv: [
    "#570000",  // [0] darkest
    "#812816",  // [1] dark
    "#AA4C34",  // [2] primary ← this drives the page accent + chart line
    "#D47056",  // [3] light
    "#B5523A",  // [4] lightest
  ],
  ari: ["#26A69A"],
};

// ── Virus accent colours ───────────────────────────────────────────────────────
// Single source of truth for per-virus UI accent.
// Used by ConfigDrivenPage to set --page-accent, and by themeUtils for cards.
// Changing colorScales[virus][2] above automatically updates these.
export const virusAccentColors = {
  "COVID-19": colorScales.covid[2],
  "Flu":      colorScales.flu[2],
  "RSV":      colorScales.rsv[2],
};

// ── Spacing / typography / radii / shadows ─────────────────────────────────────
const spacing    = { xs: "4px", sm: "8px", md: "16px", lg: "24px" };
const typography = { body: '"Inter", sans-serif', heading: '"Inter", sans-serif', fontSizeBase: "14px", fontSizeLg: "18px", weightBold: "bold" };
const radii      = { sm: "4px", md: "6px", lg: "8px" };
const shadows    = { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px rgba(0,0,0,0.1)" };

export const tokens = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  colorScales,
};
