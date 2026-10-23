/**
 * Read-only Goggins training feed builder.
 * Pure: entity arrays in → versioned JSON out. No Base44 I/O.
 *
 * Date and run/lift classification live in ./trainingSheet.js (no date-fns)
 * so the Deno function can ship both files.
 * SOURCE OF TRUTH: keep identical to
 * base44/functions/gogginsTrainingFeed/gogginsFeed.js
 */

import {
  classifyWorkoutLog,
  localDaysAgoKey,
  localWeekStartKey,
  logCalendarDate,
  normalizeDateKey,
  parseLocalDate,
  parseStoredCardio,
  redactAccountNumbers,
  shiftLocalDateKey,
} from "./trainingSheet.js";

export const GOGGINS_FEED_SCHEMA_VERSION = "1.1.0";

const DEFAULT_WEEKS = 10;
const DEFAULT_WEIGHT_DAYS = 90;
const MIN_WEEKS = 1;
const MAX_WEEKS = 26;
const MIN_WEIGHT_DAYS = 7;
const MAX_WEIGHT_DAYS = 365;

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
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
      notes: redactAccountNumbers(l.notes),
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

function inWeekWindow(log, weekFrom) {
  const week = normalizeDateKey(log.week_start);
  if (!week) return false;
  if (weekFrom && week < weekFrom) return false;
  return true;
}

function groupWorkouts(workoutLogs, weekFrom) {
  const relevant = (workoutLogs || []).filter((l) => {
    if (!inWeekWindow(l, weekFrom)) return false;
    const kind = classifyWorkoutLog(l);
    return kind === "lift" || kind === "cardio";
  });

  const byWeekDay = new Map();
  for (const l of relevant) {
    const week_start = normalizeDateKey(l.week_start);
    const day = Number(l.day) || 0;
    const key = `${week_start}|${day}`;
    if (!byWeekDay.has(key)) {
      byWeekDay.set(key, { week_start, day, dates: [], exercises: new Map() });
    }
    const session = byWeekDay.get(key);
    const performed = logCalendarDate(l);
    if (performed) session.dates.push(performed);
    const name = String(l.exercise || "").trim() || "Unknown";
    if (!session.exercises.has(name)) session.exercises.set(name, []);
    session.exercises.get(name).push({
      set_number: Number(l.set_number) || 0,
      weight: l.weight != null && Number.isFinite(Number(l.weight)) ? Number(l.weight) : null,
      reps: l.reps != null && Number.isFinite(Number(l.reps)) ? Number(l.reps) : null,
      is_amrap: Boolean(l.is_amrap),
      notes: redactAccountNumbers(l.notes),
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
      date: session.dates.sort()[0] || session.week_start,
      exercises: [...session.exercises.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, sets]) => ({
          name,
          sets: sets.sort((a, b) => a.set_number - b.set_number),
        })),
    }));
}

/** Runs in the workout window, newest date first. Distance is miles, time is minutes. */
function collectRuns(workoutLogs, weekFrom) {
  return (workoutLogs || [])
    .filter((l) => inWeekWindow(l, weekFrom) && classifyWorkoutLog(l) === "run")
    .map((l) => {
      const cardio = parseStoredCardio(l.notes);
      const miles = l.weight != null && Number(l.weight) > 0 ? Number(l.weight) : null;
      const minutes = l.reps != null && Number(l.reps) > 0 ? Number(l.reps) : null;
      const notes = cardio ? cardio.text : redactAccountNumbers(l.notes);
      return {
        date: logCalendarDate(l),
        distance: miles,
        time: minutes,
        notes: notes || null,
      };
    })
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return (b.distance || 0) - (a.distance || 0);
    });
}

function bestSetsInWindow(workoutLogs, weekFrom) {
  const byExercise = new Map();
  for (const l of workoutLogs || []) {
    const week = normalizeDateKey(l.week_start);
    if (!week || (weekFrom && week < weekFrom)) continue;
    if (classifyWorkoutLog(l) !== "lift") continue;
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

function sessionsThisWeek(workouts, workoutLogs, currentWeekStart) {
  const keys = new Set();
  for (const session of workouts) {
    if (session.week_start !== currentWeekStart) continue;
    keys.add(`${session.week_start}|${session.day}`);
  }
  for (const log of workoutLogs || []) {
    if (normalizeDateKey(log.week_start) !== currentWeekStart) continue;
    if (classifyWorkoutLog(log) !== "run") continue;
    keys.add(`${currentWeekStart}|${Number(log.day) || 0}`);
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
  const runs = collectRuns(workoutLogs, weekFrom);
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
    runs,
    body_weight,
    stats: {
      sessions_this_week: sessionsThisWeek(workouts, workoutLogs, currentWeekStart),
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
