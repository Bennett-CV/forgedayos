import { displayLoggedNumber } from "./workoutLog.js";

function hasLoggedValue(log) {
  if (!log) return false;
  return Number(log.weight) > 0 || Number(log.reps) > 0;
}

function sameExercise(log, exerciseName) {
  return String(log?.exercise || "") === String(exerciseName || "");
}

/** Most recent week of this exercise, excluding the current week. */
export function lastSessionSets(logs, exerciseName, { excludeWeek } = {}) {
  const relevant = (logs || []).filter(l =>
    sameExercise(l, exerciseName)
    && l.week_start
    && l.week_start !== excludeWeek
    && hasLoggedValue(l)
  );
  if (!relevant.length) return [];
  const weeks = [...new Set(relevant.map(l => l.week_start))].sort((a, b) => b.localeCompare(a));
  return relevant
    .filter(l => l.week_start === weeks[0])
    .sort((a, b) => (Number(a.set_number) || 0) - (Number(b.set_number) || 0));
}

export function formatLastSet(log) {
  if (!log) return "";
  const w = Number(log.weight) > 0 ? Number(log.weight) : null;
  const r = Number(log.reps) > 0 ? Number(log.reps) : null;
  if (w != null && r != null) return `${w}×${r}`;
  if (w != null) return String(w);
  if (r != null) return `${r} reps`;
  return "";
}

export function formatLastSessionLine(lastSets) {
  const bits = (lastSets || []).map(formatLastSet).filter(Boolean);
  if (!bits.length) return "";
  if (bits.length === 1) return bits[0];
  const same = bits.every(b => b === bits[0]);
  return same ? `${bits[0]} ×${bits.length}` : bits.join(" · ");
}

/** Fill empty in-session set fields from last session. Does not overwrite typed or saved sets. */
export function mergeLastIntoSets(current, lastSets) {
  const last = lastSets || [];
  return (current || []).map((s, i) => {
    if (s?.id) return s;
    if (String(s?.weight || "").trim() || String(s?.reps || "").trim()) return s;
    const src = last[i] || last[last.length - 1];
    if (!src || !hasLoggedValue(src)) return s;
    return {
      ...s,
      weight: displayLoggedNumber(src.weight),
      reps: displayLoggedNumber(src.reps),
      loaded: true,
    };
  });
}

export function isExerciseLogged(logs, exerciseName, weekStart) {
  return (logs || []).some(l =>
    sameExercise(l, exerciseName)
    && l.week_start === weekStart
    && hasLoggedValue(l)
  );
}

export function sessionProgress(exercises, logs, weekStart, day) {
  const list = exercises || [];
  const dayLogs = (logs || []).filter(l => l.week_start === weekStart && Number(l.day) === Number(day));
  const done = list.filter((ex) => {
    if (ex.isCardio) {
      return dayLogs.some(l => sameExercise(l, ex.name) && (
        hasLoggedValue(l) || Boolean(l.notes)
      ));
    }
    return isExerciseLogged(dayLogs, ex.name, weekStart);
  }).length;
  return { done, total: list.length };
}
