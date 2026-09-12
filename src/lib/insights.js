import { normalizeDateKey } from "./localDate.js";
import { normalizeBooks } from "./books.js";

function inRange(value, startKey, endKey) {
  const key = normalizeDateKey(value);
  if (!key) return false;
  return key >= startKey && key <= endKey;
}

function uniqueDays(items, dateKey = "date") {
  return new Set(
    (items || []).map(i => normalizeDateKey(i[dateKey] || i.created_date)).filter(Boolean)
  ).size;
}

function mealTotals(meals) {
  return (meals || []).reduce(
    (acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein_g: acc.protein_g + (Number(m.protein_g) || 0),
    }),
    { calories: 0, protein_g: 0 }
  );
}

function weightDelta(logs, start, end) {
  const sorted = (logs || [])
    .map(l => ({ key: normalizeDateKey(l.date), lbs: Number(l.weight_lbs) }))
    .filter(l => l.key && Number.isFinite(l.lbs) && l.lbs > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
  const first = [...sorted].reverse().find(l => l.key <= start) || sorted.find(l => l.key >= start && l.key <= end);
  const last = [...sorted].reverse().find(l => l.key <= end);
  if (!first || !last || first.key === last.key) return null;
  return Number((last.lbs - first.lbs).toFixed(1));
}

function signedLbs(n) {
  if (!Number.isFinite(n)) return "0 lb";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} lb`;
}

/**
 * 1–3 cheap cross-pillar lines. Returns [] when evidence is missing.
 * Never invents a relationship that the logs do not support.
 */
export function generateInsights({
  user,
  weekStart,
  weekEnd,
  meals = [],
  workoutLogs = [],
  journalEntries = [],
  transactions = [],
  weightLogs = [],
  activities = [],
  books = [],
  max = 3,
} = {}) {
  const start = normalizeDateKey(weekStart);
  const end = normalizeDateKey(weekEnd);
  if (!start || !end) return [];

  const weekMeals = (meals || []).filter(m => inRange(m.date, start, end));
  const weekLogs = (workoutLogs || []).filter(l =>
    l.week_start === start || inRange(l.created_date || l.date, start, end)
  );
  const weekMind = (journalEntries || []).filter(e => inRange(e.date, start, end));
  const weekTxns = (transactions || []).filter(t => inRange(t.date, start, end));
  const weekActs = (activities || []).filter(a => inRange(a.date, start, end));

  const sessionDays = new Set(weekLogs.map(l => l.day).filter(d => d >= 1));
  const trainingDays = Math.max(sessionDays.size, uniqueDays(weekActs.filter(a => a.pillar === "lifts")));
  const mealDays = uniqueDays(weekMeals);
  const totals = mealTotals(weekMeals);
  const avgProtein = mealDays ? Math.round(totals.protein_g / mealDays) : 0;
  const proteinGoal = Number(user?.nutrition_goals?.protein_g) > 0 ? Number(user.nutrition_goals.protein_g) : 0;
  const expenses = weekTxns.filter(t => t.type === "expense");
  const spent = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const delta = weightDelta(weightLogs, start, end);
  const pages = weekMind.reduce((s, e) => s + (Number(e.pages_read) || 0), 0);
  const mindDays = uniqueDays(weekMind);
  const list = normalizeBooks(books.length ? books : user?.books);
  const reading = list.filter(b => b.status === "reading");

  const out = [];

  if (trainingDays >= 2 && expenses.length >= 3) {
    out.push({
      id: "training_vs_spend",
      pillars: ["body", "money"],
      text: `${trainingDays} training days and $${Math.round(spent)} spent — both showed up in the logs.`,
    });
  } else if (trainingDays === 0 && expenses.length >= 3 && weekActs.some(a => a.pillar === "lifts") === false) {
    // only if lifts are in focus and we have spend, still require training pillar enabled
    const focused = Array.isArray(user?.focused_pillars) ? user.focused_pillars : [];
    const liftsOn = !focused.length || focused.includes("lifts");
    if (liftsOn && spent > 0) {
      out.push({
        id: "spend_without_training",
        pillars: ["body", "money"],
        text: `$${Math.round(spent)} logged this week and no lift sessions yet.`,
      });
    }
  }

  if (mealDays >= 3 && proteinGoal > 0 && delta != null) {
    const proteinBit = `${avgProtein} / ${Math.round(proteinGoal)}g protein`;
    out.push({
      id: "protein_vs_weight",
      pillars: ["body"],
      text: `Avg ${proteinBit} while weight moved ${signedLbs(delta)}.`,
    });
  }

  if ((pages > 0 || reading.length > 0) && trainingDays >= 1) {
    const bookBit = reading.length
      ? reading[0].title
      : `${pages} page${pages === 1 ? "" : "s"}`;
    out.push({
      id: "mind_and_training",
      pillars: ["mind", "body"],
      text: reading.length
        ? `${bookBit} is in progress and ${trainingDays} session${trainingDays === 1 ? "" : "s"} landed.`
        : `${bookBit} read and ${trainingDays} session${trainingDays === 1 ? "" : "s"} landed.`,
    });
  } else if (pages > 0 && mindDays >= 2 && mealDays >= 2) {
    out.push({
      id: "mind_and_food",
      pillars: ["mind", "body"],
      text: `${pages} pages and food on ${mealDays} days — mind and meals both logged.`,
    });
  }

  return out.slice(0, Math.max(0, max));
}
