import React, { useState } from "react";
import PropTypes from "prop-types";
import DownloadPreviewTable from "../tables/DownloadPreviewTable";

// ── Icons ─────────────────────────────────────────────────────────────────────
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ImageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const EmbedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Shared button style ───────────────────────────────────────────────────────
const btnCls = [
  "inline-flex items-center gap-1.5 bg-blue-primary text-gray-200 text-sm",
  "px-3 py-[6px] rounded-md border-0 cursor-pointer font-medium m-[3px]",
  "hover:bg-blue-secondary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

const ghostCls = [
  "inline-flex items-center gap-1.5 text-sm border border-[var(--gray-300)]",
  "px-3 py-[6px] rounded-md cursor-pointer font-medium m-[3px] bg-white text-gray-700",
  "hover:bg-[var(--gray-100)] transition-colors duration-200",
].join(" ");

// ── Section divider ───────────────────────────────────────────────────────────
const Divider = ({ label }) => (
  <div className="flex items-center gap-2 my-3">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{label}</span>
    <div className="flex-1 border-t border-[var(--gray-200)]" />
  </div>
);

// ── DownloadPanel ─────────────────────────────────────────────────────────────
const DownloadPanel = ({
  onConfirm,
  onDownloadPNG,
  onCopyImage,
  sectionId,
  previewData = [],
  columnLabels = {},
  description,
}) => {
  const hasPreview = Array.isArray(previewData) && previewData.length > 0;
  const [copyState, setCopyState]   = useState("idle"); // idle | copying | done | error
  const [embedOpen, setEmbedOpen]   = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const handleCopyImage = async () => {
    if (!onCopyImage) return;
    setCopyState("copying");
    try {
      await onCopyImage();
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  // Embed snippet
  const embedSrc = sectionId
    ? `${window.location.origin}${window.location.pathname}${window.location.search}#${sectionId}`
    : window.location.href;
  const embedSnippet = `<iframe\n  src="${embedSrc}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  loading="lazy"\n  title="NYC Respiratory Illness Data"\n></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  };

  const showShare = onCopyImage || sectionId;

  return (
    <div>
      {/* ── Download ── */}
      <Divider label="Download" />
      <div className="flex flex-wrap items-center">
        <button type="button" className={btnCls} onClick={onConfirm} disabled={!onConfirm} aria-label="Download CSV">
          <DownloadIcon /> Download CSV
        </button>
        {onDownloadPNG && (
          <button type="button" className={btnCls} onClick={onDownloadPNG} aria-label="Download PNG">
            <ImageIcon /> Download PNG
          </button>
        )}
      </div>

      {description && (
        <p className="m-0 mt-2 text-sm text-gray-700">{description}</p>
      )}

      {/* ── Share ── */}
      {showShare && (
        <>
          <Divider label="Share" />
          <div className="flex flex-wrap items-center">
            {onCopyImage && (
              <button
                type="button"
                className={ghostCls}
                onClick={handleCopyImage}
                disabled={copyState === "copying"}
                aria-label="Copy chart as image"
              >
                {copyState === "done" ? <CheckIcon /> : <CopyIcon />}
                {copyState === "done"
                  ? "Copied!"
                  : copyState === "error"
                  ? "Copy failed"
                  : "Copy chart as image"}
              </button>
            )}
            {sectionId && (
              <button
                type="button"
                className={ghostCls}
                onClick={() => setEmbedOpen((o) => !o)}
                aria-expanded={embedOpen}
                aria-label="Show embed code"
              >
                <EmbedIcon />
                {embedOpen ? "Hide embed code" : "Embed chart"}
              </button>
            )}
          </div>

          {/* Inline embed snippet */}
          {embedOpen && (
            <div className="mt-3">
              <pre className="text-[11px] bg-[var(--gray-100)] border border-[var(--gray-300)] rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-800 m-0 mb-2">
                {embedSnippet}
              </pre>
              <button
                type="button"
                className={btnCls}
                onClick={handleCopyEmbed}
                style={{ margin: 0 }}
              >
                {embedCopied ? <><CheckIcon /> Copied!</> : "Copy embed code"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Data preview ── */}
      {hasPreview && (
        <div className="mt-3">
          <Divider label="Preview" />
          <DownloadPreviewTable data={previewData} columnLabels={columnLabels} maxRows={100} />
        </div>
      )}
    </div>
  );
};

DownloadPanel.propTypes = {
  onConfirm:    PropTypes.func.isRequired,
  onDownloadPNG: PropTypes.func,
  onCopyImage:  PropTypes.func,
  sectionId:    PropTypes.string,
  previewData:  PropTypes.array,
  columnLabels: PropTypes.object,
  description:  PropTypes.string,
};

export default DownloadPanel;
