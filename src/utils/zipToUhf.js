// src/utils/zipToUhf.js
//
// Static ZIP code -> UHF42 neighborhood geocode crosswalk, for the
// neighborhood search box's ZIP lookup (NeighborhoodSearchInput /
// useChoroplethMap's `suggestions`).
//
// There's no ready-made ZIP-to-UHF42 table published anywhere DOHMH makes
// easy to fetch — the EHDP-data repo has UHF42 boundaries but no ZIP
// crosswalk, and DOHMH's own "Find your UHF" tool
// (a816-dohbesp.nyc.gov/IndicatorPublic/data-features/find-your-uhf/) only
// maps Community/Council Districts to UHF, not ZIPs. So this was built
// 2026-08-19 from two files DOHMH *does* publish, in the sibling
// nychealth/coronavirus-data repo:
//   - Geography-resources/ZCTA-to-MODZCTA.csv — raw ZIP/ZCTA -> "Modified
//     ZCTA" (MODZCTA groups low-population ZCTAs together for stable rates,
//     same idea as RPU's UHF34 groupings elsewhere in this codebase).
//   - totals/data-by-modzcta.csv — each MODZCTA's neighborhood name,
//     borough, and a representative lat/lon point.
// Each MODZCTA's representative point was tested against the UHF42
// boundaries (UHF42.geojson, the same file useChoroplethMap.js fetches for
// the map itself) to find which UHF42 polygon contains it, using Shapely;
// every ZIP under that MODZCTA inherits the result. Verified against
// data-by-modzcta.csv's own BOROUGH_GROUP column: 0 of 177 MODZCTA
// centroids landed in a UHF42 neighborhood outside their stated borough.
//
// Caveats:
//  - This is a representative-point approximation, not an authoritative
//    DOHMH ZIP-to-UHF table. A ZIP/MODZCTA whose area straddles a UHF42
//    boundary is assigned to whichever side its representative point falls
//    on — usually right, occasionally a coin flip for a ZIP that's
//    genuinely split (e.g. 10305 on Staten Island, which spans both
//    Stapleton/St. George and South Beach/Tottenville, resolves to
//    Stapleton/St. George here).
//  - One ZIP (11425) inherits an odd cross-borough assignment straight
//    from DOHMH's own ZCTA-to-MODZCTA.csv, which buckets it into MODZCTA
//    11209 (Bay Ridge, Brooklyn) rather than a Queens MODZCTA — not
//    something introduced by the point-in-polygon step here, just passed
//    through as-is from the upstream source file.
//  - Covers the 214 ZIPs DOHMH's crosswalk recognizes as NYC residential
//    ZCTAs; PO-box-only / non-residential ZIPs outside that list won't
//    match.
//
// If DOHMH ever publishes a real ZIP-to-UHF42 table, swap this file for
// that instead of maintaining the derivation above.
export const ZIP_TO_UHF = {
  "10001": 306,
  "10002": 309,
  "10003": 309,
  "10004": 310,
  "10005": 310,
  "10006": 310,
  "10007": 310,
  "10009": 309,
  "10010": 307,
  "10011": 306,
  "10012": 308,
  "10013": 308,
  "10014": 308,
  "10016": 307,
  "10017": 307,
  "10018": 306,
  "10019": 306,
  "10020": 306,
  "10021": 305,
  "10022": 307,
  "10023": 304,
  "10024": 304,
  "10025": 304,
  "10026": 302,
  "10027": 302,
  "10028": 305,
  "10029": 303,
  "10030": 302,
  "10031": 301,
  "10032": 301,
  "10033": 301,
  "10034": 301,
  "10035": 303,
  "10036": 306,
  "10037": 302,
  "10038": 310,
  "10039": 302,
  "10040": 301,
  "10044": 305,
  "10065": 305,
  "10069": 304,
  "10075": 305,
  "10103": 306,
  "10110": 306,
  "10111": 306,
  "10112": 306,
  "10115": 302,
  "10119": 306,
  "10128": 305,
  "10152": 307,
  "10153": 307,
  "10154": 307,
  "10162": 305,
  "10165": 307,
  "10167": 307,
  "10168": 307,
  "10169": 307,
  "10170": 307,
  "10171": 307,
  "10172": 307,
  "10173": 307,
  "10174": 307,
  "10177": 307,
  "10199": 306,
  "10271": 310,
  "10278": 310,
  "10279": 310,
  "10280": 310,
  "10282": 310,
  "10301": 502,
  "10302": 501,
  "10303": 501,
  "10304": 502,
  "10305": 502,
  "10306": 504,
  "10307": 504,
  "10308": 504,
  "10309": 504,
  "10310": 501,
  "10311": 503,
  "10312": 504,
  "10314": 503,
  "10451": 106,
  "10452": 106,
  "10453": 105,
  "10454": 107,
  "10455": 107,
  "10456": 106,
  "10457": 105,
  "10458": 103,
  "10459": 107,
  "10460": 105,
  "10461": 104,
  "10462": 104,
  "10463": 101,
  "10464": 104,
  "10465": 104,
  "10466": 102,
  "10467": 103,
  "10468": 103,
  "10469": 102,
  "10470": 103,
  "10471": 101,
  "10472": 104,
  "10473": 104,
  "10474": 107,
  "10475": 102,
  "11001": 409,
  "11003": 409,
  "11004": 409,
  "11005": 409,
  "11040": 409,
  "11101": 401,
  "11102": 401,
  "11103": 401,
  "11104": 401,
  "11105": 401,
  "11106": 401,
  "11109": 401,
  "11201": 202,
  "11203": 207,
  "11204": 206,
  "11205": 202,
  "11206": 211,
  "11207": 204,
  "11208": 204,
  "11209": 209,
  "11210": 207,
  "11211": 201,
  "11212": 203,
  "11213": 203,
  "11214": 209,
  "11215": 202,
  "11216": 203,
  "11217": 202,
  "11218": 206,
  "11219": 206,
  "11220": 205,
  "11221": 211,
  "11222": 201,
  "11223": 210,
  "11224": 210,
  "11225": 207,
  "11226": 207,
  "11228": 209,
  "11229": 210,
  "11230": 206,
  "11231": 202,
  "11232": 205,
  "11233": 203,
  "11234": 208,
  "11235": 210,
  "11236": 208,
  "11237": 211,
  "11238": 203,
  "11239": 208,
  "11351": 403,
  "11354": 403,
  "11355": 403,
  "11356": 403,
  "11357": 403,
  "11358": 403,
  "11359": 403,
  "11360": 403,
  "11361": 404,
  "11362": 404,
  "11363": 404,
  "11364": 404,
  "11365": 406,
  "11366": 406,
  "11367": 406,
  "11368": 402,
  "11369": 402,
  "11370": 402,
  "11371": 402,
  "11372": 402,
  "11373": 402,
  "11374": 405,
  "11375": 405,
  "11377": 402,
  "11378": 402,
  "11379": 405,
  "11385": 405,
  "11411": 409,
  "11412": 408,
  "11413": 409,
  "11414": 407,
  "11415": 407,
  "11416": 407,
  "11417": 407,
  "11418": 407,
  "11419": 407,
  "11420": 407,
  "11421": 407,
  "11422": 409,
  "11423": 408,
  "11424": 407,
  "11425": 209,
  "11426": 409,
  "11427": 409,
  "11428": 409,
  "11429": 409,
  "11430": 408,
  "11432": 408,
  "11433": 408,
  "11434": 408,
  "11435": 408,
  "11436": 408,
  "11451": 408,
  "11691": 410,
  "11692": 410,
  "11693": 410,
  "11694": 410,
  "11697": 410,
};

/** True for a string that looks like a 5-digit US ZIP code. */
export function looksLikeZip(query) {
  return /^\d{5}$/.test(query.trim());
}

/**
 * Resolves a 5-digit ZIP string to a UHF42 geocode, or null if it's not a
 * ZIP shape or isn't in the crosswalk.
 */
export function uhfGeocodeForZip(query) {
  const trimmed = query.trim();
  if (!looksLikeZip(trimmed)) return null;
  return ZIP_TO_UHF[trimmed] ?? null;
}
