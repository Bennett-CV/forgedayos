/**
 * Read-only Goggins training feed builder.
 * Pure: entity arrays in → versioned JSON out. No Base44 I/O.
 *
 * Deno mirror of src/lib/gogginsFeed.js — keep identical.
 * Self-contained (no date-fns) for Base44 function runtime.
 */

export const GOGGINS_FEED_SCHEMA_VERSION = "1.0.0";

const DEFAULT_WEEKS = 10;
const DEFAULT_WEIGHT_DAYS = 90;
const MIN_WEEKS = 1;
const MAX_WEEKS = 26;
const MIN_WEIGHT_DAYS = 7;
const MAX_WEIGHT_DAYS = 365;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(value) {
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

function normalizeDateKey(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (DATE_ONLY.test(raw)) return raw;
  return localDateKey(parseLocalDate(raw));
}

function shiftLocalDateKey(value, days) {
  const d = value instanceof Date ? new Date(value.getTime()) : parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(days || 0));
  return localDateKey(d);
}

function localDaysAgoKey(days, from = new Date()) {
  const d = from instanceof Date ? new Date(from.getTime()) : parseLocalDate(from);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - Number(days || 0));
  return localDateKey(d);
}

/** Monday (weekStartsOn = 1) of the local week containing `from`. */
function localWeekStartKey(from = new Date()) {
  const d = from instanceof Date ? new Date(from.getTime()) : parseLocalDate(from);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hasLoggedValue(log) {
  if (!log) return false;
  return Number(log.weight) > 0 || Number(log.reps) > 0 || Boolean(String(log.notes || "").trim());
}

/** Heaviest set; ties go to more reps. Ignores 0/empty weight. */
function bestSetInLogs(logs) {
  let best = null;
  for (const l of logs || []) {
    const weight = l.weight > 0 ? Number(l.weight) : null;
    if (weight == null) continue;
    const reps = l.reps > 0 ? Number(l.reps) : 0;
    if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) {
      best = { weight, reps, week: normalizeDateKey(l.week_start), day: Number(l.day) || null };
    }
  }
  return best;
}

function sortedWeightSeries(logs, fromKey) {
  return (logs || [])
    .map((l) => ({
      date: normalizeDateKey(l.date),
      weight_lbs: Number(l.weight_lbs),
      notes: l.notes != null && String(l.notes).trim() ? String(l.notes) : null,
    }))
    .filter((l) => l.date && Number.isFinite(l.weight_lbs) && l.weight_lbs > 0)
    .filter((l) => !fromKey || l.date >= fromKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function nearestOnOrBefore(sorted, cutoff) {
  return [...sorted].reverse().find((l) => l.date <= cutoff) || null;
}

function weightDelta(sorted, latest, days, today) {
  if (!latest) return null;
  const cutoff = localDaysAgoKey(days, today);
  const prior = nearestOnOrBefore(sorted, cutoff);
  if (!prior || prior.date === latest.date) return null;
  return Number((latest.weight_lbs - prior.weight_lbs).toFixed(1));
}

function summarizeProgram(program) {
  const days = (program || [])
    .map((d) => ({
      day: Number(d.day),
      label: d.label || `Day ${d.day}`,
      type: d.type === "cardio" ? "cardio" : "strength",
      exercises: (d.exercises || []).map((e) => ({
        name: e.name,
        sets: e.sets != null ? Number(e.sets) : null,
        reps: e.reps != null ? Number(e.reps) : null,
        isAmrap: Boolean(e.isAmrap),
        isCardio: Boolean(e.isCardio),
      })),
    }))
    .filter((d) => Number.isFinite(d.day) && d.day >= 1)
    .sort((a, b) => a.day - b.day);

  return { days };
}

function groupWorkouts(workoutLogs, weekFrom) {
  const relevant = (workoutLogs || []).filter((l) => {
    const week = normalizeDateKey(l.week_start);
    if (!week) return false;
    if (weekFrom && week < weekFrom) return false;
    return hasLoggedValue(l);
  });

  const byWeekDay = new Map();
  for (const l of relevant) {
    const week_start = normalizeDateKey(l.week_start);
    const day = Number(l.day) || 0;
    const key = `${week_start}|${day}`;
    if (!byWeekDay.has(key)) {
      byWeekDay.set(key, { week_start, day, exercises: new Map() });
    }
    const session = byWeekDay.get(key);
    const name = String(l.exercise || "").trim() || "Unknown";
    if (!session.exercises.has(name)) session.exercises.set(name, []);
    session.exercises.get(name).push({
      set_number: Number(l.set_number) || 0,
      weight: l.weight != null && Number.isFinite(Number(l.weight)) ? Number(l.weight) : null,
      reps: l.reps != null && Number.isFinite(Number(l.reps)) ? Number(l.reps) : null,
      is_amrap: Boolean(l.is_amrap),
      notes: l.notes != null && String(l.notes).trim() ? String(l.notes) : null,
    });
  }

  return [...byWeekDay.values()]
    .sort((a, b) => {
      const w = b.week_start.localeCompare(a.week_start);
      if (w !== 0) return w;
      return a.day - b.day;
    })
    .map((session) => ({
      week_start: session.week_start,
      day: session.day,
      exercises: [...session.exercises.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, sets]) => ({
          name,
          sets: sets.sort((a, b) => a.set_number - b.set_number),
        })),
    }));
}

