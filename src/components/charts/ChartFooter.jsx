import React from "react";
import { marked } from "marked";
import "../layout/ChartContainer.css";
import { formatShortDate } from "../../utils/trendUtils";
import DataAsOf from "./DataAsOf";

function toLocalDate(dLike) {
  if (!dLike) return null;
  if (dLike instanceof Date && !Number.isNaN(dLike.getTime())) return dLike;

  const s = String(dLike);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

const ChartFooter = ({ footnote, dataSource, uploadDate }) => {
  const d = toLocalDate(uploadDate);
  const formattedDate = formatShortDate(d);

  // Nothing to show → render nothing
  if (!footnote && !dataSource && !formattedDate) return null;

  return (
    <div
      className="chart-footer-inner"
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        color: "var(--footnote-gray)",
        fontSize: "var(--font-size-xs)",
      }}
    >
      {/* LEFT: Footnote / source */}
      <div
        style={{
          flex: 1,
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {typeof footnote === "string" && (
          <div dangerouslySetInnerHTML={{ __html: footnote }} />
        )}

        {!footnote && typeof dataSource === "string" && (
          <div>
            <span
              dangerouslySetInnerHTML={{
                __html: marked.parseInline(dataSource),
              }}
            />
          </div>
        )}
      </div>

      {/* RIGHT: Date */}
      {formattedDate && (
        <div style={{ whiteSpace: "nowrap", textAlign: "right" }}>
          <DataAsOf date={formattedDate} />
        </div>
      )}
    </div>
  );
};

export default ChartFooter;
