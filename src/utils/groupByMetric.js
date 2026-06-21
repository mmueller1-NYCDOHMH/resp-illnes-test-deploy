// src/utils/groupByMetric.js
export function groupByMetric(rows = []) {
    return rows.reduce((acc, row) => {
      const key = row.metric;
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }
  