import { normalizeDateKey } from "./localDate.js";

export const HEALTH_KINDS = {
  WEIGHT: "weight",
  STEPS: "steps",
  SLEEP: "sleep",
  WORKOUT: "workout",
};

export const HEALTH_NOTE = "[health]";
export const HEALTH_SOURCE = "health-import";

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function parseFlexibleDate(raw) {
  if (raw == null || raw === "") return "";
  let s = String(raw).trim().replace(/^["']|["']$/g, "");
  if (!s) return "";

  const isoDay = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) return `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}`;

  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (us) {
    return `${us[3]}-${pad2(Number(us[1]))}-${pad2(Number(us[2]))}`;
  }

  const named = s.match(/^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{4})/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (month) return `${named[3]}-${pad2(month)}-${pad2(Number(named[1]))}`;
  }

  const namedFirst = s.match(/^([A-Za-z]{3,})[- ](\d{1,2})[,]?[- ](\d{4})/);
  if (namedFirst) {
    const month = MONTHS[namedFirst[1].slice(0, 3).toLowerCase()];
    if (month) return `${namedFirst[3]}-${pad2(month)}-${pad2(Number(namedFirst[2]))}`;
  }

  return normalizeDateKey(s);
}

export function toNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function toLbs(value, unit = "") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = String(unit || "").toLowerCase();
  if (u.includes("kg") || u === "kilogram" || u === "kilograms") {
    return Number((n * 2.2046226218).toFixed(1));
  }
  return Number(n.toFixed(1));
}

export function toHours(value, unit = "") {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const u = String(unit || "").toLowerCase();
  if (u.includes("min")) return Number((n / 60).toFixed(2));
  if (u.includes("sec")) return Number((n / 3600).toFixed(2));
  return Number(n.toFixed(2));
}

