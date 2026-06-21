'use client';

/**
 * JumpToPreview
 *
 * Renders a scaled-down iframe preview of a target page section that appears
 * when the user hovers a "Jump to" sidebar link. Key design decisions:
 *
 *  • Portal to document.body — escapes any overflow:hidden ancestor.
 *  • position:fixed — tracks the hovered button via viewport coordinates.
 *  • Lazy-mount + cache — each href's iframe is created on first hover and
 *    kept mounted (hidden) so subsequent hovers are instant (no re-fetch).
 *  • scale() transform — shrinks an 842×553 px iframe into a 320×210 px pane.
 *    At 38% scale the chart shapes and trend indicators are clearly legible;
 *    body text is intentionally decorative at this size.
 *  • pointer-events:none — the preview is read-only; all clicks fall through
 *    to the underlying page content.
 *  • Desktop only — the caller controls whether to mount this component at all
 *    (via the `canHover` check in PageSidebar), but this component also hides
 *    itself when activeHref/anchorEl are absent.
 */

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

// ── Dimensions ────────────────────────────────────────────────────────────────
const PREVIEW_W  = 320;   // visible width of the preview pane (px)
const PREVIEW_H  = 210;   // visible height of the iframe area (px)
const LABEL_H    = 28;    // approximate height of the label bar (px)
const TOTAL_H    = PREVIEW_H + LABEL_H;
const SCALE      = 0.38;  // iframe → preview zoom factor
const IFRAME_W   = Math.round(PREVIEW_W / SCALE);  // 842 — desktop-width viewport
const IFRAME_H   = Math.round(PREVIEW_H / SCALE);  // 553
const GAP        = 10;    // gap between sidebar button right edge and preview

export default function JumpToPreview({ activeHref, activeLabel, anchorEl }) {
  const [mounted, setMounted]   = useState(false);
  const [pos, setPos]           = useState({ top: 8, left: 0 });
  const loadedSet               = useRef(new Set());    // hrefs whose iframes have been created
  const iframeReady             = useRef({});           // href → boolean (onLoad fired)
  const [, bumpTick]            = useState(0);          // force re-render when iframe loads

  // Client-only mount guard (createPortal requires document to exist)
  useEffect(() => { setMounted(true); }, []);

  // Recalculate fixed position whenever the active element or href changes
  useEffect(() => {
    if (!anchorEl || !activeHref) return;

    const update = () => {
      const r    = anchorEl.getBoundingClientRect();
      let left   = r.right + GAP;
      let top    = r.top - 4;

      // Flip left if preview would overflow the right edge of the viewport
      if (left + PREVIEW_W > window.innerWidth - 8) {
        left = r.left - PREVIEW_W - GAP;
      }
      // Clamp so the preview never overflows the bottom or top
      if (top + TOTAL_H > window.innerHeight - 8) {
        top = window.innerHeight - TOTAL_H - 8;
      }
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

  // Register the active href so its iframe gets mounted (lazy creation)
  if (activeHref) loadedSet.current.add(activeHref);

  if (!mounted) return null;

  const visible = !!activeHref && !!anchorEl;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position:      'fixed',
        top:           pos.top,
        left:          pos.left,
        width:         PREVIEW_W,
        borderRadius:  'var(--radius-lg)',
        overflow:      'hidden',
        border:        '1px solid var(--gray-300)',
        boxShadow:     '0 8px 28px rgba(0,0,0,.15)',
        background:    'var(--gray-100)',
        opacity:       visible ? 1 : 0,
        pointerEvents: 'none',
        zIndex:        9999,
        transition:    'opacity 130ms ease',
      }}
    >
      {/* ── Label bar ── */}
      <div style={{
        padding:       '5px 10px',
        fontSize:      '11px',
        fontWeight:    600,
        color:         'var(--gray-700)',
        background:    'var(--gray-200)',
        borderBottom:  '1px solid var(--gray-300)',
        display:       'flex',
        alignItems:    'center',
        gap:           '5px',
        whiteSpace:    'nowrap',
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        userSelect:    'none',
        height:        LABEL_H,
        boxSizing:     'border-box',
      }}>
        {/* Tiny "window" icon */}
        <svg
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0, opacity: 0.55 }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
        {activeLabel ?? 'Preview'}
      </div>

      {/* ── iframe stack — one per loaded href, only active one is visible ── */}
      <div style={{ position: 'relative', height: PREVIEW_H, overflow: 'hidden' }}>
        {[...loadedSet.current].map(href => {
          const ready = iframeReady.current[href];
          return (
            <div
              key={href}
              style={{
                position:   'absolute',
                inset:      0,
                opacity:    href === activeHref ? 1 : 0,
                transition: 'opacity 80ms ease',
              }}
            >
              {/* Skeleton shown until the iframe fires onLoad */}
              {!ready && (
                <div style={{
                  position:       'absolute',
                  inset:          0,
                  background:     'var(--gray-100)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  zIndex:         1,
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                    Loading…
                  </span>
                </div>
              )}

              <iframe
                src={href}
                onLoad={() => {
                  iframeReady.current[href] = true;
                  bumpTick(n => n + 1);
                }}
                style={{
                  position:        'absolute',
                  top:             0,
                  left:            0,
                  width:           IFRAME_W,
                  height:          IFRAME_H,
                  transform:       `scale(${SCALE})`,
                  transformOrigin: 'top left',
                  border:          'none',
                }}
                tabIndex={-1}
                title="Section preview"
              />
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
