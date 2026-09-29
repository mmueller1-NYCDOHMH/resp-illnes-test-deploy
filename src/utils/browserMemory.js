// src/utils/browserMemory.js
//
// Tiny, failure-proof wrappers around localStorage for the site's
// "remember me" convenience (added 2026-09-29): "My neighborhood" — the
// last neighborhood someone explicitly searched for on either neighborhood
// map, pre-selected on every map next visit.
//
// Everything here is a per-browser nicety only: nothing is sent anywhere,
// and every read/write is wrapped in try/catch because localStorage can
// throw (Safari private mode, blocked site data, SSR where `window` is
// undefined). A failed read simply behaves like a first visit.

const MY_AREA_KEY = "rvp:myArea";
const MY_AREA_EVENT = "rvp:myarea-change";

function readJSON(key) {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    if (typeof window === "undefined") return;
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

// ── My neighborhood ─────────────────────────────────────────────────────────

/** @returns {{ geocode: number, name: string, savedAt: string } | null} */
export function getMyArea() {
  const v = readJSON(MY_AREA_KEY);
  return v && Number.isFinite(v.geocode) ? v : null;
}

export function setMyArea(geocode, name) {
  writeJSON(MY_AREA_KEY, { geocode, name, savedAt: new Date().toISOString() });
  notifyMyArea();
}

export function clearMyArea() {
  writeJSON(MY_AREA_KEY, null);
  notifyMyArea();
}

// Lets every mounted map's "Your area" chip stay in sync when another map
// on the page (or another tab, via the native `storage` event) changes it.
function notifyMyArea() {
  try {
    window.dispatchEvent(new Event(MY_AREA_EVENT));
  } catch {
    /* noop */
  }
}

export function subscribeMyArea(callback) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e) => {
    if (e.key === MY_AREA_KEY) callback();
  };
  window.addEventListener(MY_AREA_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(MY_AREA_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
