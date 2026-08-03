// src/components/sections/DynamicParagraph.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getText } from "../../utils/contentUtils";
import { loadCSVData } from "../../utils/loadCSVData";
import { getMetricData } from "../../utils/filterMetricData";
import { parseLocalISO } from "../../utils/trendUtils";
import "./DynamicParagraph.css"; 

function fmtWeekDate(dateLike) {
  const d = parseLocalISO(dateLike);   
  if (!d || Number.isNaN(d.getTime())) return String(dateLike ?? "");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  export function isParagraphDataStale(
    rows,
    {
      metricName = "Respiratory panel results",
      staleDays = 30,
      uploadDate = null,
    } = {}
  ) {
    if (!rows || rows.length === 0) return true;
  
    const filtered = rows.filter(
      (r) => r.metric === metricName && r.date
    );
  
    if (!filtered.length) return true;
  
    const latest = filtered
      .map((r) => parseLocalISO(r.date))
      .filter((d) => d && !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a)[0];
  
    if (!latest) return true;
  
    // Use uploadDate if provided and valid, otherwise fallback to current time
    const referenceTime = uploadDate
      ? new Date(uploadDate).getTime()
      : Date.now();
  
    if (!referenceTime || Number.isNaN(referenceTime)) return true;
  
    const diffDays =
      (referenceTime - latest.getTime()) / (1000 * 60 * 60 * 24);
  
    return diffDays > staleDays;
  }

function round1Str(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return null;
  const r = Math.round(num * 10) / 10;
  return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r);
}




const slug = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Default alias map to reconcile config "order" labels with CSV "submetric" values.
// Extend/override by passing `aliasMap` in props if needed.
const DEFAULT_ALIAS_MAP = {
  "Human Coronavirus": "Human Coronaviruses",
  RSV: "Respiratory Syncytial Virus",
  Flu: "Influenza",
};

function resolveSubmetricKey(orderLabel, map, aliasMap) {
  // Priority: explicit map entry; then alias; else the label itself.
  return map?.[orderLabel] ?? aliasMap?.[orderLabel] ?? orderLabel;
}

function formatDisplayValue(rawValue, displayHint) {
  // If explicitly Percent and <= 100, render with %; otherwise treat as number.
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return null;
  if (displayHint === "Percent" && num <= 100) {
    const s = round1Str(num);
    return s == null ? null : `${s}%`;
  }
  // counts or large “percent” fields: show as number with grouping
  return new Intl.NumberFormat().format(num);
}

