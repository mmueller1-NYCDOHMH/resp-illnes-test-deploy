# Content Editing Guide

Quick reference for making content changes without touching code.

---

## Where things live

| What you want to change | File to edit |
|---|---|
| Nav labels (Home, Data, About) | `src/content/text/nav.json` → `nav` |
| "Additional Resources" bottom nav titles/descriptions | `src/content/text/nav.json` → `overviewBottomNav` |
| Homepage intro paragraph | `public/content/overview-intro.md` |
| Homepage disclaimer (bottom of page) | `public/content/overview-disclaimer.md` |
| "What's happening across the city?" heading | `src/content/text/overview.json` → `overview.statGrid.title` |
| "About Emergency Department Data" modal title | `src/content/text/overview.json` → `overview.statGrid.infoModalTitle` |
| "About Emergency Department Data" modal body | `public/content/modals/emergency-dept-overview.md` |
| Stat card labels (Overall Respiratory Illness, COVID-19, etc.) | `src/content/text/overview.json` → `overview.statCards` |
| Update schedule note ("updated every Thursday…") | `src/content/text/overview.json` → `overview.updateNote` |
| About page intro paragraph | `public/content/about-intro.md` |
| About page section headings (Data Information, accordion items) | `src/content/text/about.json` → `aboutPage.sections` |
| About page card titles and links | `src/data/aboutCards.json` |
| ED / Lab / Deaths / Wastewater chart titles and subtitles | `src/content/text/data-pages.json` |
| Footer links (columns of NYC.gov links) | `src/data/footerLinks.json` |
| Sidebar "Jump to" links | `src/views/config/featuredLinks.json` |
| About page long-form sections (ED visits, lab reports, etc.) | `public/content/sections/about/*.md` |
| "Using This Site" guide sections | `public/content/sections/about/using-*.md` |

---

## Editing markdown files

Markdown files use plain text with simple formatting:

```
**bold text**
[link text](https://url.com)
[internal link](/data/covid-19)

- bullet point
- another point
```

No HTML tags needed. Links to pages on this site use `/data/covid-19` style paths (no domain).

---

## Editing JSON files

JSON files must stay valid — watch out for:
- Every string value needs double quotes: `"like this"`
- Items in a list are separated by commas, but **no comma after the last item**
- Curly braces `{}` and square brackets `[]` must always be matched

When in doubt, paste the file into [jsonlint.com](https://jsonlint.com) to check it before saving.

---

## Updating footer links (`src/data/footerLinks.json`)

The file is an array of three columns, each containing link objects:

```json
[
  [
    { "label": "Directory of City Agencies", "href": "/nyc-resources/agencies.page" },
    ...
  ],
  [...],
  [...]
]
```

To add a link, add a new `{ "label": "...", "href": "..." }` object to the column where you want it to appear. To remove one, delete its line (and the comma on the line above if it was the last item).

---

## Updating sidebar "Jump to" links (`src/views/config/featuredLinks.json`)

Each entry controls a link in the left sidebar on the homepage:

```json
{
  "label": "COVID-19 ED Trends",
  "href": "/data/covid-19#ed-trends",
  "virus": "COVID-19",
  "description": "Weekly % of ED visits with a COVID-19 diagnosis",
  "dataFile": "/data/emergencyDeptData.csv",
  "metric": "COVID-19 visits",
  "submetric": "Overall"
}
```

- `label` — text shown in the sidebar
- `href` — where clicking goes (use `#section-id` to jump to a section)
- `description` — shown in the hover preview card
- `virus` — controls the preview card color (`"COVID-19"`, `"Flu"`, or `"RSV"`)
- `dataFile`, `metric`, `submetric` — which data to show in the hover sparkline; set `dataFile` to `null` for map sections

---

## Colors

**UI colors** (header, footer, links, nav): edit `src/styles/tokens.css`. Look for the semantic aliases section near the bottom (e.g. `--footer-bg`, `--blue-primary`).

**Chart and sparkline colors**: edit `src/styles/tokens.js` → `colorScales`. Each virus has 5 shades; index `[2]` is the primary color used for chart lines and page accents.

---

## What requires a developer

- Adding a new page or data type
- Changing chart types or data sources
- Modifying the site layout or navigation structure
- Updating the data CSV files
