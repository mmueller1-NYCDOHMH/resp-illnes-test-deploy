export function downloadCSV(rows, filename = "data.csv") {
  if (!Array.isArray(rows) || rows.length === 0) return;

  // --- helper: format date as YYYY-MM-DD like the preview table ---
  const formatDateCell = (v) => {
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // --- helper: escape quotes for CSV ---
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  // --- build header set ---
  const headerSet = new Set();
  for (const r of rows) {
    Object.keys(r || {}).forEach((k) => {
      
      const lower = k.toLowerCase();

      if (lower.includes("raw")) {
        if (lower === "rawvalue") headerSet.add("value");
      } else {
        headerSet.add(k);
      }
    });
  }

  const headers = Array.from(headerSet);

  // --- build CSV rows ---
  const csvRows = [
    headers.join(","), // header row
    ...rows.map((r) => {
      return headers
        .map((h) => {
          if (h === "value") {
            return esc(r.rawValue ?? r.value);
          }
          if (h.toLowerCase().includes("date")) {
            // format date columns cleanly
            return esc(formatDateCell(r[h]));
          }
          return esc(r[h]);
        })
        .join(",");
    }),
  ];

  const blob = new Blob(["\ufeff", csvRows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}


export const slugify = (s = "") =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "");

export const formatDateForFile = (isoLike) => {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const buildDownloadName = ({
  virus,
  metric,
  category,
  date,
  ext = "csv",
  includeMetric = true,
  fallbackVirus = "overview",
}) => {
  const virusPart = slugify(virus) || slugify(fallbackVirus);
  const metricPart = includeMetric ? slugify(metric || "") : "";
  const categoryPart = slugify(category || "");
  const datePart = slugify(formatDateForFile(date));
  const cleanExt = String(ext || "csv").replace(/^\./, "");

  const parts = [virusPart, metricPart, categoryPart, datePart].filter(Boolean);
  return `${parts.join("-") || "download"}.${cleanExt}`;
};
