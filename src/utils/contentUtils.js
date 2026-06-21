import text from "../content/text.json";

export const getText = (path, fallback = path) => {
  const result = path.split(".").reduce((acc, key) => acc?.[key], text);
  if (result === undefined) {
    console.warn(`[getText] Missing text key: ${path}`);
  }
  return result ?? fallback;
};

/**
 * Replace {token} placeholders in a string with values from a variables map.
 */
export const interpolateTokens = (value, vars = {}) => {
  if (typeof value !== "string") return value;
  return value.replace(/{(\w+)}/g, (_, key) => vars[key] ?? `{${key}}`);
};

/**
 * Deep-clone an object, replacing all string values that contain {token}
 * placeholders with their resolved counterparts.
 */
export const interpolateObject = (obj, vars = {}) =>
  JSON.parse(JSON.stringify(obj), (_, v) => interpolateTokens(v, vars));

/**
 * Resolve a text key or raw string with optional variable interpolation.
 * If `input` looks like a dotted key (e.g. "page.section.title"), it is
 * first looked up via getText before interpolation.
 */
export const resolveText = (input, variables = {}) => {
  const raw =
    typeof input === "string" && input.includes(".") ? getText(input) : input;
  return typeof raw === "string"
    ? raw.replace(/{(\w+)}/g, (_, key) => variables[key] ?? `{${key}}`)
    : raw;
};

/**
 * HTML-injecting resolver for StatGrid summary text.
 * Wraps each interpolated value in <span class="dynamic-label">.
 * Used with dangerouslySetInnerHTML.
 */
export const resolveHTMLLabels = (input, vars = {}) => {
  if (typeof input !== "string") return input;
  return input.replace(/{(\w+)}/g, (_, key) => {
    const raw = vars[key];
    const val =
      raw === null || raw === undefined || raw === "null" || raw === "undefined"
        ? ""
        : String(raw);
    const cleaned = val.replace(/\bnull\b|\bundefined\b/gi, "").replace(/\s+/g, " ").trim();
    return `<span class="dynamic-label">${cleaned}</span>`;
  });
};

/**
 * HTML-injecting resolver for DataPageLayout headers.
 * Key-aware injection:
 *  - "virus" → plain cleaned string (no wrapper)
 *  - "trend" → <span class="trend-text trend-{dir} bg-highlight">
 *  - other   → <span class="dynamic-text">
 * Used with dangerouslySetInnerHTML.
 */
export const resolvePageHTML = (input, vars = {}) => {
  if (typeof input !== "string") return input;
  return input.replace(/{(\w+)}/g, (_, key) => {
    const raw = vars[key];
    let val =
      raw === null || raw === undefined || raw === "null" || raw === "undefined"
        ? ""
        : String(raw);
    if (key === "virus")
      return val.replace(/\bnull\b|\bundefined\b/gi, "").replace(/\s+/g, " ").trim();
    if (key === "trend") {
      val = val.replace(/\bnull\b|\bundefined\b/gi, "").replace(/\s+/g, " ").trim();
      return `<span class="trend-text trend-${vars.trendDirection || "neutral"} bg-highlight">${val}</span>`;
    }
    val = val.replace(/\bnull\b|\bundefined\b/gi, "").replace(/\s+/g, " ").trim();
    return `<span class="dynamic-text">${val}</span>`;
  });
};
