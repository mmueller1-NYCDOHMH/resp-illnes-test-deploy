// src/utils/loadCSVData.js
import { csvParse } from "d3-dsv";

/** Parse "YYYY-MM-DD" as LOCAL midnight (avoid UTC shifting a day). */
function parseLocalISO(s) {
  if (!s) return null;
  const str = String(s).trim();

  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return new Date(y, m - 1, d);
  }

  // MM/DD/YYYY
  const mdy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (mdy) {
    const [, m, d, y] = mdy.map(Number);
    return new Date(y, m - 1, d);
  }

  // last resort
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Simple in-memory cache */
const csvCache = new Map();

/** Fetch with timeout + retry for external CSVs (e.g., GitHub raw). */
async function fetchWithRetry(url, { timeout = 10000, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-cache",
      });
      clearTimeout(id);

      if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);
      return await res.text();
    } catch (err) {
      clearTimeout(id);
      if (attempt < retries) {
        console.warn(
          `⚠️ Retry ${attempt + 1}/${retries} for ${url} (${err.message})`
        );
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

/** Load and parse CSV with caching and safe normalization */
export async function loadCSVData(url) {
  if (!url) throw new Error("No CSV URL provided");

  // Serve from cache if already loaded
  if (csvCache.has(url)) return csvCache.get(url);

  try {
    const text = await fetchWithRetry(url);

    const parsed = csvParse(text, (row) => {
      const rawValue = row.value;

      // Preserve original value behavior (CRITICAL)
      const value = rawValue;

      // Optional numeric version for future-safe logic
      const valueNum =
        rawValue == null || rawValue === ""
          ? null
          : Number.isFinite(Number(rawValue))
          ? Number(rawValue)
          : null;

      const dateStr = (row.date ?? row.week ?? "").trim();
      const date = parseLocalISO(dateStr);

      return {
        ...row,
        dateStr,
        date,
        value,        // ⬅️ unchanged behavior
        valueRaw: rawValue,
        valueNum,     // ⬅️ new, safe numeric helper
        submetric: row.submetric?.trim(),
        display: row.display?.trim(),
      };
    });

    csvCache.set(url, parsed);
    return parsed;
  } catch (err) {
    console.error(`❌ CSV load failed for ${url}:`, err);
    return [];
  }
}
