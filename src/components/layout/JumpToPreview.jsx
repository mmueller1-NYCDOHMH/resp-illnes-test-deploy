'use client';

/**
 * JumpToPreview
 *
 * Renders a chart-preview card when the user hovers a "Jump to" sidebar link.
 * Replaces the previous iframe approach with:
 *  – A real SVG sparkline drawn from the section's actual CSV data
 *  – Virus theme color + icon from themeUtils
 *  – Short description from featuredLinks metadata
 *  – Instant display (data is fetched once and cached; no page load required)
 */

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { getThemeByTitle } from '../../utils/themeUtils';

// ── Dimensions ────────────────────────────────────────────────────────────────
const PREVIEW_W = 280;
const HEADER_H  = 44;
const CHART_H   = 118;
const DESC_H    = 38;
const TOTAL_H   = HEADER_H + CHART_H + DESC_H;
const GAP       = 10;

// ── Minimal CSV parser ────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/["\r﻿]/g, '').trim());
  return lines.slice(1).map(line => {
    // Handle quoted values
    const vals = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.replace(/\r/g, '').trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function MiniSparkline({ series, color }) {
  if (!series || series.length < 2) return null;

  const values = series.map(d => parseFloat(d.value)).filter(v => isFinite(v));
  if (values.length < 2) return null;

  const pad = 10;
  const w   = PREVIEW_W - pad * 2;
  const h   = CHART_H   - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;

  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * w,
    pad + h - ((v - min) / rng) * h,
  ]);

  const line = pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`
  ).join(' ');

  const area = `${line} L${pts.at(-1)[0].toFixed(1)},${h + pad} L${pad},${h + pad} Z`;

  const gradId = `jtp-grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      width={PREVIEW_W}
      height={CHART_H}
      viewBox={`0 0 ${PREVIEW_W} ${CHART_H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={area} fill={`url(#${gradId})`} />
      {/* Line */}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest-value dot */}
      <circle
        cx={pts.at(-1)[0]}
        cy={pts.at(-1)[1]}
        r="3.5"
        fill={color}
      />
    </svg>
  );
}

// ── Map placeholder (for links with no sparkline data) ────────────────────────
function MapPlaceholder({ color }) {
  return (
    <div style={{
      height: CHART_H,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.5"
      >
        <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
        <path d="M8 2v16M16 6v16"/>
      </svg>
      <span style={{ fontSize: 10, color: 'var(--gray-500)', letterSpacing: '0.03em' }}>
        Neighborhood map
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JumpToPreview({ activeHref, activeLabel, activeLinkMeta, anchorEl }) {
  const [mounted, setMounted] = useState(false);
  const [pos,     setPos]     = useState({ top: 8, left: 0 });
  // Cache: cacheKey → filtered data array
  const chartCache = useRef({});
  const [, bump]  = useState(0); // trigger re-render when cache updates

  useEffect(() => { setMounted(true); }, []);

  // ── Position tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!anchorEl || !activeHref) return;
    const update = () => {
      const r    = anchorEl.getBoundingClientRect();
      let left   = r.right + GAP;
      let top    = r.top - 4;
      if (left + PREVIEW_W > window.innerWidth - 8) left = r.left - PREVIEW_W - GAP;
      if (top + TOTAL_H   > window.innerHeight - 8) top  = window.innerHeight - TOTAL_H - 8;
      top = Math.max(8, top);
      setPos({ top, left });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [anchorEl, activeHref]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeLinkMeta?.dataFile || !activeLinkMeta?.metric) return;
    const key = `${activeLinkMeta.dataFile}::${activeLinkMeta.metric}::${activeLinkMeta.submetric ?? ''}`;
    if (chartCache.current[key]) return; // already loaded

    fetch(activeLinkMeta.dataFile)
      .then(r => r.text())
      .then(text => {
        const rows = parseCSV(text);
        const filtered = rows
          .filter(r =>
            r.metric === activeLinkMeta.metric &&
            (!activeLinkMeta.submetric || r.submetric === activeLinkMeta.submetric)
          )
          .slice(-52); // last 52 weeks
        chartCache.current[key] = filtered;
        bump(n => n + 1);
      })
      .catch(() => {});
  }, [activeHref, activeLinkMeta]);

  if (!mounted) return null;

  const visible = !!activeHref && !!anchorEl;
  const theme   = getThemeByTitle(activeLinkMeta?.virus ?? '');
  const color   = theme.chartColor ?? theme.color ?? '#1E40AF';

  const cacheKey = activeLinkMeta?.dataFile && activeLinkMeta?.metric
    ? `${activeLinkMeta.dataFile}::${activeLinkMeta.metric}::${activeLinkMeta.submetric ?? ''}`
    : null;
  const series    = cacheKey ? chartCache.current[cacheKey] : null;
  const hasData   = series && series.length > 1;

  // Latest value label (e.g. "0.82%") shown in the header
  const latestRaw   = hasData ? parseFloat(series.at(-1).value) : null;
  const latestLabel = Number.isFinite(latestRaw) ? `${latestRaw.toFixed(2)}%` : null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position:      'fixed',
        top:           pos.top,
        left:          pos.left,
        width:         PREVIEW_W,
        borderRadius:  'var(--radius-lg, 10px)',
        overflow:      'hidden',
        border:        '1px solid var(--gray-200)',
        boxShadow:     '0 8px 28px rgba(0,0,0,.15)',
        background:    'white',
        opacity:       visible ? 1 : 0,
        pointerEvents: 'none',
        zIndex:        9999,
        transition:    'opacity 130ms ease',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        height:         HEADER_H,
        padding:        '0 12px',
        background:     `color-mix(in srgb, ${color} 8%, white)`,
        borderBottom:   '1px solid var(--gray-200)',
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        boxSizing:      'border-box',
      }}>
        {theme.icon && (
          <img src={theme.icon} alt="" aria-hidden="true"
            style={{ width: 18, height: 18, flexShrink: 0 }} />
        )}
        <span style={{
          fontSize:   13,
          fontWeight: 700,
          color:      'var(--gray-900)',
          flex:       1,
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {activeLabel ?? 'Preview'}
        </span>
        {latestLabel && (
          <span style={{
            fontSize:   13,
            fontWeight: 700,
            color,
            flexShrink: 0,
          }}>
            {latestLabel}
          </span>
        )}
      </div>

      {/* ── Chart / placeholder ── */}
      <div style={{ background: 'white' }}>
        {hasData ? (
          <MiniSparkline series={series} color={color} />
        ) : activeLinkMeta?.dataFile ? (
          /* Loading state */
          <div style={{
            height:         CHART_H,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Loading…</span>
          </div>
        ) : (
          <MapPlaceholder color={color} />
        )}
      </div>

      {/* ── Description ── */}
      {activeLinkMeta?.description && (
        <div style={{
          height:      DESC_H,
          padding:     '0 12px',
          display:     'flex',
          alignItems:  'center',
          fontSize:    11,
          color:       'var(--gray-600)',
          lineHeight:  1.4,
          borderTop:   '1px solid var(--gray-100)',
          background:  'var(--gray-50, #f9fafb)',
          boxSizing:   'border-box',
        }}>
          {activeLinkMeta.description}
        </div>
      )}
    </div>,
    document.body
  );
}
