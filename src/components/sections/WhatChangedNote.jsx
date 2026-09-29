/**
 * WhatChangedNote
 *
 * Dismissible "Since your last visit (Sep 14), 3 metrics moved" note at the
 * top of the home page (added 2026-09-29). Turned on per page via
 * `layout.showWhatChanged` in the page config (see OverviewPage.config.js).
 *
 * How it works — entirely in the visitor's browser (browserMemory.js), no
 * tracking of any kind:
 *
 *   stored = { current, previous, dismissedFor }
 *     current/previous = { dataDate, lastSeenAt, metrics: {label: {value, date, …}} }
 *
 *   - First visit: store today's snapshot as `current`, show nothing.
 *   - New data since last visit (latest data date moved on): the old
 *     `current` becomes `previous`, and the note lists every metric that
 *     moved between them (diffMetricSnapshots — same "moved" rules as the
 *     sidebar Quick Links).
 *   - Same data as last visit: keep showing that same comparison until the
 *     person dismisses it (so a refresh doesn't make it vanish), then stay
 *     quiet until the next data update.
 *
 * "Last visit" is the last time they loaded the page while the previous
 * data was current (`lastSeenAt`), so the date shown is a real visit date.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getLatestMetricSnapshot, diffMetricSnapshots } from "../../utils/rankFeaturedLinks";
import { getLastVisit, setLastVisit } from "../../utils/browserMemory";
import { TrendArrowBadge } from "../TrendChip";

const MAX_LISTED = 4;

function formatVisitDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function WhatChangedNote() {
  const [state, setState] = useState(null); // { moved, since, dataDate }

  useEffect(() => {
    let cancelled = false;
    getLatestMetricSnapshot()
      .then((snap) => {
        if (cancelled || !snap?.dataDate) return;
        const now = new Date().toISOString();
        const stored = getLastVisit();

        // First visit (or unreadable storage): just remember this one.
        if (!stored?.current?.dataDate) {
          setLastVisit({ current: { ...snap, lastSeenAt: now }, previous: null, dismissedFor: null });
          return;
        }

        let next;
        if (snap.dataDate > stored.current.dataDate) {
          next = {
            current: { ...snap, lastSeenAt: now },
            previous: stored.current,
            dismissedFor: null,
          };
        } else {
          next = { ...stored, current: { ...stored.current, lastSeenAt: now } };
        }
        setLastVisit(next);

        if (!next.previous || next.dismissedFor === next.current.dataDate) return;
        const moved = diffMetricSnapshots(next.previous, next.current);
        if (!moved.length) return;
        setState({
          moved,
          since: formatVisitDate(next.previous.lastSeenAt),
          dataDate: next.current.dataDate,
        });
      })
      .catch(() => {
        /* network/data failure — the note is optional, say nothing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const dismiss = () => {
    const stored = getLastVisit();
    if (stored) setLastVisit({ ...stored, dismissedFor: state.dataDate });
    setState(null);
  };

  const { moved, since } = state;
  const shown = moved.slice(0, MAX_LISTED);
  const extra = moved.length - shown.length;

  return (
    <aside
      className="what-changed-note relative mb-8 rounded-lg border border-blue-200 bg-blue-50/70 px-md py-sm pr-10 font-body text-[var(--gray-800)]"
      aria-label="What changed since your last visit"
    >
      <p className="text-sm leading-snug m-0">
        <strong className="font-semibold">
          {moved.length === 1 ? "1 metric moved" : `${moved.length} metrics moved`}
        </strong>{" "}
        since your last visit{since ? ` (${since})` : ""}.
      </p>

      <ul className="flex flex-wrap gap-x-md gap-y-xs mt-xs mb-0 p-0 list-none">
        {shown.map((m) => (
          <li key={m.label} className="m-0">
            <Link
              href={m.href}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--gray-800)] no-underline hover:underline"
            >
              <TrendArrowBadge dir={m.direction} size="sm" />
              <span>
                {m.label}{" "}
                <span className="tabular-nums font-semibold">
                  {m.direction === "up" ? "up" : "down"} {m.pctDisplay}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {extra > 0 && (
          <li className="m-0 text-xs text-[var(--gray-600)] self-center">+{extra} more</li>
        )}
      </ul>

      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer text-[var(--gray-600)] hover:bg-blue-100 hover:text-[var(--gray-900)]"
        aria-label="Dismiss what changed since your last visit"
        title="Dismiss until the next data update"
      >
        ×
      </button>
    </aside>
  );
}