function bestSetsInWindow(workoutLogs, weekFrom) {
  const byExercise = new Map();
  for (const l of workoutLogs || []) {
    const week = normalizeDateKey(l.week_start);
    if (!week || (weekFrom && week < weekFrom)) continue;
    if (!hasLoggedValue(l)) continue;
    const name = String(l.exercise || "").trim();
    if (!name) continue;
    if (!byExercise.has(name)) byExercise.set(name, []);
    byExercise.get(name).push(l);
  }

  const best = [];
  for (const [exercise, logs] of byExercise) {
    const set = bestSetInLogs(logs);
    if (!set) continue;
    best.push({
      exercise,
      weight: set.weight,
      reps: set.reps,
      week_start: set.week,
      day: set.day,
    });
  }

  return best.sort((a, b) => a.exercise.localeCompare(b.exercise));
}

function sessionsThisWeek(workouts, currentWeekStart) {
  const keys = new Set();
  for (const session of workouts) {
    if (session.week_start !== currentWeekStart) continue;
    keys.add(`${session.week_start}|${session.day}`);
  }
  return keys.size;
}

/**
 * Build the Goggins cut/training feed.
 *
 * @param {object} opts
 * @param {Array} opts.program WorkoutProgram rows
 * @param {Array} opts.workoutLogs WorkoutLog rows
 * @param {Array} opts.weightLogs WeightLog rows
 * @param {number} [opts.weeks=10] workout history window (1–26)
 * @param {number} [opts.weightDays=90] body-weight series window (7–365)
 * @param {Date|string} [opts.now] reference instant for windows / generated_at
 * @param {string} [opts.generatedAt] override ISO timestamp (tests)
 */
export function buildGogginsFeed({
  program = [],
  workoutLogs = [],
  weightLogs = [],
  weeks = DEFAULT_WEEKS,
  weightDays = DEFAULT_WEIGHT_DAYS,
  now = new Date(),
  generatedAt,
} = {}) {
  const weeksN = clampInt(weeks, MIN_WEEKS, MAX_WEEKS, DEFAULT_WEEKS);
  const weightDaysN = clampInt(weightDays, MIN_WEIGHT_DAYS, MAX_WEIGHT_DAYS, DEFAULT_WEIGHT_DAYS);
  const today = now instanceof Date ? now : parseLocalDate(now);
  const currentWeekStart = localWeekStartKey(today);
  const weekFrom = shiftLocalDateKey(currentWeekStart, -(weeksN - 1) * 7);
  const weightFrom = localDaysAgoKey(weightDaysN, today);

  const workouts = groupWorkouts(workoutLogs, weekFrom);
  const body_weight = sortedWeightSeries(weightLogs, weightFrom);
  const latest = body_weight.length ? body_weight[body_weight.length - 1] : null;

  const generated_at =
    generatedAt
    || (now instanceof Date && !Number.isNaN(now.getTime())
      ? now.toISOString()
      : new Date().toISOString());

  return {
    schema_version: GOGGINS_FEED_SCHEMA_VERSION,
    generated_at,
    window: {
      weeks: weeksN,
      weight_days: weightDaysN,
      week_start_from: weekFrom,
      current_week_start: currentWeekStart,
      weight_from: weightFrom,
    },
    program: summarizeProgram(program),
    workouts,
    body_weight,
    stats: {
      sessions_this_week: sessionsThisWeek(workouts, currentWeekStart),
      best_sets: bestSetsInWindow(workoutLogs, weekFrom),
      latest_weight_lbs: latest ? latest.weight_lbs : null,
      weight_delta_7d: weightDelta(body_weight, latest, 7, today),
      weight_delta_14d: weightDelta(body_weight, latest, 14, today),
      weight_delta_28d: weightDelta(body_weight, latest, 28, today),
    },
  };
}

export function parseGogginsFeedArgs(input = {}) {
  return {
    weeks: clampInt(input.weeks, MIN_WEEKS, MAX_WEEKS, DEFAULT_WEEKS),
    weightDays: clampInt(
      input.weight_days ?? input.weightDays,
      MIN_WEIGHT_DAYS,
      MAX_WEIGHT_DAYS,
      DEFAULT_WEIGHT_DAYS
    ),
  };
}
