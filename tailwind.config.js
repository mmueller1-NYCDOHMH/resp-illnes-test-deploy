/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",   // covers src/views/ and all src/ subdirs
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Base palette ─────────────────────────────────────────────────────
        // All colors route through CSS custom properties so dark mode token
        // swapping (via [data-theme="dark"]) works automatically.
        white:  "var(--white)",
        black:  "var(--black)",

        "gray-100": "var(--gray-100)",
        "gray-200": "var(--gray-200)",
        "gray-300": "var(--gray-300)",
        "gray-400": "var(--gray-400)",
        "gray-500": "var(--gray-500)",
        "gray-600": "var(--gray-600)",
        "gray-700": "var(--gray-700)",
        "gray-800": "var(--gray-800)",
        "gray-900": "var(--gray-900)",
        "gray-transparent": "var(--gray-transparent)",

        "blue-primary":   "var(--blue-primary)",
        "blue-secondary": "var(--blue-secondary)",
        "blue-accent":    "var(--blue-accent)",

        "purple-primary": "var(--purple-primary)",
        "purple-accent":  "var(--purple-accent)",

        "green-primary": "var(--green-primary)",
        "green-accent":  "var(--green-accent)",
        "green-muted":   "var(--green-muted)",
        "green-trend":   "var(--green-trend)",

        "orange-primary": "var(--orange-primary)",
        "orange-accent":  "var(--orange-accent)",
        "orange-muted":   "var(--orange-muted)",
        "orange-text":    "var(--orange-text)",

        "red-primary": "var(--red-primary)",
        "red-accent":  "var(--red-accent)",
        "red-muted":   "var(--red-muted)",

        "footnote-gray": "var(--footnote-gray)",

        // ── Semantic surface tokens ──────────────────────────────────────────
        "surface-1":      "var(--surface-1)",
        "surface-2":      "var(--surface-2)",
        "surface-border": "var(--surface-border)",
        "body-text":      "var(--body-text)",
        "app-bg":         "var(--app-bg)",

        // ── Component semantic tokens ────────────────────────────────────────
        "header-bg":             "var(--header-bg)",
        "header-title-color":    "var(--header-title-color)",
        "header-subtitle-color": "var(--header-subtitle-color)",
        "header-button-border":  "var(--header-button-border)",
        "header-button-text":    "var(--header-button-text)",

        "info-bg":           "var(--info-bg)",
        "info-text":         "var(--info-text)",
        "info-title":        "var(--info-title)",

        // ── Card / stat tokens ───────────────────────────────────────────────
        "card-bg":          "var(--card-bg)",
        "card-title-color": "var(--card-title-color)",
        "card-label-color": "var(--card-label-color)",
        "card-trend-color": "var(--card-trend-color)",
        "stat-value":       "var(--stat-value, var(--blue-primary))",

        // ── Trend direction colors ────────────────────────────────────────────
        "trend-up":      "var(--trend-up-color)",
        "trend-down":    "var(--trend-down-color)",
        "trend-neutral": "var(--trend-neutral-color)",

        // ── Portal section ───────────────────────────────────────────────────
        "portal-section-bg":     "var(--portal-section-bg)",
        "portal-section-border": "var(--portal-section-border, var(--gray-300))",

        // ── Trend chip tokens (general purpose) ──────────────────────────────
        "chip-inc-bg":      "var(--chip-inc-bg)",
        "chip-inc-text":    "var(--chip-inc-text)",
        "chip-dec-bg":      "var(--chip-dec-bg)",
        "chip-dec-text":    "var(--chip-dec-text)",
        "chip-neutral-text":"var(--chip-neutral-text)",

        // ── Trend direction chip tokens (disease context) ─────────────────────
        "trend-chip-inc-bg":       "var(--trend-chip-inc-bg)",
        "trend-chip-inc-text":     "var(--trend-chip-inc-text)",
        "trend-chip-dec-bg":       "var(--trend-chip-dec-bg)",
        "trend-chip-dec-text":     "var(--trend-chip-dec-text)",
        "trend-chip-neutral-bg":   "var(--trend-chip-neutral-bg)",
        "trend-chip-neutral-text": "var(--trend-chip-neutral-text)",

        // ── Background tint tokens ───────────────────────────────────────────
        "bg-light-blue":   "var(--bg-light-blue)",
        "bg-light-green":  "var(--bg-light-green)",
        "bg-light-orange": "var(--bg-light-orange)",
        "bg-light-purple": "var(--bg-light-purple)",
        "bg-muted-pink":   "var(--bg-muted-pink)",
        "bg-muted-purple": "var(--bg-muted-purple)",
        "bg-muted-gray":   "var(--bg-muted-gray)",

        // ── Vega tooltip tokens ──────────────────────────────────────────────
        "vgtt-bg":     "var(--vgtt-bg)",
        "vgtt-fg":     "var(--vgtt-fg)",
        "vgtt-border": "var(--vgtt-border)",

        // ── Footer tokens ─────────────────────────────────────────────────────
        "footer-bg":         "var(--footer-bg)",
        "footer-text":       "var(--footer-text)",
        "footer-link":       "var(--footer-link)",
        "footer-link-hover": "var(--footer-link-hover)",
        "footer-border":     "var(--footer-border)",

        // ── TopBar tokens ─────────────────────────────────────────────────────
        "top-bar-bg":     "var(--top-bar-bg, var(--white))",
        "top-bar-text":   "var(--top-bar-text, var(--blue-primary))",
        "top-bar-border": "var(--top-bar-border, var(--gray-300))",
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-sans)",    "sans-serif"],
        body:    ["var(--font-body)",    "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
      },
      fontSize: {
        xs:   ["var(--font-size-xs)",  { lineHeight: "1.4" }],
        sm:   ["var(--font-size-sm)",  { lineHeight: "1.45" }],
        md:   ["var(--font-size-md)",  { lineHeight: "1.55" }],
        lg:   ["var(--font-size-lg)",  { lineHeight: "1.5" }],
        "2xl":["var(--font-size-2xl)", { lineHeight: "1.35" }],
        xl:   ["var(--font-size-xl)",  { lineHeight: "1.2" }],
      },

      // ── Spacing ──────────────────────────────────────────────────────────
      spacing: {
        xs:    "var(--spacing-xs)",
        sm:    "var(--spacing-sm)",
        md:    "var(--spacing-md)",
        lg:    "var(--spacing-lg)",
        xl:    "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },

      // ── Shape ────────────────────────────────────────────────────────────
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        info: "var(--info-shadow)",
        vgtt: "var(--vgtt-shadow)",
      },

      // ── Layout ───────────────────────────────────────────────────────────
      maxWidth: {
        content: "1280px",
      },

      // ── Custom breakpoints matching existing CSS ─────────────────────────
      screens: {
        "2xs": "360px",
        xs:    "480px",
        sm:    "640px",
        md:    "768px",
        "md-lg": "880px",
        lg:    "1024px",
        xl:    "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};
