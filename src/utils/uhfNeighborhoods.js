// src/utils/uhfNeighborhoods.js
//
// Static registry of NYC's 42 United Hospital Fund (UHF42) neighborhoods —
// the real geographic unit RPU's ED/case/hospitalization data is reported
// at (see project memory: "RVP geo unit will be UHF, not CD"). Names/
// boroughs sourced from the GEOCODE/GEONAME/BOROUGH properties of the same
// EHDP-data UHF42.geojson boundary file useChoroplethMap fetches for the
// map itself — kept here as a small static object (rather than re-derived
// from the fetched GeoJSON on every load) so components can look up a
// neighborhood's name before/independent of the GeoJSON fetch resolving.
//
// GEOCODE 0 (present in the GeoJSON for unmapped/non-residential area —
// e.g. parks, airports) is intentionally omitted; it never appears as a
// submetric in the RPU case/ED CSVs.
export const UHF_NEIGHBORHOODS = {
  101: { name: "Kingsbridge/Riverdale", borough: "Bronx" },
  102: { name: "Northeast Bronx", borough: "Bronx" },
  103: { name: "Fordham/Bronx Park", borough: "Bronx" },
  104: { name: "Pelham/Throgs Neck", borough: "Bronx" },
  105: { name: "Crotona/Tremont", borough: "Bronx" },
  106: { name: "High Bridge/Morrisania", borough: "Bronx" },
  107: { name: "Hunts Point/Mott Haven", borough: "Bronx" },
  201: { name: "Greenpoint", borough: "Brooklyn" },
  202: { name: "Downtown/Heights/Slope", borough: "Brooklyn" },
  203: { name: "Bedford Stuyvesant/Crown Heights", borough: "Brooklyn" },
  204: { name: "East New York", borough: "Brooklyn" },
  205: { name: "Sunset Park", borough: "Brooklyn" },
  206: { name: "Borough Park", borough: "Brooklyn" },
  207: { name: "East Flatbush/Flatbush", borough: "Brooklyn" },
  208: { name: "Canarsie/Flatlands", borough: "Brooklyn" },
  209: { name: "Bensonhurst/Bay Ridge", borough: "Brooklyn" },
  210: { name: "Coney Island/Sheepshead Bay", borough: "Brooklyn" },
  211: { name: "Williamsburg/Bushwick", borough: "Brooklyn" },
  301: { name: "Washington Heights/Inwood", borough: "Manhattan" },
  302: { name: "Central Harlem/Morningside Heights", borough: "Manhattan" },
  303: { name: "East Harlem", borough: "Manhattan" },
  304: { name: "Upper West Side", borough: "Manhattan" },
  305: { name: "Upper East Side", borough: "Manhattan" },
  306: { name: "Chelsea/Clinton", borough: "Manhattan" },
  307: { name: "Gramercy Park/Murray Hill", borough: "Manhattan" },
  308: { name: "Greenwich Village/Soho", borough: "Manhattan" },
  309: { name: "Union Square/Lower East Side", borough: "Manhattan" },
  310: { name: "Lower Manhattan", borough: "Manhattan" },
  401: { name: "Long Island City/Astoria", borough: "Queens" },
  402: { name: "West Queens", borough: "Queens" },
  403: { name: "Flushing/Clearview", borough: "Queens" },
  404: { name: "Bayside/Little Neck", borough: "Queens" },
  405: { name: "Ridgewood/Forest Hills", borough: "Queens" },
  406: { name: "Fresh Meadows", borough: "Queens" },
  407: { name: "Southwest Queens", borough: "Queens" },
  408: { name: "Jamaica", borough: "Queens" },
  409: { name: "Southeast Queens", borough: "Queens" },
  410: { name: "Rockaway", borough: "Queens" },
  501: { name: "Port Richmond", borough: "Staten Island" },
  502: { name: "Stapleton/St. George", borough: "Staten Island" },
  503: { name: "Willowbrook", borough: "Staten Island" },
  504: { name: "South Beach/Tottenville", borough: "Staten Island" },
};

export const UHF_GEOCODES = Object.keys(UHF_NEIGHBORHOODS).map(Number);
