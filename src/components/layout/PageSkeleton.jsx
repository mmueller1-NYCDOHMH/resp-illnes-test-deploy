/**
 * PageSkeleton
 *
 * Shown while ConfigDrivenPage waits for data to hydrate.
 * Mirrors the real page structure (header → sidebar + content cards)
 * so the layout doesn't jump when content arrives.
 */

import React from "react";

// Single shimmer block — rounded rect with a moving highlight
const Bone = ({ className = "", style = {} }) => (
  <div
    className={`skeleton-bone ${className}`}
    style={style}
  />
);

const PageSkeleton = () => (
  <>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
      .skeleton-bone {
        border-radius: 6px;
        background: linear-gradient(
          90deg,
          var(--gray-200) 25%,
          var(--gray-300) 50%,
          var(--gray-200) 75%
        );
        background-size: 600px 100%;
        animation: shimmer 1.4s ease-in-out infinite;
      }
    `}</style>

    {/* ── Header ── */}
    <div style={{
      backgroundColor: "white",
      borderBottom: "1px solid var(--gray-200)",
      padding: "24px 24px 20px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Bone style={{ height: 28, width: "38%", marginBottom: 12 }} />
        <Bone style={{ height: 14, width: "62%", marginBottom: 6 }} />
        <Bone style={{ height: 14, width: "48%" }} />
      </div>
    </div>

    {/* ── Body: sidebar + cards ── */}
    <div style={{
      maxWidth: 1280,
      margin: "0 auto",
      display: "flex",
      padding: "0",
      minHeight: "80vh",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--gray-300)",
        padding: "24px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        backgroundColor: "var(--gray-100)",
      }}>
        <Bone style={{ height: 10, width: "55%", marginBottom: 8 }} />
        {[70, 55, 50].map((w, i) => (
          <Bone key={i} style={{ height: 34, width: "100%", borderRadius: 999 }} />
        ))}
        <div style={{ marginTop: 20, borderTop: "1px solid var(--gray-200)", paddingTop: 16 }}>
          <Bone style={{ height: 10, width: "45%", marginBottom: 10 }} />
          {[78, 64, 71].map((w, i) => (
            <Bone key={i} style={{ height: 12, width: `${w}%`, marginBottom: 8 }} />
          ))}
        </div>
      </div>

      {/* Content cards */}
      <div style={{
        flex: 1,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        backgroundColor: "var(--gray-100)",
      }}>
        {/* Wide card — mimics stat grid / large chart */}
        <div style={{
          backgroundColor: "white",
          borderRadius: 10,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <Bone style={{ height: 18, width: "32%", marginBottom: 16 }} />
          <Bone style={{ height: 200, width: "100%", borderRadius: 8 }} />
        </div>

        {/* Two half-cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{
              backgroundColor: "white",
              borderRadius: 10,
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <Bone style={{ height: 16, width: "50%", marginBottom: 14 }} />
              <Bone style={{ height: 140, width: "100%", borderRadius: 8 }} />
            </div>
          ))}
        </div>

        {/* Third full-width card */}
        <div style={{
          backgroundColor: "white",
          borderRadius: 10,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <Bone style={{ height: 16, width: "40%", marginBottom: 14 }} />
          <Bone style={{ height: 160, width: "100%", borderRadius: 8 }} />
        </div>
      </div>
    </div>
  </>
);

export default PageSkeleton;
