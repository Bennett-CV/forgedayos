import { normalizeDateKey, isSameLocalDay } from "./localDate.js";
import { enabledDailyKeys } from "./todayCommand.js";
import { normalizeBooks, booksForMind } from "./books.js";

const PILLAR_ORDER = ["body", "money", "mind", "consistency"];

function inRange(value, startKey, endKey) {
  const key = normalizeDateKey(value);
  if (!key) return false;
  return key >= startKey && key <= endKey;
}

function uniqueDays(items, dateKey = "date") {
  return new Set(
    (items || []).map(i => normalizeDateKey(i[dateKey] || i.created_date)).filter(Boolean)
  );
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

function weightOnOrBefore(logs, key) {
  const sorted = (logs || [])
    .map(l => ({ key: normalizeDateKey(l.date), lbs: Number(l.weight_lbs) }))
    .filter(l => l.key && Number.isFinite(l.lbs) && l.lbs > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
  const onDay = [...sorted].reverse().find(l => l.key <= key);
  return onDay || null;
}

export function clampScore(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function ratioScore(actual, target) {
  if (!(Number(target) > 0) || !Number.isFinite(Number(actual))) return null;
  return clampScore((Number(actual) / Number(target)) * 100);
}

export function closenessScore(actual, target) {
  if (!(Number(target) > 0) || !Number.isFinite(Number(actual))) return null;
  const err = Math.abs(Number(actual) - Number(target)) / Number(target);
  return clampScore((1 - Math.min(1, err)) * 100);
}

export function daysInclusive(startKey, endKey) {
  const start = normalizeDateKey(startKey);
  const end = normalizeDateKey(endKey);
  if (!start || !end || end < start) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function pillarWeights(user, { hasFinanceData = false } = {}) {
  const focused = Array.isArray(user?.focused_pillars) ? user.focused_pillars : [];
  const liftsOn = !focused.length || focused.includes("lifts");
  const foodOn = !focused.length || focused.includes("nutrition");
  const mindOn = !focused.length || focused.includes("mindfulness");
  const moneyOn = focused.includes("finance") || (!focused.length && hasFinanceData);

  const raw = {
    body: liftsOn || foodOn ? (liftsOn && foodOn ? 3 : 2) : 0,
    money: moneyOn ? 2 : 0,
    mind: mindOn ? 2 : 0,
    consistency: 2,
  };
  const total = PILLAR_ORDER.reduce((s, k) => s + raw[k], 0);
  const weights = {};
  for (const key of PILLAR_ORDER) {
    weights[key] = total ? raw[key] / total : 0;
  }
  return { raw, weights, focused };
}

export function weightDirectionScore(delta, fitnessGoal) {
  if (delta == null || !Number.isFinite(Number(delta)) || !fitnessGoal) return null;
  const d = Number(delta);
  if (fitnessGoal === "lose_weight") {
    if (d <= -0.5) return 90;
    if (d < 0) return 75;
    if (d <= 0.5) return 55;
    return 35;
  }
  if (fitnessGoal === "gain_muscle") {
    if (d >= 0.5) return 90;
    if (d > 0) return 75;
    if (d >= -0.5) return 55;
    return 35;
  }
  if (fitnessGoal === "maintain") {
    if (Math.abs(d) <= 0.5) return 95;
    if (Math.abs(d) <= 1.5) return 70;
    return 40;
  }
  return null;
}

function average(values) {
  const nums = values.filter(v => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function signed(n) {
  if (!Number.isFinite(n)) return "0";
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Goal-weighted Forgeday Score from existing logs only.
 * Pillars without enough logged data stay null — never inferred as a fail.
 */
export function computeForgedayScore({
  user,
  today,
  weekStart,
  weekEnd,
  meals = [],
  workoutLogs = [],
  workoutProgram = [],
  journalEntries = [],
  transactions = [],
  weightLogs = [],
  activities = [],
  books = [],
  budgetCategories = [],
} = {}) {
  const todayKey = normalizeDateKey(today);
  const start = normalizeDateKey(weekStart);
  const end = normalizeDateKey(weekEnd);
  const elapsedEnd = todayKey && end && todayKey < end ? todayKey : end;
  const elapsedDays = daysInclusive(start, elapsedEnd);

  const hasFinanceData = (transactions || []).length > 0
    || (Array.isArray(user?.focused_pillars) && user.focused_pillars.includes("finance"));
  const { raw, weights } = pillarWeights(user, { hasFinanceData });
  const keys = enabledDailyKeys(user, { hasFinanceData });

  const weekMeals = (meals || []).filter(m => inRange(m.date, start, end));
  const weekLogs = (workoutLogs || []).filter(l =>
    l.week_start === start || inRange(l.created_date || l.date, start, end)
  );
  const weekMind = (journalEntries || []).filter(e => inRange(e.date, start, end));
  const weekTxns = (transactions || []).filter(t => inRange(t.date, start, end));
  const weekActs = (activities || []).filter(a => inRange(a.date, start, end));

  const sessionDays = new Set(weekLogs.map(l => l.day).filter(d => d >= 1));
  const liftActDays = uniqueDays(weekActs.filter(a => a.pillar === "lifts"));
  const sessions = Math.max(sessionDays.size, liftActDays.size);

  const mealDaySet = uniqueDays(weekMeals);
  const mealDays = mealDaySet.size;
  const totals = mealTotals(weekMeals);
  const avgKcal = mealDays ? totals.calories / mealDays : 0;
  const avgProtein = mealDays ? totals.protein_g / mealDays : 0;
  const calorieGoal = Number(user?.nutrition_goals?.calories) > 0 ? Number(user.nutrition_goals.calories) : 0;
  const proteinGoal = Number(user?.nutrition_goals?.protein_g) > 0 ? Number(user.nutrition_goals.protein_g) : 0;
  const workoutTarget = Number(user?.workout_days_per_week) > 0
    ? Number(user.workout_days_per_week)
    : new Set((workoutProgram || []).map(d => Number(d.day)).filter(d => d >= 1)).size;

  const startW = weightOnOrBefore(weightLogs, start);
  const endW = weightOnOrBefore(weightLogs, end);
  const weightDelta = startW && endW && startW.key !== endW.key
    ? Number((endW.lbs - startW.lbs).toFixed(1))
    : null;

  const bodyParts = [];
  const bodyExplain = [];

  if (proteinGoal > 0 && mealDays >= 2) {
    const part = ratioScore(avgProtein, proteinGoal);
    bodyParts.push(part);
    bodyExplain.push(`Protein ${Math.round(avgProtein)} / ${Math.round(proteinGoal)}g avg on ${mealDays} meal days → ${part}`);
  } else if (proteinGoal > 0 && mealDays === 1) {
    bodyExplain.push("Protein target is set — need two meal days to score it.");
  }

  if (calorieGoal > 0 && mealDays >= 2) {
    const part = closenessScore(avgKcal, calorieGoal);
    bodyParts.push(part);
    bodyExplain.push(`Calories ${Math.round(avgKcal)} / ${Math.round(calorieGoal)} avg → ${part}`);
  }

  if (workoutTarget > 0 && sessions > 0) {
    const expected = Math.max(1, workoutTarget * Math.min(1, elapsedDays / 7));
    const part = ratioScore(sessions, expected);
    bodyParts.push(part);
    bodyExplain.push(`Training ${sessions} of ~${expected.toFixed(1)} paced sessions (${workoutTarget}/week) → ${part}`);
  } else if (workoutTarget > 0) {
    bodyExplain.push("No lift sessions logged this week yet — training is omitted, not a zero.");
  }

  const fitnessGoal = user?.fitness_goal || null;
  const weightPart = weightDirectionScore(weightDelta, fitnessGoal);
  if (weightPart != null) {
    bodyParts.push(weightPart);
    bodyExplain.push(`Weight ${signed(weightDelta)} lb vs ${fitnessGoal.replace("_", " ")} → ${weightPart}`);
  } else if (fitnessGoal && weightDelta == null) {
    bodyExplain.push("Weight goal is set — need two weigh-ins to score the trend.");
  }

  const bodyScore = raw.body > 0 ? clampScore(average(bodyParts)) : null;
  if (raw.body > 0 && bodyScore == null && !bodyExplain.length) {
    bodyExplain.push("Log meals, lifts, or weight to score Body.");
  }

  const expenses = weekTxns.filter(t => t.type === "expense");
  const spent = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const monthlyBudget = (budgetCategories || [])
    .filter(c => c.type === "expense" && Number(c.budget_amount) > 0)
    .reduce((s, c) => s + Number(c.budget_amount), 0);
  const moneyExplain = [];
  let moneyScore = null;
  if (raw.money > 0 && monthlyBudget > 0 && weekTxns.length > 0) {
    const weeklyBudget = monthlyBudget * (7 / 30);
    moneyScore = spent <= weeklyBudget
      ? 100
      : closenessScore(weeklyBudget, spent);
    moneyExplain.push(
      spent <= weeklyBudget
        ? `$${Math.round(spent)} of ~$${Math.round(weeklyBudget)} weekly budget → 100`
        : `$${Math.round(spent)} vs ~$${Math.round(weeklyBudget)} weekly budget → ${moneyScore}`
    );
  } else if (raw.money > 0 && weekTxns.length > 0) {
    moneyExplain.push(`$${Math.round(spent)} logged this week — set a budget to score Money.`);
  } else if (raw.money > 0) {
    moneyExplain.push("No spend logged this week — Money stays hidden.");
  }

  const list = normalizeBooks(books.length ? books : user?.books);
  const bookMind = booksForMind(list, start, end);
  const mindDays = uniqueDays(weekMind).size;
  const pagesRead = weekMind.reduce((s, e) => s + (Number(e.pages_read) || 0), 0);
  const sitMinutes = weekMind.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0);
  const mindParts = [];
  const mindExplain = [];

  if (mindDays > 0) {
    const part = ratioScore(mindDays, Math.min(5, Math.max(3, elapsedDays)));
    mindParts.push(part);
    mindExplain.push(`Mind logged ${mindDays} day${mindDays === 1 ? "" : "s"} → ${part}`);
  }
  if (pagesRead > 0) {
    const part = clampScore(Math.min(100, pagesRead * 4));
    mindParts.push(part);
    mindExplain.push(`${pagesRead} pages read → ${part}`);
  }
  if (sitMinutes > 0) {
    const part = clampScore(Math.min(100, sitMinutes * 5));
    mindParts.push(part);
    mindExplain.push(`${sitMinutes} min sat → ${part}`);
  }
  if (bookMind.reading.length) {
    const avgProgress = average(bookMind.reading.map(b => Number(b.progress_pct)).filter(n => Number.isFinite(n)));
    const part = avgProgress != null ? clampScore(avgProgress) : 70;
    mindParts.push(part);
    mindExplain.push(
      avgProgress != null
        ? `Reading ${bookMind.reading.map(b => b.title).join(", ")} (${Math.round(avgProgress)}%) → ${part}`
        : `Reading ${bookMind.reading.map(b => b.title).join(", ")} → ${part}`
    );
  }
  if (bookMind.finishedThisWeek.length) {
    mindParts.push(100);
    mindExplain.push(`Finished ${bookMind.finishedThisWeek.map(b => b.title).join(", ")} → 100`);
  }
  const mindScore = raw.mind > 0 ? clampScore(average(mindParts)) : null;
  if (raw.mind > 0 && mindScore == null) {
    mindExplain.push("Log a journal, sit, or book to score Mind.");
  }

  const enabledLogDays = new Set();
  if (keys.includes("lifts")) {
    for (const d of liftActDays) enabledLogDays.add(d);
    for (const l of weekLogs) {
      const key = normalizeDateKey(l.created_date || l.date);
      if (key && key >= start && key <= end) enabledLogDays.add(key);
    }
  }
  if (keys.includes("nutrition")) {
    for (const d of mealDaySet) enabledLogDays.add(d);
  }
  if (keys.includes("mindfulness")) {
    for (const d of uniqueDays(weekMind)) enabledLogDays.add(d);
  }
  if (keys.includes("finance")) {
    for (const d of uniqueDays(weekTxns)) enabledLogDays.add(d);
  }
  for (const a of weekActs) {
    const key = normalizeDateKey(a.date);
    if (key) enabledLogDays.add(key);
  }

  const consistencyExplain = [];
  let consistencyScore = null;
  if (elapsedDays >= 2 && enabledLogDays.size > 0) {
    consistencyScore = ratioScore(enabledLogDays.size, elapsedDays);
    consistencyExplain.push(`${enabledLogDays.size} of ${elapsedDays} days this week have a log → ${consistencyScore}`);
  } else if (elapsedDays >= 2) {
    consistencyExplain.push("No logs yet this week — Consistency stays hidden.");
  } else {
    consistencyExplain.push("Need two days in the week before Consistency is scored.");
  }

  const pillars = {
    body: {
      label: "Body",
      score: raw.body > 0 ? bodyScore : null,
      weight: weights.body,
      explain: bodyExplain,
    },
    money: {
      label: "Money",
      score: raw.money > 0 ? moneyScore : null,
      weight: weights.money,
      explain: moneyExplain,
    },
    mind: {
      label: "Mind",
      score: raw.mind > 0 ? mindScore : null,
      weight: weights.mind,
      explain: mindExplain,
    },
    consistency: {
      label: "Consistency",
      score: consistencyScore,
      weight: weights.consistency,
      explain: consistencyExplain,
    },
  };

  let weighted = 0;
  let used = 0;
  for (const key of PILLAR_ORDER) {
    const p = pillars[key];
    if (p.score == null || !(p.weight > 0)) continue;
    weighted += p.score * p.weight;
    used += p.weight;
  }
  const total = used > 0 ? clampScore(weighted / used) : null;
  const scoredCount = PILLAR_ORDER.filter(k => pillars[k].score != null).length;

  return {
    total,
    sparse: total == null || scoredCount < 2,
    pillars,
    weights,
    period: { start, end, today: todayKey, elapsedDays },
    inputs: {
      sessions,
      mealDays,
      avgKcal: mealDays ? Math.round(avgKcal) : 0,
      avgProtein: mealDays ? Math.round(avgProtein) : 0,
      spent,
      mindDays,
      pagesRead,
      logDays: enabledLogDays.size,
    },
  };
}

export { PILLAR_ORDER };
