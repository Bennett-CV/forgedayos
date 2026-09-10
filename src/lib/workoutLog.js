export const CARDIO_TYPES = [
  { id: "run", label: "Run" },
  { id: "bike", label: "Bike" },
  { id: "swim", label: "Swim" },
  { id: "other", label: "Other" },
];

const CARDIO_IDS = new Set(CARDIO_TYPES.map(t => t.id));

/** Empty and auto-saved 0s are not typed values. */
export function displayLoggedNumber(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return "";
  return String(num);
}

export function parseOptionalNumber(str) {
  const t = String(str ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Accept "32", "32.5", or "mm:ss" / "h:mm:ss". Stored as minutes. */
export function parseDurationMinutes(str) {
  const t = String(str ?? "").trim();
  if (!t) return null;
  if (t.includes(":")) {
    const parts = t.split(":").map(p => Number(p));
    if (parts.length < 2 || parts.length > 3 || parts.some(n => !Number.isFinite(n))) return null;
    if (parts.length === 2) return parts[0] + parts[1] / 60;
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function formatDurationMinutes(n) {
  if (n == null || n === 0) return "";
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return "";
  const totalSeconds = Math.round(num * 60);
  if (totalSeconds % 60 === 0) return String(num % 1 === 0 ? num : Number(num.toFixed(1)));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

export function parseCardioType(notes) {
  const raw = String(notes || "").trim();
  if (!raw) return "";
  try {
    const j = JSON.parse(raw);
    if (j && CARDIO_IDS.has(j.type)) return j.type;
  } catch {
    // notes is a plain type id
  }
  const id = raw.toLowerCase().split(/\s+/)[0];
  return CARDIO_IDS.has(id) ? id : "";
}

export function cardioTypeLabel(id) {
  return CARDIO_TYPES.find(t => t.id === id)?.label || "Cardio";
}

/** All-time heaviest set; ties go to more reps. Ignores 0/empty. */
export function bestSetAllTime(logs) {
  let best = null;
  for (const l of logs || []) {
    const weight = l.weight > 0 ? Number(l.weight) : null;
    if (weight == null) continue;
    const reps = l.reps > 0 ? Number(l.reps) : 0;
    if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) {
      best = { weight, reps, week: l.week_start };
    }
  }
  return best;
}

/** Longest duration if any time was logged; otherwise farthest distance. */
export function bestCardioAllTime(logs) {
  let bestDur = null;
  let bestDist = null;
  for (const l of logs || []) {
    const minutes = l.reps > 0 ? Number(l.reps) : null;
    const miles = l.weight > 0 ? Number(l.weight) : null;
    if (minutes != null && (!bestDur || minutes > bestDur.value)) {
      bestDur = { kind: "duration", value: minutes, week: l.week_start };
    }
    if (miles != null && (!bestDist || miles > bestDist.value)) {
      bestDist = { kind: "distance", value: miles, week: l.week_start };
    }
  }
  return bestDur || bestDist;
}
