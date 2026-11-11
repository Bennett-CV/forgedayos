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

function emptySet() {
  return {
    id: null,
    weight: "",
    reps: "",
    weightTouched: false,
    repsTouched: false,
    weightPrefilled: false,
    repsPrefilled: false,
  };
}

/** Rows shaped like the in-session editor, from this week's saved logs only. */
export function serverSetsFromLogs(numSets, logs, exerciseName) {
  const count = Math.max(0, Number(numSets) || 0);
  return Array.from({ length: count }, (_, i) => {
    const setNumber = i + 1;
    const existing = (logs || []).find(
      l => sameExercise(l, exerciseName) && l.set_number === setNumber
    );
    return {
      ...emptySet(),
      id: existing?.id || null,
      weight: displayLoggedNumber(existing?.weight),
      reps: displayLoggedNumber(existing?.reps),
    };
  });
}

/** Last-session log for this set number. Missing sets stay empty (no copy from a neighbor). */
function lastForSet(lastSets, index) {
  const last = lastSets || [];
  const setNumber = index + 1;
  const exact = last.find(l => Number(l.set_number) === setNumber);
  if (exact) return exact;
  if (last.some(l => l.set_number != null && l.set_number !== "")) return null;
  return last[index] || null;
}

function resolveField(localValue, serverValue, { touched, prefilled, serverHasLog, localId, lastValue }) {
  if (touched) {
    return { value: localValue ?? "", touched: true, prefilled: false };
  }
  if (serverHasLog) {
    return { value: serverValue ?? "", touched: false, prefilled: false };
  }
  // Saved in this session; the refresh has not caught up yet. Do not prefill over it.
  if (localId) {
    return { value: localValue ?? "", touched: false, prefilled: false };
  }
  if (lastValue && (!String(localValue ?? "").trim() || prefilled)) {
    return { value: lastValue, touched: false, prefilled: true };
  }
  // Keep an explicit Load last draft when this refresh has no last-session source.
  if (prefilled) {
    return {
      value: localValue ?? "",
      touched: false,
      prefilled: Boolean(String(localValue ?? "").trim()),
    };
  }
  return { value: localValue ?? "", touched: false, prefilled: false };
}

/**
 * Merge a server refresh into in-progress sets.
 * A field the user has typed or edited stays as they left it.
 * Untouched fields take the saved log when one exists, otherwise last session.
 * Last-session values are marked prefilled and are not saved rows.
 */
export function mergeServerIntoSets(localSets, serverSets, lastSets) {
  return (serverSets || []).map((server, i) => {
    const local = localSets?.[i] || emptySet();
    const serverHasLog = Boolean(server?.id);
    const src = lastForSet(lastSets, i);
    const lastWeight = src && hasLoggedValue(src) ? displayLoggedNumber(src.weight) : "";
    const lastReps = src && hasLoggedValue(src) ? displayLoggedNumber(src.reps) : "";
    const weight = resolveField(local.weight, server?.weight, {
      touched: Boolean(local.weightTouched),
      prefilled: Boolean(local.weightPrefilled),
      serverHasLog,
      localId: local.id,
      lastValue: lastWeight,
    });
    const reps = resolveField(local.reps, server?.reps, {
      touched: Boolean(local.repsTouched),
      prefilled: Boolean(local.repsPrefilled),
      serverHasLog,
      localId: local.id,
      lastValue: lastReps,
    });
    return {
      id: serverHasLog ? server.id : (local.id || null),
      weight: weight.value,
      reps: reps.value,
      weightTouched: weight.touched,
      repsTouched: reps.touched,
      weightPrefilled: weight.prefilled,
      repsPrefilled: reps.prefilled,
    };
  });
}

export function setRowsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i];
    return row.id === other.id
      && row.weight === other.weight
      && row.reps === other.reps
      && Boolean(row.weightTouched) === Boolean(other.weightTouched)
      && Boolean(row.repsTouched) === Boolean(other.repsTouched)
      && Boolean(row.weightPrefilled) === Boolean(other.weightPrefilled)
      && Boolean(row.repsPrefilled) === Boolean(other.repsPrefilled);
  });
}

/** A set with numbers that are not yet the saved row, or a saved row with unsaved edits. */
export function isPendingSet(set) {
  if (!set) return false;
  const hasValue = Boolean(String(set.weight ?? "").trim() || String(set.reps ?? "").trim());
  if (!hasValue) return false;
  if (!set.id) return true;
  return Boolean(set.weightTouched || set.repsTouched);
}

/** Prefill only — blur must not write it. Log still can. */
export function isUntouchedPrefill(set) {
  if (!set || set.id) return false;
  const weight = String(set.weight ?? "").trim();
  const reps = String(set.reps ?? "").trim();
  if (!weight && !reps) return false;
  if (weight && !(set.weightPrefilled && !set.weightTouched)) return false;
  if (reps && !(set.repsPrefilled && !set.repsTouched)) return false;
  return true;
}

const CARDIO_FIELDS = ["type", "note", "duration", "distance"];

export function emptyCardioTouched() {
  return { type: false, note: false, duration: false, distance: false };
}

/**
 * Merge a cardio refresh. Typed fields stay. With no saved row, the local draft
 * (including Load last) stays. A saved row fills only untouched fields.
 */
export function mergeCardioDraft(local, incoming) {
  const prev = local || {};
  const next = incoming || {};
  const touched = { ...emptyCardioTouched(), ...(prev.touched || {}) };
  const pick = (key) => {
    if (touched[key]) return prev[key] ?? "";
    if (next.id) return next[key] ?? "";
    return prev[key] ?? "";
  };
  return {
    type: pick("type"),
    note: pick("note"),
    duration: pick("duration"),
    distance: pick("distance"),
    id: next.id || prev.id || null,
    touched: {
      type: Boolean(touched.type),
      note: Boolean(touched.note),
      duration: Boolean(touched.duration),
      distance: Boolean(touched.distance),
    },
  };
}

export function cardioDraftEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if ((a.id || null) !== (b.id || null)) return false;
  return CARDIO_FIELDS.every(key =>
    (a[key] ?? "") === (b[key] ?? "")
    && Boolean(a.touched?.[key]) === Boolean(b.touched?.[key])
  );
}

/** Fill empty in-session set fields from last session. Does not overwrite typed or saved sets. */
export function mergeLastIntoSets(current, lastSets) {
  const last = lastSets || [];
  return (current || []).map((s, i) => {
    if (s?.id) return s;
    if (String(s?.weight || "").trim() || String(s?.reps || "").trim()) return s;
    const src = last[i] || last[last.length - 1];
    if (!src || !hasLoggedValue(src)) return s;
    const weight = displayLoggedNumber(src.weight);
    const reps = displayLoggedNumber(src.reps);
    return {
      ...s,
      weight,
      reps,
      loaded: true,
      weightTouched: false,
      repsTouched: false,
      weightPrefilled: Boolean(weight),
      repsPrefilled: Boolean(reps),
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