function looksLikeXml(text) {
  const head = String(text || "").slice(0, 400).toLowerCase();
  return head.includes("<healthdata") || head.includes("<record") || head.includes("<?xml");
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.map(c => c.replace(/^["']|["']$/g, "").trim());
}

function classifyHeader(name) {
  const h = String(name || "").toLowerCase().replace(/[_]/g, " ");
  if (!h) return null;
  if (/^date$|^day$|start|finish|end date/.test(h) && !/update/.test(h)) {
    if (/end|finish/.test(h)) return "end";
    return "date";
  }
  if (/kind|type|metric/.test(h) && !/workout activity/.test(h)) return "kind";
  if (/^value$|^amount$/.test(h)) return "value";
  if (/^unit$/.test(h)) return "unit";
  if (/body mass|weight/.test(h)) return HEALTH_KINDS.WEIGHT;
  if (/step/.test(h)) return HEALTH_KINDS.STEPS;
  if (/sleep/.test(h)) return HEALTH_KINDS.SLEEP;
  if (/workout|duration/.test(h) && !/update/.test(h)) return HEALTH_KINDS.WORKOUT;
  return null;
}

function normalizeKind(raw) {
  const k = String(raw || "").toLowerCase().trim();
  if (!k) return null;
  if (/weight|body.?mass|bodymass/.test(k)) return HEALTH_KINDS.WEIGHT;
  if (/step/.test(k)) return HEALTH_KINDS.STEPS;
  if (/sleep/.test(k)) return HEALTH_KINDS.SLEEP;
  if (/workout|exercise|train/.test(k)) return HEALTH_KINDS.WORKOUT;
  if (Object.values(HEALTH_KINDS).includes(k)) return k;
  return null;
}

function record(date, kind, value, unit, source = HEALTH_SOURCE) {
  if (!date || !kind || value == null) return null;
  let nextValue = Number(value);
  let nextUnit = unit || "";
  if (!Number.isFinite(nextValue)) return null;

  if (kind === HEALTH_KINDS.WEIGHT) {
    nextValue = toLbs(nextValue, nextUnit);
    nextUnit = "lb";
    if (nextValue == null) return null;
  } else if (kind === HEALTH_KINDS.SLEEP) {
    nextValue = toHours(nextValue, nextUnit);
    nextUnit = "hr";
    if (nextValue == null || nextValue <= 0) return null;
  } else if (kind === HEALTH_KINDS.STEPS) {
    nextValue = Math.round(nextValue);
    nextUnit = "steps";
    if (nextValue <= 0) return null;
  } else if (kind === HEALTH_KINDS.WORKOUT) {
    nextValue = toHours(nextValue, nextUnit) ?? nextValue;
    if (String(unit || "").toLowerCase().includes("min") || nextValue > 12) {
      // already converted if unit was minutes; if unit missing and value > 12 treat as minutes
      if (!unit) nextValue = Number((Number(value) / 60).toFixed(2));
    }
    nextUnit = "hr";
    if (!Number.isFinite(nextValue) || nextValue <= 0) return null;
    nextValue = Number(nextValue.toFixed(2));
  }

  return { date, kind, value: nextValue, unit: nextUnit, source };
}

function mergeSameDay(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row) continue;
    const key = `${row.date}:${row.kind}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      continue;
    }
    if (row.kind === HEALTH_KINDS.STEPS || row.kind === HEALTH_KINDS.SLEEP || row.kind === HEALTH_KINDS.WORKOUT) {
      prev.value = Number((prev.value + row.value).toFixed(row.kind === HEALTH_KINDS.STEPS ? 0 : 2));
    } else {
      map.set(key, { ...row });
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

export function parseHealthCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(classifyHeader);
  const rawHeaders = splitCsvLine(lines[0]);
  if (!headers.some(Boolean)) return [];

  const dateIdx = headers.findIndex(h => h === "date");
  const kindIdx = headers.findIndex(h => h === "kind");
  const valueIdx = headers.findIndex(h => h === "value");
  const unitIdx = headers.findIndex(h => h === "unit");
  const wideKinds = headers
    .map((h, i) => ({ h, i }))
    .filter(x => x.h && Object.values(HEALTH_KINDS).includes(x.h));

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const date = parseFlexibleDate(dateIdx >= 0 ? cols[dateIdx] : cols[0]);
    if (!date) continue;

    if (kindIdx >= 0 && valueIdx >= 0) {
      const kind = normalizeKind(cols[kindIdx]);
      const unit = unitIdx >= 0 ? cols[unitIdx] : "";
      const rec = record(date, kind, toNumber(cols[valueIdx]), unit);
      if (rec) rows.push(rec);
      continue;
    }

    if (wideKinds.length) {
      for (const { h, i } of wideKinds) {
        const headerUnit = rawHeaders[i];
        const rec = record(date, h, toNumber(cols[i]), headerUnit);
        if (rec) rows.push(rec);
      }
    }
  }

  return mergeSameDay(rows);
}

function parseAttributes(tag) {
  const attrs = {};
  const re = /([A-Za-z0-9_]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function xmlKind(type) {
  const t = String(type || "");
  if (/BodyMass|BodyMassIndex/.test(t) && !/Index/.test(t)) return HEALTH_KINDS.WEIGHT;
  if (/BodyMass/.test(t) && !/Index/.test(t)) return HEALTH_KINDS.WEIGHT;
  if (/StepCount/.test(t)) return HEALTH_KINDS.STEPS;
  if (/SleepAnalysis/.test(t)) return HEALTH_KINDS.SLEEP;
  return null;
}

function sleepHours(attrs) {
  const value = String(attrs.value || "");
  if (value && /Awake|InBed|InBed/.test(value) && !/Asleep/.test(value)) return null;
  if (value && !/Asleep|HKCategoryValueSleepAnalysisAsleep/.test(value) && /InBed|Awake/.test(value)) {
    return null;
  }
  const start = Date.parse(attrs.startDate || "");
  const end = Date.parse(attrs.endDate || "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Number(((end - start) / 3600000).toFixed(2));
}

export function parseHealthXml(text) {
  const src = String(text || "");
  const rows = [];

  const recordRe = /<Record\b([^>]*)\/?>/g;
  let m;
  while ((m = recordRe.exec(src))) {
    const attrs = parseAttributes(m[1]);
    const kind = xmlKind(attrs.type);
    const date = parseFlexibleDate(attrs.startDate || attrs.creationDate);
    if (!kind || !date) continue;
    if (kind === HEALTH_KINDS.SLEEP) {
      const hours = sleepHours(attrs);
      const rec = record(date, kind, hours, "hr", "apple-health-xml");
      if (rec) rows.push(rec);
      continue;
    }
    const rec = record(date, kind, toNumber(attrs.value), attrs.unit, "apple-health-xml");
    if (rec) rows.push(rec);
  }

  const workoutRe = /<Workout\b([^>]*)\/?>/g;
  while ((m = workoutRe.exec(src))) {
    const attrs = parseAttributes(m[1]);
    const date = parseFlexibleDate(attrs.startDate || attrs.creationDate);
    const rec = record(date, HEALTH_KINDS.WORKOUT, toNumber(attrs.duration), attrs.durationUnit, "apple-health-xml");
    if (rec) rows.push(rec);
  }

  return mergeSameDay(rows);
}

export function parseHealthText(text, { filename = "" } = {}) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const name = String(filename || "").toLowerCase();
  if (name.endsWith(".xml") || looksLikeXml(raw)) return parseHealthXml(raw);
  return parseHealthCsv(raw);
}

export function summarizeRecords(records) {
  const byKind = {
    [HEALTH_KINDS.WEIGHT]: 0,
    [HEALTH_KINDS.STEPS]: 0,
    [HEALTH_KINDS.SLEEP]: 0,
    [HEALTH_KINDS.WORKOUT]: 0,
  };
  let dateMin = "";
  let dateMax = "";
  for (const r of records || []) {
    if (byKind[r.kind] != null) byKind[r.kind] += 1;
    if (!dateMin || r.date < dateMin) dateMin = r.date;
    if (!dateMax || r.date > dateMax) dateMax = r.date;
  }
  return {
    total: (records || []).length,
    byKind,
    dateMin,
    dateMax,
  };
}

export function sampleCsvTemplate() {
  return [
    "date,kind,value,unit",
    "2026-09-01,weight,185.2,lb",
    "2026-09-01,steps,8432,count",
    "2026-09-01,sleep,7.4,hr",
  ].join("\n");
}

export function isHealthActivity(activity) {
  if (!activity) return false;
  const notes = String(activity.notes || "");
  if (notes.includes(HEALTH_NOTE)) return true;
  return ["steps", "sleep", "health_workout"].includes(activity.category);
}

export function daysSinceLastWeighIn(logs, today) {
  const keys = (logs || [])
    .map(l => normalizeDateKey(l.date))
    .filter(Boolean)
    .sort();
  if (!keys.length) return null;
  const last = keys[keys.length - 1];
  const todayKey = normalizeDateKey(today);
  if (!todayKey) return null;
  const a = new Date(`${last}T12:00:00`);
  const b = new Date(`${todayKey}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function latestWeightLog(logs) {
  const sorted = (logs || [])
    .map(l => ({ ...l, _key: normalizeDateKey(l.date), lbs: Number(l.weight_lbs) }))
    .filter(l => l._key && Number.isFinite(l.lbs) && l.lbs > 0)
    .sort((a, b) => a._key.localeCompare(b._key));
  return sorted[sorted.length - 1] || null;
}

function activityCategory(kind) {
  if (kind === HEALTH_KINDS.STEPS) return "steps";
  if (kind === HEALTH_KINDS.SLEEP) return "sleep";
  return "health_workout";
}

function activityPillar(kind) {
  return kind === HEALTH_KINDS.SLEEP ? "mindfulness" : "lifts";
}

function activityTitle(kind, value) {
  if (kind === HEALTH_KINDS.STEPS) return `${Math.round(value).toLocaleString()} steps`;
  if (kind === HEALTH_KINDS.SLEEP) return `${value}h sleep`;
  return `${value}h workout`;
}

export function planHealthWrites({ records = [], existingWeights = [], existingActivities = [] } = {}) {
  const weightsByDate = new Map();
  for (const log of existingWeights) {
    const key = normalizeDateKey(log.date);
    if (key) weightsByDate.set(key, log);
  }

  const activityKeys = new Set(
    (existingActivities || [])
      .filter(isHealthActivity)
      .map(a => `${normalizeDateKey(a.date)}:${a.category}`)
  );

  const weightCreates = [];
  const weightUpdates = [];
  const activityCreates = [];
  let skipped = 0;

  for (const rec of records) {
    if (rec.kind === HEALTH_KINDS.WEIGHT) {
      const existing = weightsByDate.get(rec.date);
      if (existing) {
        if (Number(existing.weight_lbs) === rec.value) {
          skipped += 1;
        } else {
          weightUpdates.push({
            id: existing.id,
            date: rec.date,
            weight_lbs: rec.value,
            notes: existing.notes || "Imported from Health",
          });
        }
      } else {
        weightCreates.push({
          date: rec.date,
          weight_lbs: rec.value,
          notes: "Imported from Health",
        });
        weightsByDate.set(rec.date, { date: rec.date, weight_lbs: rec.value });
      }
      continue;
    }

    const category = activityCategory(rec.kind);
    const key = `${rec.date}:${category}`;
    if (activityKeys.has(key)) {
      skipped += 1;
      continue;
    }
    activityCreates.push({
      pillar: activityPillar(rec.kind),
      category,
      title: activityTitle(rec.kind, rec.value),
      value: rec.value,
      unit: rec.unit,
      points: 1,
      date: rec.date,
      notes: `${HEALTH_NOTE} Imported`,
    });
    activityKeys.add(key);
  }

  return { weightCreates, weightUpdates, activityCreates, skipped };
}
