# Respiratory Illness Tracker – Architecture & Implementation Guide

This guide supports less experienced developers and non-developers in understanding and updating the Respiratory Illness Data Tracker. It also seeds a reusable framework for other data products at NYC DOHMH.

---

## Quick Links


- [Folder Structure Overview](#folder-structure-overview)  
- [Config-Driven Rendering Flow](#config-driven-rendering-flow)  
- [State Management with usePageState](#state-management-with-usepagestate)  
- [How to Add a New Chart](#how-to-add-a-new-chart)  
- [How to Add a New Page](#how-to-add-a-new-page-eg-hospitalizations)  
- [Content Authoring Guidelines](#content-authoring-guidelines)  
- [Common Troubleshooting](#common-troubleshooting)  
- [Developer Manual: Chart Configs, State, and Rendering](#part-ii-developer-manual--chart-configs-state-and-rendering)  
- [Design Tokens and Theming System](#design-tokens-and-theming-system)  
- [Utility Functions Overview](#utility-functions-overview)  
- [Component Deep Dive: ConfigDrivenPage.jsx](#component-deep-dive-configdrivenpagejsx)  

---

# Respiratory Illness Data Tracker – Architecture & Implementation Guide

This guide supports less experienced developers and non-developers in understanding and updating the Respiratory Illness Data Tracker. It also seeds a reusable framework for other data products at NYC DOHMH.

---

## Folder Structure Overview

```
/components/
  ├── charts/               # Custom VegaLite chart components
  ├── contentUtils/         # Markdown + text utilities
  ├── controls/             # UI filters and toggles
  ├── layout/               # Page and section layout components
  ├── grids/                # Stat summary cards and overview components
  └── popups/               # Info modals

/pages/
  └── config/               # Page-level configs for all explorer views

/public/content/
  ├── sections/             # Markdown overviews for each page
  ├── modals/               # Chart explainer modal content
  └── text.json             # Localized strings and titles

/utils/
  ├── chartRegistry.js      # Chart component mapping
  ├── downloadUtils.js      # CSV export helper
  ├── loadMarkdownWithMeta.js # Markdown + YAML frontmatter parser
  └── contentUtils.js       # Localized text helper
```

---

## Config-Driven Rendering Flow

The core file is `ConfigDrivenPage.jsx`. It renders:

- A `DataPageLayout` wrapper
- A `TrendSummaryContainer` box
- One or more `SectionWithChart` components

Each `SectionWithChart`:
- Wraps a chart
- Adds title/subtitle
- Enables download/info buttons
- Loads modal content via markdown

Charts are matched via the `chartRegistry`.

---

## State Management with `usePageState`

```js
const {
  activeVirus, setActiveVirus,
  view, setView,
  handleDownload
} = usePageState()
```

Used by `<TopControls>` for toggles and download buttons.

---

## How to Add a New Chart

1. Add a new `section` in a config file
2. Specify chart `type`, `props`, and data key
3. Optionally add modal help text and download icon
4. Register chart type in `chartRegistry.js` if new

---

## How to Add a New Page (e.g. Hospitalizations)

1. **Create Config** → `/pages/config/HospitalizationsPage.config.js`
2. **Add CSV** → `/public/data/hospitalizationsData.csv`
3. **Write Summary** → `/public/content/sections/hospitalizationsSectionText.md`
4. **Update Titles** → `public/content/text.json`
5. **Add Dropdown Option** → in `Dropdown.jsx`
6. **Add Route** → ensure React Router is aware of new config

---

## Content Authoring Guidelines

- Use `text.json` for titles and labels
- Use `{virus}`, `{trend}`, `{view}` tokens
- Use Markdown for summaries and modals

---

## Common Troubleshooting

- Chart missing? Check `chartRegistry` and data keys
- Download not working? Ensure `handleDownload` is wired
- Title not showing? Check `text.json` and `getText()` usage
- Markdown not loading? Validate file path

---

## Design Tokens

- All visual styles centralized in `tokens.js` and CSS variables
- Supports light/dark modes, theme aliasing, semantic colors



---

## Design Tokens and Theming System

All visual styling is centralized using a design token system that supports:

- **Light and Dark mode theming**
- **Semantic tokens for meaning-based styling** (e.g. `--trend-up-color`)
- **Consistent spacing, typography, and colors across components**

### Tokens Overview

Tokens are defined in two formats:

#### 1. JavaScript (used in logic and Vega chart generation)
```js
export const tokens = {
  colors: {
    gray100: "#F9FAFB",
    bluePrimary: "#1E40AF",
    orangePrimary: "#FF6600",
    redPrimary: "#B91C1C",
    ...
  },
  typography: {
    fontSizeBase: "14px",
    fontSizeLg: "18px",
    ...
  },
  spacing: {
    sm: "8px",
    md: "16px"
  },
  radii: {
    md: "6px"
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)"
  },
  colorScales: {
    covid: ["#3B0F70", "#2B83BA", ...],
    flu: ["#3F007D", "#9E9AC8", ...],
    rsv: ["#00441B", "#78C679", ...]
  }
};
```

#### 2. CSS Custom Properties (used in styling and theming)
```css
:root {
  --gray-900: #1F2937;
  --blue-primary: #1E40AF;
  --trend-up-color: var(--red-primary);
  ...
}
[data-theme="dark"] {
  --gray-900: #F9FAFB;
  --blue-primary: #93c5fd;
  --trend-up-color: var(--red-accent);
  ...
}
```

---

### Token Categories

| Category     | Example Token               | Description                                |
|--------------|-----------------------------|--------------------------------------------|
| **Colors**   | `--blue-primary`            | Primary branding and data colors           |
| **Typography** | `--font-size-lg`          | Heading and body text sizes                |
| **Spacing**  | `--spacing-xl`              | Padding and layout control                 |
| **Radii**    | `--radius-md`               | Border radius for buttons, cards, etc.     |
| **Shadows**  | `--shadow-md`               | Box shadows for elevated elements          |
| **Semantic** | `--trend-up-color`          | Dynamically conveys meaning (e.g. danger)  |

---

### Dark Mode Support

- Enabled via `[data-theme="dark"]` selectors
- Automatically swaps background, text, and chart colors
- Uses semantic variables for intelligent overrides (e.g. `--trend-up-color` becomes `--red-accent`)

---

### Chart Styling via Tokens

Vega chart specs reference JS tokens from `tokens.js`, ensuring brand consistency:

```js
const virusColorMap = {
  "COVID-19": tokens.colors.bluePrimary,
  "Influenza": tokens.colors.purplePrimary,
  ...
}
```

---

### Updating or Extending

- To add a new color: define in `colors` JS and mirror in CSS
- To adjust spacing or font scale globally: update `spacing` or `typography`
- To add a new virus type: add a `colorScales` entry and use in charts

---

## Utility Functions Overview

The tracker’s functionality is supported by a robust set of utility functions and modules, each designed to abstract complexity and promote reuse across pages.

### `chartRegistry.js`
Maps string identifiers in config files to actual chart components:

```js
const chartRegistry = {
  lineChart: LineChart,
  smallMultipleBarChart: SmallMultipleBarChart,
  yearComparisonChart: YearComparisonChart,
  ...
};
```

---

### `downloadUtils.js`
Provides `downloadCSV()` to export chart data:

```js
downloadCSV(data, "filename.csv")
```

Automatically generates CSV with headers from an array of objects.

---

### `getText()` – `contentUtils.js`
Safely pulls localized text from `text.json` using a path like:

```js
getText("caseDataPage.charts.trends.title")
```

Returns fallback key if missing and logs warnings for traceability.

---

### `getMetricData()` + `pivotMetricToViews()`
Used in chart hydration to:
- Filter flat data by metric/submetric
- Pivot multiple views (e.g. visits + hospitalizations) into single rows

---

### `loadConfigWithData()`
Combines:
1. CSV loading
2. Variable interpolation in config strings
3. Chart data hydration

```js
loadConfigWithData(config, { virus: "COVID-19", view: "visits" })
```

---

### `hydrateConfigData()`
Attaches prefiltered data to a config object by matching:
- `metricName`
- `baseMetric` + `pivotView`
- `submetric` or `groupField`

This allows charts to access scoped data using only a `dataSourceKey`.

---

### `loadMarkdownWithMeta()` + `parseMarkdownSectionsWithDirectives()`
Used to read `.md` files with optional YAML frontmatter. Supports logic like:
- Rendering summary cards
- Detecting per-section rendering modes

---

### `getStatData()` + `getTrendInfo()`
Used to compute:
- The most recent value and WoW change for stat cards
- Arrow, trend color, and phrasing based on direction

---

### `interpolate()`
Replaces `{tokens}` in strings with runtime values:

```js
interpolate("{virus} {view}", { virus: "COVID", view: "hospitalizations" })
```

---

### `getThemeByTitle()`
Maps virus names to theme styles (color, icon, background):

```js
getThemeByTitle("Influenza") → { color, icon, background }
```

---

### `getTrendFromTimeSeries()`
Simple numeric trend calculator for percentage changes.

---

### `validatePageConfig()`
Development helper to catch misconfigured sections or missing fields in a config.

---

## Component Deep Dive: `ConfigDrivenPage.jsx`

`ConfigDrivenPage` is the heart of the tracker’s architecture. It powers each data explorer page by dynamically rendering layout, controls, markdown, and charts based entirely on a configuration object.

### Responsibilities

- Hydrates config with live or preloaded data
- Controls virus/view state with `usePageState`
- Resolves interpolated text and tokens in props
- Renders summaries, charts, subtitles, and modals
- Handles group dropdown logic and trend generation

---

### Key React Hooks

- `usePageState()`: provides `activeVirus`, `view`, `setVirus`, `setView`, and `handleDownload`
- `useEffect()`: loads config data and markdown summaries
- `useRef()` + `IntersectionObserver`: controls the appearance of the floating pill toggle

---

### Data Flow

1. Loads `config` via prop or `loadConfigWithData()`
2. Interpolates tokens (`{virus}`, `{view}`) across `chart.props` and titles
3. Hydrates each section with filtered data
4. Determines trend and renders conditional subtitle + arrow
5. Displays dynamic controls: virus/view toggle, group dropdown

---

### Dynamic Text Resolution

```js
resolveText("caseDataPage.mainTitle", { virus: "Flu" })
// → "Flu Case Data and Demographics"
```

Custom tokens are interpolated into strings for:
- Titles
- Subtitles
- Tooltips
- Chart labels

---

### Section Rendering Modes

Sections support different rendering types:

| `renderAs`      | Description |
|-----------------|-------------|
| `custom`        | Uses a manually registered React component (e.g. `StatGrid`) |
| `hidden`        | Skipped entirely |
| `overview`      | Reserved for future layout logic |
| default         | Chart section rendered with title, subtitle, modal, and footer |

---

### Chart Hydration

Each chart receives:

```js
<ChartComponent
  data={filteredData}
  virus={activeVirus}
  view={view}
  colorMap={tokens.colorScales[activeVirus]}
  {...interpolatedProps}
/>
```

Supports both:
- Static props defined in config
- Runtime dynamic values (active virus, group selection, etc.)

---

### Trend Subtitles

Subtitles with trend direction, arrow, and % change are powered by:

- `getTrendFromTimeSeries()` → computes `up`, `down`, `same`
- `getTrendInfo()` → resolves arrow, label, and color
- `TrendSubtitle` → renders subtitle + `<GroupDropdown />` if `{group}` token is used

---

### CSV Download

Each section with `downloadIcon: true`:
- Binds `onDownloadClick()` to `downloadCSV(filteredData)`
- Filename defaults to `${section.id}.csv`

---

### Example Usage in Page File

```js
import config from "../config/CaseDataPage.config.js";
<ConfigDrivenPage config={config} />
```

This renders the full page using the given config file.

---

### Extensibility

- To support a new type of chart: add to `chartRegistry`
- To customize layout: pass `renderAs: "custom"` and define a new component
- To add trend detection: set `trendEnabled: true` in section

---
