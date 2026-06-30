All data displayed on this site is publicly available and free to download.

#### Downloading chart images

Most charts have a **download button (↓)** in their header. Clicking it saves the chart as a PNG file, including the current title and filter state.

#### Raw CSV data files

The underlying data files are served from this site at:

- `/data/emergencyDeptData.csv` — ED visits and hospitalizations
- `/data/caseData.csv` — lab-confirmed cases
- `/data/otherRespData.csv` — respiratory panel results

All files share a consistent format with columns: `date`, `metric`, `submetric`, `value`, `display`. The **`metric`** column identifies the illness and measure (e.g. *COVID-19 visits*). The **`submetric`** column identifies the demographic group or area (e.g. *Overall*, *18–44 years*, *Bronx*).

> Data is updated every **Thursday** with values through the previous Saturday. All figures are preliminary and may be revised as additional reports arrive.

#### GitHub repository

Full documentation of all data files, collection methods, processing code, and update history is available in the <a href="https://github.com/nychealth/respiratory-illness-data" target="_blank" rel="noopener noreferrer">NYC Health Department respiratory illness data GitHub repository</a>.