export default function DynamicParagraph({
  data,
  dataPath = "",
  metricName,                  // defaulted to "Respiratory panel results" if absent
  display,                     // optional hint; will be inferred per-row if missing/messy
  groupField,                  // defaulted to "submetric" for panel results
  textKeyBase = "",
  order = [],                  // display + list order
  aliasMap = DEFAULT_ALIAS_MAP, // optional override/extend
  className = "",
  staleDays = 21,               // hide the section once data is older than this (3 weeks)
}) {
  const [fallbackRows, setFallbackRows] = useState(null);
  const [err, setErr] = useState(null);

  // i18n text + labels from text.json
  const intro = getText(`${textKeyBase}.intro`);
  const listIntroTpl = getText(`${textKeyBase}.listIntro`); // "Percent of positive test results for the week of {date}:"
  const labels = getText(`${textKeyBase}.labels`) || {};
  // Let i18n provide a valueKey map if you’d like (order label -> CSV submetric)
  const valueKeyMap = labels.valueKeyMap || null;

  // self-load if no hydrated data is provided
  useEffect(() => {
    let alive = true;
    const noDataProvided = !data || (Array.isArray(data) && data.length === 0);
    if (noDataProvided && dataPath) {
      loadCSVData(dataPath)
        .then((rows) => {
          if (alive) setFallbackRows(rows);
        })
        .catch((e) => {
          if (alive) setErr(e?.message || "Failed to load CSV");
        });
    }
    return () => {
      alive = false;
    };
  }, [data, dataPath]);

  const sourceRows = data && data.length ? data : fallbackRows || [];

  // Defaults tailored for the ED panel section
  const effectiveMetric = metricName || "Respiratory panel results";
  const effectiveGroupField = groupField || "submetric";

  // Hide the whole section once the underlying data is older than staleDays
  // — presenting week-old-looking panel results as current would be
  // misleading. Compares the latest row for this metric against "now"
  // (no uploadDate is passed in for this section, so isParagraphDataStale
  // falls back to Date.now()).
  const isStale = isParagraphDataStale(sourceRows, {
    metricName: effectiveMetric,
    staleDays,
  });

  // optional metric filtering (generic via your csv helpers)
  const filtered = useMemo(() => {
    if (!sourceRows.length) return [];

    // Prefer helper when a metricName is provided
    if (effectiveMetric) {
      return getMetricData(sourceRows, {
        metric: effectiveMetric,
        submetric: undefined,
        display, // keep hint in case upstream uses it
        groupField: effectiveGroupField,
      });
    }

    // Auto-detect fallback: if no metricName passed, try to find panel rows
    const panelRows = sourceRows.filter((r) => r.metric === "Respiratory panel results");
    return panelRows.length ? panelRows : sourceRows;
  }, [sourceRows, effectiveMetric, display, effectiveGroupField]);

  const latest = useMemo(() => {
    if (!filtered.length) return null;

    // group by ISO day (works for Date objects and strings)
    const byDate = filtered.reduce((acc, r) => {
      const local = parseLocalISO(r.date);             
      const key = local ? local.toISOString().slice(0, 10) : String(r.date);
      (acc[key] ||= []).push(r);
      return acc;
    }, {});

    const dates = Object.keys(byDate)
      .map((d) => ({ d, t: new Date(d).getTime() }))
      .filter((x) => !Number.isNaN(x.t))
      .sort((a, b) => b.t - a.t);

    if (!dates.length) return null;

    const latestDate = dates[0].d;
    const rows = byDate[latestDate];

    // submetric -> { value, display } map
    const map = new Map(
      rows
        .filter((r) => r[effectiveGroupField])
        .map((r) => [
          r[effectiveGroupField],
          { value: r.value ?? r.valueRaw, display: r.display },
        ])
    );

    // Build plain value/label items in desired order; skip missing values
    const items = order
      .map((displayLabel) => {
        // resolve the CSV submetric key we should read from
        const submetricKey = resolveSubmetricKey(displayLabel, valueKeyMap, aliasMap);
        const entry = map.get(submetricKey);
        if (!entry) return null;

        // Pick display hint: prefer row display, then component prop
        const value = formatDisplayValue(entry.value, entry.display || display);
        if (value == null) return null;

        const label = labels[displayLabel] || displayLabel;
        return { key: slug(label), value, label };
      })
      .filter(Boolean);

    return { date: latestDate, items };
  }, [filtered, order, labels, valueKeyMap, aliasMap, effectiveGroupField, display]);

  // Nothing to render if we can't build the list intro yet
  if (err || !latest || !listIntroTpl || isStale) return null;


  // "Percent of positive test results for the week of {date}:" — date
  // substitution stays a bold HTML span (template text comes from the CMS);
  // the value/label grid below is plain JSX, not an HTML string, so no
  // chip markup or Oxford-comma joining is needed anymore.
  const dateHtml = `<span class="dp-as-of-date">${fmtWeekDate(latest.date)}</span>`;
  const listIntroHtml = listIntroTpl.replace("{date}", dateHtml);


  return (
    <div className={`data-summary-markdown mt-4 ${className}`}>
      {intro && <p>{intro}</p>}
      <p className="dp-as-of" dangerouslySetInnerHTML={{ __html: listIntroHtml }} />
      <ul className="dp-value-list">
        {latest.items.map((item) => (
          <li key={item.key} className="dp-value-item">
            <span className="dp-value">{item.value}</span>
            <span className="dp-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

DynamicParagraph.propTypes = {
  data: PropTypes.array,
  dataPath: PropTypes.string,
  metricName: PropTypes.string,       // default: "Respiratory panel results"
  display: PropTypes.string,          // optional hint; per-row display is preferred if present
  groupField: PropTypes.string,       // default: "submetric"
  textKeyBase: PropTypes.string,
  order: PropTypes.arrayOf(PropTypes.string),
  aliasMap: PropTypes.object,         // order-label -> CSV submetric key
  className: PropTypes.string,
  staleDays: PropTypes.number,        // default: 21 (3 weeks)
};
