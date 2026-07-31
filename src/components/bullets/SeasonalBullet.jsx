import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { loadCSVData } from "../../utils/loadCSVData";
import { toSourceVirus } from "../../utils/virusMap";
import "./SeasonalBullet.css";

const PEDS_DEATH_RULES = {
  flu: {
    metric: "Influenza-associated pediatric deaths",
    label: "Pediatric flu deaths",
    dataTypes: ["lab"],
  },
  rsv: {
    metric: "RSV-associated pediatric deaths",
    label: "Pediatric RSV deaths",
    dataTypes: ["lab"],
  },
  covid: {
    metric: "COVID-19-associated pediatric deaths",
    label: "Pediatric COVID-19 deaths",
    dataTypes: ["death"],
  },
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeVirusKey(value) {
  const v = normalizeText(value).toLowerCase();

  if (!v) return null;
  if (v === "flu" || v === "influenza") return "flu";
  if (v === "rsv") return "rsv";
  if (v === "covid" || v === "covid-19" || v === "covid19") return "covid";

  return null;
}

function resolveDerivedMeta(pageState) {
  const rawVirus = pageState?.virus;
  const mappedVirus = rawVirus ? toSourceVirus(rawVirus) : null;

  const candidates = [rawVirus, mappedVirus]
    .map(normalizeVirusKey)
    .filter(Boolean);

  for (const key of candidates) {
    if (PEDS_DEATH_RULES[key]) return PEDS_DEATH_RULES[key];
  }

  return null;
}

export default function SeasonalBullet({
  config,
  dataSource,
  pageState,
  as: AsProp = "p",
  className: classNameProp = "seasonal-bullet",
}) {
  const resolved = config || {};

  const {
    id,
    dataPath,
    season,
    diseaseLabel: configuredDiseaseLabel,
    filters = {},
    weeklyField = "value",
    seasonalSubmetric = "Seasonal total",
    dateField = "date",
    showWhen,
    templates,
    as: configAs,
    className: configClassName,
  } = resolved;

  const As = configAs || AsProp;
  const className = configClassName || classNameProp;

  const [fallbackRows, setFallbackRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    const noSliceProvided = !Array.isArray(dataSource) || dataSource.length === 0;

    if (noSliceProvided && dataPath) {
      loadCSVData(dataPath)
        .then((rows) => {
          if (alive) {
            setFallbackRows(rows);
            setErr(null);
          }
        })
        .catch((e) => {
          if (alive) setErr(e?.message || "Failed to load CSV");
        });
    }

    return () => {
      alive = false;
    };
  }, [dataSource, dataPath]);

  const sourceRows =
    Array.isArray(dataSource) && dataSource.length ? dataSource : fallbackRows || [];

  const derivedMeta = useMemo(() => resolveDerivedMeta(pageState), [pageState]);

  const derivedMetric = filters.metric || derivedMeta?.metric || null;
  const diseaseLabel = configuredDiseaseLabel || derivedMeta?.label || "deaths";

  const shouldShow = useMemo(() => {
    if (typeof showWhen === "function") {
      return !!showWhen(pageState || {});
    }

    if (!derivedMeta) return false;

    const currentDataType = normalizeText(pageState?.dataType).toLowerCase();
    if (!currentDataType) return true;

    return derivedMeta.dataTypes.some(
      (dt) => normalizeText(dt).toLowerCase() === currentDataType
    );
  }, [showWhen, pageState, derivedMeta]);

  const info = useMemo(() => {
    if (err) return null;
    if (!shouldShow) return null;
    if (!Array.isArray(sourceRows) || sourceRows.length === 0) return null;

    const toStr = (x) => (x == null ? "" : String(x));
    const isSeasonalLabel = (s) => /^seasonal\s+/i.test(normalizeText(s));

    const metricRows = derivedMetric
      ? sourceRows.filter((r) => normalizeText(r.metric) === normalizeText(derivedMetric))
      : sourceRows;

    if (!metricRows.length) return null;


    
    const seasonalRows = metricRows.filter((r) => isSeasonalLabel(r.submetric));

    const seasonRow = seasonalSubmetric
      ? seasonalRows.find(
          (r) => normalizeText(r.submetric) === normalizeText(seasonalSubmetric)
        )
      : [...seasonalRows].sort(
          (a, b) => new Date(b[dateField]) - new Date(a[dateField])
        )[0];

    const weeklyRows = metricRows.filter((r) => {
      const sub = normalizeText(r.submetric);
      if (!sub) return false;
      if (/^weekly$/i.test(sub)) return true;
      return !isSeasonalLabel(sub) && !/^seasonal total$/i.test(sub);
    });

    const latestWeekly = [...weeklyRows].reverse().find((r) => {
      const v = toStr(r?.[weeklyField]).trim();
      const d = r?.[dateField];
      return v !== "" && d != null && !Number.isNaN(new Date(d).getTime());
    });

    if (!seasonRow) return null;

    const weeklyVal = latestWeekly ? toStr(latestWeekly[weeklyField]).trim() : null;
    const seasonalVal = toStr(seasonRow[weeklyField]).trim();

    const asOfRaw = latestWeekly?.[dateField] ?? seasonRow?.[dateField] ?? null;
    if (!asOfRaw) return null;

    const asOfDateObj = asOfRaw instanceof Date ? asOfRaw : new Date(asOfRaw);
    if (Number.isNaN(asOfDateObj.getTime())) return null;

    if (seasonalVal === "") return null;

    const asOfDateISO = asOfDateObj.toISOString().slice(0, 10);
    const rawSeasonLabel = toStr(seasonRow.submetric);
    const seasonLabel = rawSeasonLabel.replace(/^Seasonal\s+/i, "").replace(/-/g, "–");
    const inSeasonFlag = isInSeason(asOfDateObj, season);
    const asOfDate = formatDisplayDateLong(asOfDateObj);

    const message = templates
      ? buildSeasonalMessage({
          asOfDate,
          weeklyValue: weeklyVal,
          seasonalTotalValue: seasonalVal,
          seasonLabel,
          diseaseLabel,
          inSeasonFlag,
          templates,
        })
      : null;

    return {
      weeklyVal,
      seasonalVal,
      asOfDate,
      asOfDateISO,
      seasonLabel,
      inSeasonFlag,
      message,
    };
  }, [
    err,
    shouldShow,
    sourceRows,
    derivedMetric,
    weeklyField,
    seasonalSubmetric,
    dateField,
    season,
    diseaseLabel,
    templates,
  ]);

  if (!info) return null;

  const allowRichRender = !templates;

  const bucketType = (val) => {
    if (val === "0") return "zero";
    if (typeof val === "string" && val.startsWith("<")) return "lt";
    return "num";
  };

  const wkBucket = info.weeklyVal == null ? null : bucketType(info.weeklyVal);
  const stBucket = bucketType(info.seasonalVal);

  const WkVal = () =>
    wkBucket == null ? null : (
      <span className={`sb-val is-${wkBucket}`}>
        {wkBucket === "zero" ? "no" : info.weeklyVal}
      </span>
    );

  const StVal = () => (
    <span className={`sb-val is-${stBucket}`}>
      {stBucket === "zero" ? "no" : info.seasonalVal}
    </span>
  );

  const DateChip = () => <span className="sb-chip sb-chip--date">{info.asOfDate}</span>;
  const SeasonChip = () => <span className="sb-chip sb-chip--season">{info.seasonLabel}</span>;

  return allowRichRender ? (
    <As className={className} data-bullet-id={id}>
      {info.inSeasonFlag ? (
        <>
          {/* If you want the weekly sentence back when weeklyVal exists, uncomment below:
          {wkBucket != null && (
            <>
              There were <WkVal /> {diseaseLabel} reported this week.
              <span className="sb-divider" />
            </>
          )} */}
          As of <DateChip />, <StVal /> {diseaseLabel} have been reported during the{" "}
          <SeasonChip /> season.
        </>
      ) : (
        <>
          A total of <StVal /> {diseaseLabel} were reported to the NYC Health Department during the{" "}
          <SeasonChip /> season.
        </>
      )}
    </As>
  ) : (
    <As className={className} data-bullet-id={id}>
      {info.message}
    </As>
  );
}

