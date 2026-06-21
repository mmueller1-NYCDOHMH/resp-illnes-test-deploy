// Data.config.js
export const DATA_BASE_URL_RAW =
  "https://raw.githubusercontent.com/nychealth/respiratory-illness-data/main/data/";


export const DATA_BASE_URL_BLOB =
  "https://github.com/nychealth/respiratory-illness-data/blob/main/data/";

export const DATA_PATHS = {
  ed: `${DATA_BASE_URL_RAW}emergencyDeptData.csv`,
  lab: `${DATA_BASE_URL_RAW}caseData.csv`,
  deathT: `${DATA_BASE_URL_RAW}deathData.csv`,
  death: `${DATA_BASE_URL_RAW}deathData.csv`
};

export const DATA_PATHS_BLOB = {
  ed: `${DATA_BASE_URL_BLOB}emergencyDeptData.csv`,
  lab: `${DATA_BASE_URL_BLOB}caseData.csv`,
  death: `${DATA_BASE_URL_BLOB}deathData.csv`,
};
