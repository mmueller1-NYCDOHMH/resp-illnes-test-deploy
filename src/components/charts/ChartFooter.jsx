import React from "react";
import { marked } from "marked";
import { tokens } from "../../styles/tokens";
import "../layout/ChartContainer.css";

const { colors } = tokens;

function toLocalDate(dLike) {
  if (!dLike) return null;
  if (dLike instanceof Date && !Number.isNaN(dLike.getTime())) return dLike;

  const s = String(dLike);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

const ChartFooter = ({ footnote, dataSource, uploadDate }) => {
  const d = toLocalDate(uploadDate);
  const formattedDate = d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

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
        fontSize: "12px",
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
          Data as of: {formattedDate}
        </div>
      )}
    </div>
  );
};

export default ChartFooter;
