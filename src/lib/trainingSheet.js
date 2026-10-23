/**
 * Full-history lift and run rows for the Goggins feed and the
 * "Forgeday Training" sheet. Pure: logs in, rows out. No Base44 or Google I/O.
 *
 * Self-contained (no date-fns) so Deno function copies can import it.
 * SOURCE OF TRUTH. Keep identical to:
 *   base44/functions/gogginsTrainingFeed/trainingSheet.js
 *   base44/functions/syncTrainingSheet/trainingSheet.js
 */

export const TRAINING_SHEET_PAGE_SIZE = 200;
export const TRAINING_SHEET_MAX_PAGES = 500;

export const LIFT_HEADERS = ["date", "exercise", "set number", "reps", "weight", "notes"];
export const RUN_HEADERS = ["date", "distance", "time", "notes"];

const CARDIO_IDS = new Set(["run", "bike", "swim", "other"]);
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Limits that apply to every backfill. The earliest calendar day is not
 * fixed in this repo — it is whatever the signed-in user's logs derive.
 */
export const TRAINING_HISTORY_LIMITS = [
  "This repo does not contain personal WorkoutLog rows, so there is no fixed earliest record date. The sync reports earliest_date from the signed-in user's logs at runtime.",
  "Row date uses an explicit date when a current-week save stamped one. Older rows have no date field. If created_date falls in the same Monday week as week_start, that calendar day is used. If the row was saved later (a past week logged after the fact), the date is week_start, the Monday of the program week, not the day it was typed.",
  "Program day is a template slot (1–5), not a weekday, so it is never used as the row date.",
  "Strength notes are usually blank: the lift logger does not write notes. A note is included only when one was already stored on the log.",
  "Older run notes are the type token (run, bike, swim, or other), not a freeform sentence. The Runs sheet leaves notes blank in that case. New runs can store a one-line note alongside the type.",
  "Run distance and time exist only when they were typed. They are stored on the log as weight (miles) and reps (minutes). A blank cell means that value was never logged.",
  "Per-set weight is whatever was typed for that set. Empty 0/0 sets are omitted. Bodyweight sets with reps keep weight 0.",
  "Bike, swim, and other cardio stay in the JSON feed's workouts so they are not dropped, and they are not written to the Lifts or Runs tabs.",
  "Planned exercises, sets, and reps live on WorkoutProgram templates, not on logs, and are not written to the sheet.",
  "Activity rows awarded for a session do not store distance, time, or per-set weight. The sheet reads WorkoutLog only.",
  `Backfill pages through every WorkoutLog (page size ${TRAINING_SHEET_PAGE_SIZE}, cap ${TRAINING_SHEET_MAX_PAGES} pages / ${TRAINING_SHEET_PAGE_SIZE * TRAINING_SHEET_MAX_PAGES} rows). If the cap is hit, truncated is true and later pages are not synced.`,
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseLocalDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0);
  }
  if (value == null || value === "") return new Date(NaN);
  const raw = String(value).trim();
  const dateOnly = raw.match(DATE_ONLY);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0);
  }
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return instant;
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate(), 12, 0, 0);
}

export function normalizeDateKey(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (DATE_ONLY.test(raw)) return raw;
  return localDateKey(parseLocalDate(raw));
}

export function shiftLocalDateKey(value, days) {
  const d = value instanceof Date ? new Date(value.getTime()) : parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(days || 0));
  return localDateKey(d);
}

export function localDaysAgoKey(days, from = new Date()) {
  const d = from instanceof Date ? new Date(from.getTime()) : parseLocalDate(from);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - Number(days || 0));
  return localDateKey(d);
}

/** Monday (weekStartsOn = 1) of the local week containing `from`. */
export function localWeekStartKey(from = new Date()) {
  const d = from instanceof Date ? new Date(from.getTime()) : parseLocalDate(from);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}

/**
 * Drop account-like digit runs from free text.
 * Nine or more digits, with optional single spaces or dashes between them.
 * Dates (YYYY-MM-DD) are eight digits and stay intact.
 */
export function redactAccountNumbers(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\d(?:[ \t-]?\d){8,}/g, "[redacted]");
}

/**
 * Explicit date, else the day the row was saved when that day is inside
 * week_start, else the program-week Monday. A past week logged later must
 * not be labeled with the day it was typed.
 */
export function logCalendarDate(log) {
  const explicit = normalizeDateKey(log?.date);
  if (explicit) return explicit;
  const created = normalizeDateKey(log?.created_date);
  const week = normalizeDateKey(log?.week_start);
  if (created && (!week || localWeekStartKey(created) === week)) return created;
  if (week) return week;
  return created || "";
}

/**
 * Cardio stored in WorkoutLog.notes: a type id, or JSON { type, text }.
 * Freeform text is redacted. A plain sentence is not treated as cardio.
 */
export function parseStoredCardio(notes) {
  const raw = String(notes ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && CARDIO_IDS.has(parsed.type)) {
        const text = parsed.text == null ? "" : String(parsed.text).trim();
        return { type: parsed.type, text: redactAccountNumbers(text) };
      }
    } catch {
      // not JSON
    }
  }
  const id = raw.toLowerCase();
  if (CARDIO_IDS.has(id)) return { type: id, text: null };
  return null;
}

export function isRunName(name) {
  return /^(run|running)$/i.test(String(name || "").trim());
}

