# NYC Respiratory Virus Data Tracker

A Next.js 14 app (App Router) that displays respiratory illness surveillance data for NYC. All pages are config-driven — adding a chart or section requires only a config change, no new components.

---

## Getting Started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # ESLint
```

Production deploys to `/assets/doh/respiratory-illness-data` (set via `basePath` in `next.config.js`). In dev the app runs at the root.

---

## Project Structure

```
app/                        # Next.js App Router entry points
  layout.jsx                # Root layout: metadata, scripts, AppShell
  page.jsx                  # / → OverviewPage
  about/page.jsx            # /about → AboutPage
  data/[virus]/page.jsx     # /data/covid-19|flu|rsv → VirusDataPage
  components/
    AppShell.jsx            # Sticky header + footer wrapper (client)
    HashRedirectShim.jsx    # Redirects old /#/data/... hash URLs
    PageTransition.jsx      # CSS page-enter animation on route change

src/
  views/                    # Page-level view components
    Overview/               # Overview dashboard
    DataExplorer/           # VirusDataPage — loads config from pageRegistry
    About/                  # About page
    config/                 # All page configs (see below)
      pageRegistry.js       # Maps URL slug → config object
      Data.config.js        # Remote CSV URLs (GitHub raw)
      EmergencyDeptPage.config.js
      CaseDataPage.config.js
      CovidDeathPage.config.js
      OverviewPage.config.js
      AboutPage.config.js
      virus/
        CovidPage.config.js # Composes ed + lab + death + wastewater configs
        FluPage.config.js
        RsvPage.config.js

  components/
    layout/
      ConfigDrivenPage.jsx  # Core page renderer — reads config, fetches data
      PageSidebar.jsx       # Virus / data-type / view / anchor nav
      ChartSection.jsx      # Standard chart+header section wrapper
      CustomSection.jsx     # Dispatches renderAs: "custom" sections
      ChartContainer.jsx    # Chart modal + download chrome
    charts/                 # Chart components (Vega-Lite based)
    grids/                  # StatGrid, OverviewGrid
    cards/                  # Stat summary cards
    controls/               # VirusFilterGroup, TopControls, FloatingTogglePill
    bullets/                # SeasonalBullet
    popups/                 # InfoModal, DownloadPanel, ChartModal
    contentUtils/           # MarkdownRenderer, LanguageToggle
    hooks/
      usePageState.jsx      # Shared virus/dataType/view state + URL sync
      usePageData.js        # Fetches + hydrates config with CSV data
      useSectionData.js     # Per-section data access
      useAnimatedNumber.js

  utils/
    chartRegistry.js        # Maps config type string → chart component
    componentRegistry.js    # Maps config component string → React component
    sectionTypeRegistry.jsx # Maps renderAs value → render handler
    dataTypeOptions.js      # Single source of truth for data-type tabs
    loadCSVData.js          # Fetch + parse CSV with retry + caching
    loadConfigWithData.js   # Hydrate page config with live data
    filterMetricData.js     # Filter + pivot long-form metric data
    pathUtils.js            # Resolves asset/data URLs for dev vs prod
    trendUtils.js           # Trend detection, direction labels
    interpolate.js          # {virus} / {view} template variable replacement
    virusRegistry.js        # Canonical virus names and display labels
    virusMap.js             # Maps display names → data source names
    themeUtils.js           # Virus color themes
    contentUtils.js         # getText() — resolves keys from text.json

  styles/
    tokens.css              # CSS custom property definitions (colors, spacing, etc.)
    tokens.js               # JS mirror of tokens for Vega chart theming
  index.css                 # Global base styles
  content/
    text.json               # All UI text strings (resolved by getText())

public/
  data/                     # Local CSV fallbacks (dev only)
    emergencyDeptData.csv
    caseData.csv
    deathData.csv
    wastewaterData.csv
    otherRespData.csv
  content/
    sections/               # Markdown summaries shown at top of each data section
      edSectionText.md
      caseDataSectionText.md
      covidDeathSectionText.md
      about/                # Per-topic markdown for the About page
    modals/                 # Chart explainer markdown (opened via ⓘ icon)
      emergency-dept-explainer.md
      cases-explainer.md
      covid-deaths-explainer.md
    footer/                 # Footer content (links, contact)
  assets/                   # Logos, icons