SeasonalBullet.propTypes = {
  config: PropTypes.shape({
    id: PropTypes.string,
    dataPath: PropTypes.string,
    diseaseLabel: PropTypes.string,
    season: PropTypes.shape({
      start: PropTypes.shape({ month: PropTypes.number, day: PropTypes.number }),
      end: PropTypes.shape({ month: PropTypes.number, day: PropTypes.number }),
    }),
    filters: PropTypes.shape({
      metric: PropTypes.string,
      submetric: PropTypes.string,
    }),
    weeklyField: PropTypes.string,
    seasonalSubmetric: PropTypes.string,
    dateField: PropTypes.string,
    showWhen: PropTypes.func,
    templates: PropTypes.object,
    as: PropTypes.oneOf(["p", "span", "li"]),
    className: PropTypes.string,
  }).isRequired,
  dataSource: PropTypes.array,
  pageState: PropTypes.shape({
    virus: PropTypes.string,
    dataType: PropTypes.string,
  }),
  as: PropTypes.oneOf(["p", "span", "li"]),
  className: PropTypes.string,
};

const m = (mm) => Math.max(0, Math.min(11, (mm ?? 1) - 1));

function isInSeason(dateish, seasonCfg) {
  const d = dateish instanceof Date ? dateish : new Date(dateish);
  if (!(seasonCfg && seasonCfg.start && seasonCfg.end) || Number.isNaN(d.getTime())) return false;

  const start = new Date(d.getFullYear(), m(seasonCfg.start.month), seasonCfg.start.day || 1);
  const end = new Date(d.getFullYear(), m(seasonCfg.end.month), seasonCfg.end.day || 1);

  return start <= end ? d >= start && d <= end : d >= start || d <= end;
}