function hasLoggedValue(log) {
  if (!log) return false;
  return Number(log.weight) > 0 || Number(log.reps) > 0 || Boolean(String(log.notes || "").trim());
}

/** "run" | "cardio" | "lift" | "empty" */
export function classifyWorkoutLog(log) {
  if (!log || !hasLoggedValue(log)) return "empty";
  const cardio = parseStoredCardio(log.notes);
  const name = String(log.exercise || "").trim();
  if ((cardio && cardio.type === "run") || isRunName(name)) return "run";
  if (cardio || /^cardio$/i.test(name)) return "cardio";
  return "lift";
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dedupeLogs(logs) {
  const seen = new Set();
  const out = [];
  for (const log of logs || []) {
    if (!log) continue;
    if (log.id != null && log.id !== "") {
      const key = String(log.id);
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(log);
  }
  return out;
}

function liftRow(log) {
  const weight = finiteNumber(log.weight);
  const reps = finiteNumber(log.reps);
  const repsCell = reps != null && reps > 0 ? reps : "";
  const weightCell = weight == null ? "" : (weight > 0 || repsCell !== "" ? weight : "");
  return {
    date: logCalendarDate(log),
    exercise: String(log.exercise || "").trim(),
    set_number: Number(log.set_number) || 0,
    reps: repsCell,
    weight: weightCell,
    notes: redactAccountNumbers(log.notes) || "",
    _id: log.id != null ? String(log.id) : "",
  };
}

function runRow(log) {
  const cardio = parseStoredCardio(log.notes);
  const miles = finiteNumber(log.weight);
  const minutes = finiteNumber(log.reps);
  const freeform = cardio?.text || null;
  const rawNotes = cardio ? freeform : redactAccountNumbers(log.notes);
  return {
    date: logCalendarDate(log),
    distance: miles != null && miles > 0 ? miles : "",
    time: minutes != null && minutes > 0 ? minutes : "",
    notes: rawNotes || "",
    _id: log.id != null ? String(log.id) : "",
  };
}

function compareText(a, b) {
  return String(a).localeCompare(String(b));
}

/**
 * Every logged set and run. Idempotent: the same logs always produce the
 * same grids, and duplicate entity ids collapse to one row. Callers replace
 * the sheet body with these grids instead of appending.
 */
export function buildTrainingSheet(logs, { truncated = false } = {}) {
  const unique = dedupeLogs(logs);
  const lifts = [];
  const runs = [];
  let logsWithoutExplicitDate = 0;

  for (const log of unique) {
    const kind = classifyWorkoutLog(log);
    if (kind === "empty") continue;
    if (!normalizeDateKey(log.date)) logsWithoutExplicitDate += 1;
    if (kind === "lift") lifts.push(liftRow(log));
    else if (kind === "run") runs.push(runRow(log));
  }

  lifts.sort((a, b) => (
    compareText(a.date, b.date)
    || compareText(a.exercise, b.exercise)
    || a.set_number - b.set_number
    || compareText(a._id, b._id)
  ));
  runs.sort((a, b) => (
    compareText(a.date, b.date)
    || compareText(a.distance, b.distance)
    || compareText(a.time, b.time)
    || compareText(a.notes, b.notes)
    || compareText(a._id, b._id)
  ));

  const dates = [...lifts, ...runs].map((row) => row.date).filter(Boolean).sort();
  const liftValues = [
    LIFT_HEADERS,
    ...lifts.map((row) => [row.date, row.exercise, row.set_number, row.reps, row.weight, row.notes]),
  ];
  const runValues = [
    RUN_HEADERS,
    ...runs.map((row) => [row.date, row.distance, row.time, row.notes]),
  ];

  return {
    lifts: lifts.map(({ _id, ...row }) => row),
    runs: runs.map(({ _id, ...row }) => row),
    liftValues,
    runValues,
    history: {
      earliest_date: dates[0] || null,
      latest_date: dates.length ? dates[dates.length - 1] : null,
      log_count: unique.length,
      lift_count: lifts.length,
      run_count: runs.length,
      logs_without_explicit_date: logsWithoutExplicitDate,
      lifts_missing_notes: lifts.filter((row) => !row.notes).length,
      runs_missing_distance: runs.filter((row) => row.distance === "").length,
      runs_missing_time: runs.filter((row) => row.time === "").length,
      runs_missing_freeform_notes: runs.filter((row) => !row.notes).length,
      truncated: Boolean(truncated),
      page_size: TRAINING_SHEET_PAGE_SIZE,
      max_pages: TRAINING_SHEET_MAX_PAGES,
      limits: TRAINING_HISTORY_LIMITS,
    },
  };
}

/**
 * Page until a short page or the safety cap. A full final page sets truncated.
 */
export async function pageThrough(loadPage, {
  pageSize = TRAINING_SHEET_PAGE_SIZE,
  maxPages = TRAINING_SHEET_MAX_PAGES,
} = {}) {
  const rows = [];
  for (let page = 0; page < maxPages; page++) {
    const batch = await loadPage(pageSize, page * pageSize);
    const list = Array.isArray(batch) ? batch : [];
    rows.push(...list);
    if (list.length < pageSize) {
      return { rows, truncated: false, pages: page + 1 };
    }
  }
  return { rows, truncated: true, pages: maxPages };
}