```

---

## How the Data Pipeline Works

1. A URL slug (`covid-19`, `flu`, `rsv`) hits `app/data/[virus]/page.jsx`
2. `VirusDataPage` looks up the config via `pageRegistry.getPageConfig(slug)`
3. `usePageData` (called inside `ConfigDrivenPage`) calls `loadConfigWithData`, which:
   - Resolves `dataPath` for the current `dataType` (ed/lab/death)
   - Fetches the CSV from GitHub raw (or local `/public/data/` in dev)
   - Filters + pivots the data for each section via `hydrateConfigData`
   - Fetches the latest commit date from the GitHub API for "Last updated"
4. `ConfigDrivenPage` renders each section by dispatching through `sectionTypeRegistry`
5. Charts receive pre-filtered data via `HydratedDataContext`

---

## Adding a New Chart to an Existing Page

1. Open the relevant config in `src/views/config/` (e.g. `EmergencyDeptPage.config.js`)
2. Add a section object to the `sections` array:

```js
{
  id: "my-new-section",           // unique, used for anchor nav + download filename
  title: "myPage.charts.myChart.title",  // key in src/content/text.json
  subtitle: "myPage.charts.myChart.subtitle",
  infoIcon: true,                 // shows ⓘ that opens modal
  downloadIcon: true,             // shows CSV download
  animateOnScroll: true,
  modal: {
    title: "{virus} My Metric",
    markdownPath: "/content/modals/my-explainer.md",
  },
  showIfVirus: "COVID-19",        // optional — omit to show for all viruses
  dataType: "ed",                 // optional — filter to specific data type tab
  chart: {
    type: "lineChart",            // must match a key in chartRegistry.js
    props: {
      metricName: "{virus} my metric",   // matched against CSV metric column
      submetric: "Total",                // matched against CSV submetric column
      xField: "date",
      yField: "value",
      colorField: "submetric",
      defaultDisplay: "Percent",
    },
  },
}
```

3. Add the title/subtitle strings to `src/content/text.json` under the matching key path
4. If `infoIcon: true`, create the explainer markdown at the path in `modal.markdownPath`

---

## Adding a New Data Type Tab

Data type tabs (Emergency department, Lab-reported cases, etc.) are controlled by a single file:

**`src/utils/dataTypeOptions.js`**

```js
export const ALL_DATA_TYPE_OPTIONS = [
  { label: "Emergency department", value: "ed" },
  { label: "Lab-reported cases",   value: "lab" },
  { label: "COVID-19 deaths",      value: "death" },
  { label: "Wastewater",           value: "wastewater" },
  // Add new entries here — sidebar, top controls, and floating pill all update automatically
];
```

Then register the CSV URL in `src/views/config/Data.config.js`:

```js
export const DATA_PATHS = {
  ed:    `${DATA_BASE_URL_RAW}emergencyDeptData.csv`,
  lab:   `${DATA_BASE_URL_RAW}caseData.csv`,
  death: `${DATA_BASE_URL_RAW}deathData.csv`,
  mynew: `${DATA_BASE_URL_RAW}myNewData.csv`,   // ← add here
};
```

Then add sections tagged with `dataType: "mynew"` to the relevant virus configs.

---

## Adding a New Virus Data Page

1. Create `src/views/config/virus/MyVirusPage.config.js` composing from the relevant data-type configs
2. Register it in `src/views/config/pageRegistry.js`:

```js
import myVirusPageConfig from "./virus/MyVirusPage.config";

export const pageRegistry = {
  "covid-19": covidPageConfig,
  "flu":      fluPageConfig,
  "rsv":      rsvPageConfig,
  "my-virus": myVirusPageConfig,   // ← slug becomes /data/my-virus
};
```

3. Add the virus to the sidebar pill list in `src/components/controls/VirusFilterGroup.jsx` and `PageSidebar.jsx`'s `VIRUS_SLUGS` map
4. No changes to routing — `app/data/[virus]/page.jsx` handles all slugs dynamically

---

## Adding a Custom Section (non-chart)

For sections that aren't a standard chart (e.g. a map, stat grid, or bespoke component):

1. Set `renderAs: "custom"` and `component: "MyComponent"` in the section config
2. Import and register the component in `src/utils/componentRegistry.js`:

```js
import MyComponent from "../components/MyComponent";

const componentRegistry = {
  StatGrid,
  OverviewGrid,
  MyComponent,   // ← add here
  ...
};
```

Note: if the component touches `window` at import time (e.g. Leaflet maps), use `next/dynamic` with `{ ssr: false }`.

---

## Updating Markdown Content

All prose content lives in `public/content/` and is fetched at runtime by the browser — no rebuild needed after editing these files.

| File location | What it controls |
|---|---|
| `public/content/sections/edSectionText.md` | Summary text at top of ED data section |
| `public/content/sections/caseDataSectionText.md` | Summary text for lab cases |
| `public/content/sections/covidDeathSectionText.md` | Summary text for COVID deaths |
| `public/content/sections/about/*.md` | Individual sections on the About page |
| `public/content/modals/*.md` | Chart explainer text (opened via ⓘ icon) |
| `public/content/footer/footer.md` | Footer body copy |

Markdown supports `{virus}`, `{view}`, and `{trend}` template tokens which are interpolated at render time.

---

## Theming and Design Tokens

All colors, spacing, typography, and border-radius values are CSS custom properties defined in `src/styles/tokens.css`. Tailwind is configured to use these tokens via `tailwind.config.js`, so both CSS files and Tailwind utility classes pull from the same values.

To change a color site-wide, update the variable in `tokens.css`. To add a new token:

1. Add it to `tokens.css`
2. Add the Tailwind mapping in `tailwind.config.js` under `theme.extend.colors` (or spacing/etc.)

Dark mode token overrides go in the `[data-theme="dark"]` block in `tokens.css`.

---

## Adding UI Text

All UI strings (titles, subtitles, labels) live in `src/content/text.json`. Config objects reference them by dot-notation key (e.g. `"emergencyDeptPage.mainTitle"`), resolved via `getText(key)` in `src/utils/contentUtils.js`. Missing keys log a warning and return the key string as fallback.

---

## Key Constraints

- All `src/` components run inside a `'use client'` boundary (all app pages are client-rendered). Adding `'use client'` to individual components is optional but harmless.
- Components that access `window` at module load time (Leaflet, etc.) must use `next/dynamic` with `{ ssr: false }`.
- Data is fetched client-side from GitHub raw URLs. The `public/data/` CSVs are local fallbacks for development only.
- The app deploys to a sub-path (`/assets/doh/respiratory-illness-data`) in production. Use `resolveAsset()` and `resolvePublicPath()` from `pathUtils.js` for all asset references — never hardcode absolute paths.
