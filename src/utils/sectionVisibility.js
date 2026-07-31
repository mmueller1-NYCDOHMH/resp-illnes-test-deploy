/**
 * Determines whether a config section should be rendered given current page state.
 *
 * Rules (both must pass):
 *  1. section.dataType (if set) must match current dataType (case-insensitive)
 *  2. section.showIfVirus (if set) must include activeVirus (with aliases resolved)
 *
 * @param {object} section  - Page config section object
 * @param {{ activeVirus: string, dataType: string }} state
 * @returns {boolean}
 */

const normalizeVirus = (v) => {
  if (!v) return "";
  const s = String(v).toLowerCase();
  if (s === "influenza") return "flu";
  if (s === "covid") return "covid-19";
  return s;
};

export const isSectionVisible = (section, { activeVirus, dataType }) => {
  const { showIfVirus: allowed, dataType: allowedDataType } = section;

  const matchesDataType =
    !allowedDataType ||
    String(allowedDataType).toLowerCase() === String(dataType).toLowerCase();

  const activeVirusNorm = normalizeVirus(activeVirus);
  const matchesVirus = !allowed
    ? true
    : [allowed].flat().some((v) => normalizeVirus(v) === activeVirusNorm);

  return matchesDataType && matchesVirus;
};
