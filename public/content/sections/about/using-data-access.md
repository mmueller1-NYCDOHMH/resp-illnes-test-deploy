All data displayed on this site is publicly available and free to download.

#### Downloading and sharing charts

Most charts have a **Download** button in their header that opens a panel with several options: **Download CSV** (just that chart's underlying data, with a preview table), **Download PNG** (an image of the chart), **Copy chart as image**, and **Embed chart** (an iframe snippet you can paste into another page).

#### Raw CSV data files

The underlying data files are served from this site at:

- `/data/emergencyDeptData.csv` — ED visits and hospitalizations
- `/data/caseData.csv` — lab-confirmed cases
- `/data/deathData.csv` — COVID-19 deaths
- `/data/otherRespData.csv` — respiratory panel results
- `/data/wastewaterData.csv` — wastewater viral load by pathogen

The first four files share a consistent format with columns: `date`, `metric`, `submetric`, `value`, `display`. The **`metric`** column identifies the illness and measure (e.g. *COVID-19 visits*). The **`submetric`** column identifies the demographic group or area (e.g. *Overall*, *18–44 years*, *Bronx*). The wastewater file uses a simpler format instead: `date`, `pathogen`, `value`.

> Data is updated every **Thursday** with values through the previous Saturday. All figures are preliminary and may be revised as additional reports arrive.

#### GitHub repository

Full documentation of all data files, collection methods, processing code, and update history is available in the <a href="https://github.com/nychealth/respiratory-illness-data" target="_blank" rel="noopener noreferrer">NYC Health Department respiratory illness data GitHub repository<span class="sr-only"> (opens in new tab)</span></a>.
