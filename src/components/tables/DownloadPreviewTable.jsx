import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import "./DownloadPreviewTable.css"; // retains only: .preview-table th/td/thead table element selectors

const isDateLike = (v) =>
  v instanceof Date ||
  (v && typeof v === "object" && typeof v.getTime === "function" && !Number.isNaN(v.getTime()));

const isNumericLike = (v) =>
  typeof v === "number" ||
  (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));

const toCellText = (v) => {
  if (v == null) return "";
  if (isDateLike(v)) {
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && !Number.isFinite(v)) return "";
  return String(v);
};

const compareValues = (a, b) => {
  if (isDateLike(a) && isDateLike(b)) return new Date(a) - new Date(b);
  if (isNumericLike(a) && isNumericLike(b)) return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const paginBtnCls = [
  "px-3 py-[6px] border-0 rounded",
  "text-gray-200 bg-blue-primary cursor-pointer",
  "transition-[background-color,transform] duration-200",
  "hover:bg-blue-secondary",
  "active:scale-[1.09]",
  "disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed",
].join(" ");

const DownloadPreviewTable = ({ data = [], columnLabels = {}, maxRows = 100, pageSize = 5 }) => {
  const baseData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const columns = useMemo(() => {
    if (!baseData.length) return [];
    return Object.keys(baseData[0]).filter((col) => !col.toLowerCase().includes("raw"));
  }, [baseData]);

  const [sortBy, setSortBy] = useState(columns[0] || null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const handleSort = (column) => {
    setSortBy((prev) => {
      if (prev === column) { setSortAsc((p) => !p); return prev; }
      setSortAsc(true);
      return column;
    });
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortBy) return baseData;
    return [...baseData].sort((a, b) => {
      const cmp = compareValues(a?.[sortBy], b?.[sortBy]);
      return sortAsc ? cmp : -cmp;
    });
  }, [baseData, sortBy, sortAsc]);

  const limited = useMemo(() => sorted.slice(0, maxRows), [sorted, maxRows]);
  const totalPages = Math.max(1, Math.ceil(limited.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => limited.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [limited, currentPage, pageSize]
  );

  if (!columns.length) return null;

  return (
    <div className="overflow-x-auto my-3 font-body">
      <table className="preview-table border-collapse w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} onClick={() => handleSort(col)}>
                {columnLabels[col] || col}
                {sortBy === col ? (sortAsc ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col}>{toCellText(row?.[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-2 flex justify-between text-sm">
          <button className={paginBtnCls} disabled={currentPage === 0} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>Page {currentPage + 1} of {totalPages}</span>
          <button className={paginBtnCls} disabled={currentPage + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

DownloadPreviewTable.propTypes = {
  data: PropTypes.array.isRequired,
  columnLabels: PropTypes.object,
  maxRows: PropTypes.number,
  pageSize: PropTypes.number,
};

export default DownloadPreviewTable;