function formatDisplayDateLong(dateish) {
  const d = dateish instanceof Date ? dateish : new Date(dateish);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildSeasonalMessage({
  asOfDate,
  weeklyValue,
  seasonalTotalValue,
  seasonLabel,
  diseaseLabel,
  inSeasonFlag,
  templates = {},
}) {
  const disease = diseaseLabel || "deaths";

  const T = {
    inSeason: {
      weeklyZero: templates.inSeason?.weeklyZero || `There were no ${disease} reported this week.`,
      weeklyLt:
        templates.inSeason?.weeklyLt ||
        ((n) => `There were fewer than ${n} ${disease} reported this week.`),
      weeklyNum:
        templates.inSeason?.weeklyNum ||
        ((n) => `There were ${n} ${disease} reported this week.`),

      seasonToDateZero:
        templates.inSeason?.seasonToDateZero ||
        `As of ${asOfDate}, no ${disease} have been reported to the NYC Health Department during the ${seasonLabel} season.`,
      seasonToDateLt:
        templates.inSeason?.seasonToDateLt ||
        ((n) =>
          `As of ${asOfDate}, fewer than ${n} ${disease} have been reported to the NYC Health Department during the ${seasonLabel} season.`),
      seasonToDateNum:
        templates.inSeason?.seasonToDateNum ||
        ((n) =>
          `As of ${asOfDate}, ${n} ${disease} have been reported to the NYC Health Department during the ${seasonLabel} season.`),
    },
    outOfSeason: {
      totalZero:
        templates.outOfSeason?.totalZero ||
        `No ${disease} were reported to the NYC Health Department during the ${seasonLabel} season.`,
      totalLt:
        templates.outOfSeason?.totalLt ||
        ((n) =>
          `Fewer than ${n} ${disease} were reported to the NYC Health Department during the ${seasonLabel} season.`),
      totalNum:
        templates.outOfSeason?.totalNum ||
        ((n) =>
          `A total of ${n} ${disease} were reported to the NYC Health Department during the ${seasonLabel} season.`),
    },
  };

  const parseBucket = (val, { zero, lt, num }) => {
    if (val === "0") return zero;
    if (typeof val === "string" && val.startsWith("<")) return lt(val.slice(1));
    return num(val);
  };

  if (!inSeasonFlag) {
    return parseBucket(seasonalTotalValue, {
      zero: T.outOfSeason.totalZero,
      lt: T.outOfSeason.totalLt,
      num: T.outOfSeason.totalNum,
    });
  }

  const weeklySentence =
    weeklyValue == null
      ? ""
      : parseBucket(weeklyValue, {
          zero: T.inSeason.weeklyZero,
          lt: T.inSeason.weeklyLt,
          num: T.inSeason.weeklyNum,
        }) + " ";

  const seasonToDateSentence = parseBucket(seasonalTotalValue, {
    zero: T.inSeason.seasonToDateZero,
    lt: T.inSeason.seasonToDateLt,
    num: T.inSeason.seasonToDateNum,
  });

  return `${weeklySentence}${seasonToDateSentence}`.trim();
}