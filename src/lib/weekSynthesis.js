import { formatLocalDate, normalizeDateKey } from "./localDate.js";

const MIND_TYPES = ["morning", "evening", "meditation", "reading"];

function inRange(value, startKey, endKey) {
  const key = normalizeDateKey(value);
  if (!key) return false;
  return key >= startKey && key <= endKey;
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

function uniqueDays(items, dateKey = "date") {
  return new Set(
    (items || []).map(i => normalizeDateKey(i[dateKey] || i.created_date)).filter(Boolean)
  ).size;
}

function weightOnOrBefore(logs, key) {
  const sorted = (logs || [])
    .map(l => ({ key: normalizeDateKey(l.date), lbs: Number(l.weight_lbs) }))
    .filter(l => l.key && Number.isFinite(l.lbs) && l.lbs > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
  const onDay = [...sorted].reverse().find(l => l.key <= key);
  return onDay || null;
}

/**
 * Auto-summarize one week from existing Forgeday logs.
 * Sections appear only when that pillar has data.
 */
export function synthesizeWeek({
  weekStart,
  weekEnd,
  meals = [],
  workoutLogs = [],
  journalEntries = [],
  transactions = [],
  weightLogs = [],
  activities = [],
  nutritionGoals = {},
} = {}) {
  const weekMeals = meals.filter(m => inRange(m.date, weekStart, weekEnd));
  const weekLogs = workoutLogs.filter(l => l.week_start === weekStart || inRange(l.created_date, weekStart, weekEnd));
  const weekMind = journalEntries.filter(e => inRange(e.date, weekStart, weekEnd));
  const weekTxns = transactions.filter(t => inRange(t.date, weekStart, weekEnd));
  const weekActivities = activities.filter(a => inRange(a.date, weekStart, weekEnd));

  const sessionDays = new Set(weekLogs.map(l => l.day).filter(d => d >= 1));
  const liftActivityDays = uniqueDays(weekActivities.filter(a => a.pillar === "lifts"));
  const sessions = Math.max(sessionDays.size, liftActivityDays);
  const sets = weekLogs.filter(l => !l.isCardio).length;

  const mealDays = uniqueDays(weekMeals);
  const totals = mealTotals(weekMeals);
  const avgKcal = mealDays ? Math.round(totals.calories / mealDays) : 0;
  const avgProtein = mealDays ? Math.round(totals.protein_g / mealDays) : 0;
  const calorieGoal = Number(nutritionGoals.calories) > 0 ? Number(nutritionGoals.calories) : 0;
  const proteinGoal = Number(nutritionGoals.protein_g) > 0 ? Number(nutritionGoals.protein_g) : 0;

  const weekWeights = (weightLogs || []).filter(l => inRange(l.date, weekStart, weekEnd));
  const startW = weightOnOrBefore(weightLogs, weekStart);
  const endW = weightOnOrBefore(weightLogs, weekEnd);
  const weightDelta = startW && endW && startW.key !== endW.key
    ? Number((endW.lbs - startW.lbs).toFixed(1))
    : null;

  const mindCounts = {};
  for (const t of MIND_TYPES) {
    mindCounts[t] = weekMind.filter(e => e.type === t).length;
  }
  const mindDays = uniqueDays(weekMind);
  const pagesRead = weekMind.reduce((s, e) => s + (Number(e.pages_read) || 0), 0);
  const sitMinutes = weekMind.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0);

  const expenses = weekTxns.filter(t => t.type === "expense");
  const income = weekTxns.filter(t => t.type === "income");
  const spent = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const earned = income.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const body = {
    hasData: sessions > 0 || mealDays > 0 || weightDelta != null || weekWeights.length > 0,
    sessions,
    sets,
    mealDays,
    avgKcal,
    avgProtein,
    calorieGoal,
    proteinGoal,
    weightStart: startW?.lbs ?? null,
    weightEnd: endW?.lbs ?? null,
    weightDelta,
  };

  const mind = {
    hasData: mindDays > 0,
    days: mindDays,
    counts: mindCounts,
    pagesRead,
    sitMinutes,
  };

  const money = {
    hasData: weekTxns.length > 0,
    spent,
    earned,
    txnCount: weekTxns.length,
  };

  return { body, mind, money, weekStart, weekEnd };
}

export function formatWeekSectionLines(synthesis) {
  const { body, mind, money } = synthesis;
  const bodyLines = [];
  if (body.sessions > 0) {
    bodyLines.push(`${body.sessions} lift session${body.sessions === 1 ? "" : "s"}${body.sets ? ` · ${body.sets} sets` : ""}`);
  }
  if (body.mealDays > 0) {
    const kcal = body.calorieGoal
      ? `avg ${body.avgKcal.toLocaleString()} / ${Math.round(body.calorieGoal).toLocaleString()} kcal`
      : `avg ${body.avgKcal.toLocaleString()} kcal`;
    const protein = body.proteinGoal
      ? `${body.avgProtein} / ${Math.round(body.proteinGoal)}g protein`
      : `${body.avgProtein}g protein`;
    bodyLines.push(`${kcal} · ${protein} (${body.mealDays} day${body.mealDays === 1 ? "" : "s"})`);
  }
  if (body.weightEnd != null && body.weightDelta != null) {
    const sign = body.weightDelta > 0 ? "+" : "";
    bodyLines.push(`Weight ${body.weightStart} → ${body.weightEnd} lb (${sign}${body.weightDelta})`);
  } else if (body.weightEnd != null) {
    bodyLines.push(`Weight ${body.weightEnd} lb`);
  }

  const mindBits = MIND_TYPES
    .filter(t => mind.counts[t] > 0)
    .map(t => `${t.charAt(0).toUpperCase() + t.slice(1)} ${mind.counts[t]}`);
  const mindLines = [];
  if (mindBits.length) mindLines.push(mindBits.join(" · "));
  if (mind.pagesRead > 0) mindLines.push(`${mind.pagesRead} pages read`);
  if (mind.sitMinutes > 0) mindLines.push(`${mind.sitMinutes} min sat`);

  const moneyLines = [];
  if (money.hasData) {
    const parts = [`$${Math.round(money.spent)} spent`];
    if (money.earned > 0) parts.push(`$${Math.round(money.earned)} in`);
    parts.push(`${money.txnCount} transaction${money.txnCount === 1 ? "" : "s"}`);
    moneyLines.push(parts.join(" · "));
  }

  return { body: bodyLines, mind: mindLines, money: moneyLines };
}

export function renderWeekSummaryMarkdown(synthesis, answers = {}) {
  const range = `${formatLocalDate(synthesis.weekStart, "MMM d")} – ${formatLocalDate(synthesis.weekEnd, "MMM d, yyyy")}`;
  const lines = formatWeekSectionLines(synthesis);
  const out = [`# Your Forgeday Week`, range, ""];

  if (lines.body.length) {
    out.push("## Body");
    lines.body.forEach(l => out.push(`- ${l}`));
    out.push("");
  }
  if (lines.mind.length) {
    out.push("## Mind");
    lines.mind.forEach(l => out.push(`- ${l}`));
    out.push("");
  }
  if (lines.money.length) {
    out.push("## Money");
    lines.money.forEach(l => out.push(`- ${l}`));
    out.push("");
  }
  if (answers.win || answers.change || answers.next) {
    out.push("## Notes");
    if (answers.win) out.push(`- Went well: ${answers.win}`);
    if (answers.change) out.push(`- Change: ${answers.change}`);
    if (answers.next) out.push(`- Next week: ${answers.next}`);
    out.push("");
  }
  return out.join("\n").trim();
}

export function weekHighlights(synthesis, answers = {}) {
  const lines = formatWeekSectionLines(synthesis);
  const highlights = [];
  if (answers.win) highlights.push(answers.win);
  highlights.push(...lines.body.slice(0, 2));
  if (lines.mind[0]) highlights.push(lines.mind[0]);
  return highlights.filter(Boolean).slice(0, 4);
}
