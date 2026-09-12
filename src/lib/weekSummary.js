import { format, parseISO } from "date-fns";

function asDay(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
}

function inRange(dateStr, start, end) {
  const d = asDay(dateStr);
  return d && d >= start && d <= end;
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function summarizeBody({
  weekStart,
  weekEnd,
  workoutLogs = [],
  meals = [],
  weights = [],
  goals = null,
} = {}) {
  const sessions = new Set();
  let sets = 0;
  for (const log of workoutLogs) {
    if (log.week_start && log.week_start >= weekStart && log.week_start <= weekEnd) {
      sessions.add(`${log.week_start}-${log.day}`);
      sets += 1;
      continue;
    }
    const loggedOn = asDay(log.created_date || log.date);
    if (inRange(loggedOn, weekStart, weekEnd)) {
      sessions.add(`${loggedOn}-${log.day || ""}`);
      sets += 1;
    }
  }

  const mealsInWeek = meals.filter(m => inRange(m.date, weekStart, weekEnd));
  const byDay = {};
  for (const m of mealsInWeek) {
    const d = asDay(m.date);
    if (!byDay[d]) byDay[d] = { calories: 0, protein_g: 0 };
    byDay[d].calories += Number(m.calories) || 0;
    byDay[d].protein_g += Number(m.protein_g) || 0;
  }
  const dayTotals = Object.values(byDay);
  const avgCalories = avg(dayTotals.map(d => d.calories));
  const avgProtein = avg(dayTotals.map(d => d.protein_g));

  const weekWeights = weights
    .filter(w => inRange(w.date, weekStart, weekEnd) && Number(w.weight_lbs) > 0)
    .slice()
    .sort((a, b) => asDay(a.date).localeCompare(asDay(b.date)));
  const firstWeight = weekWeights[0]?.weight_lbs ?? null;
  const lastWeight = weekWeights.length ? weekWeights[weekWeights.length - 1].weight_lbs : null;
  const weightDelta = firstWeight != null && lastWeight != null ? lastWeight - firstWeight : null;

  const hasData = sessions.size > 0 || dayTotals.length > 0 || weekWeights.length > 0;
  if (!hasData) return null;

  const lines = [];
  if (sessions.size) {
    lines.push(`${sessions.size} training day${sessions.size === 1 ? "" : "s"}${sets ? ` · ${sets} sets` : ""}`);
  }
  if (avgCalories != null) {
    const calGoal = Number(goals?.calories) > 0 ? ` / ${Math.round(goals.calories)}` : "";
    const proGoal = Number(goals?.protein_g) > 0 ? ` / ${Math.round(goals.protein_g)}g` : "g";
    lines.push(`${Math.round(avgCalories).toLocaleString()}${calGoal} kcal avg · ${Math.round(avgProtein || 0)}${proGoal} protein`);
    lines.push(`${dayTotals.length} day${dayTotals.length === 1 ? "" : "s"} of food logged`);
  }
  if (firstWeight != null && lastWeight != null) {
    const delta = lastWeight - firstWeight;
    const sign = delta > 0 ? "+" : "";
    lines.push(`${Number(firstWeight).toFixed(1)} → ${Number(lastWeight).toFixed(1)} lb (${sign}${delta.toFixed(1)})`);
  } else if (lastWeight != null) {
    lines.push(`${Number(lastWeight).toFixed(1)} lb`);
  }

  return {
    sessions: sessions.size,
    sets,
    mealDays: dayTotals.length,
    avgCalories,
    avgProtein,
    firstWeight,
    lastWeight,
    weightDelta,
    lines,
  };
}

export function summarizeMind({ weekStart, weekEnd, entries = [] } = {}) {
  const week = entries.filter(e => inRange(e.date, weekStart, weekEnd));
  if (!week.length) return null;
  const byType = { morning: 0, evening: 0, meditation: 0, reading: 0 };
  let minutes = 0;
  let pages = 0;
  const days = new Set();
  for (const e of week) {
    if (byType[e.type] != null) byType[e.type] += 1;
    minutes += Number(e.duration_minutes) || 0;
    pages += Number(e.pages_read) || 0;
    days.add(asDay(e.date));
  }
  const journals = byType.morning + byType.evening;
  const lines = [];
  if (journals) lines.push(`${journals} journal${journals === 1 ? "" : "s"}`);
  if (byType.meditation) {
    lines.push(minutes ? `${byType.meditation} sit${byType.meditation === 1 ? "" : "s"} · ${Math.round(minutes)} min` : `${byType.meditation} sit${byType.meditation === 1 ? "" : "s"}`);
  }
  if (byType.reading) {
    lines.push(pages ? `${byType.reading} reading · ${Math.round(pages)} pages` : `${byType.reading} reading`);
  }
  if (!lines.length) lines.push(`${week.length} mind item${week.length === 1 ? "" : "s"}`);

  return { count: week.length, days: days.size, journals, sits: byType.meditation, minutes, reading: byType.reading, pages, lines };
}

export function summarizeMoney({ weekStart, weekEnd, transactions = [] } = {}) {
  const week = transactions.filter(t => inRange(t.date, weekStart, weekEnd));
  if (!week.length) return null;
  const spent = week.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const income = week.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const lines = [`$${Math.round(spent).toLocaleString()} spent`];
  if (income > 0) lines.push(`$${Math.round(income).toLocaleString()} in`);
  return { spent, income, count: week.length, lines };
}

export function buildWeekDigest({
  weekStart,
  weekEnd,
  workoutLogs = [],
  meals = [],
  weights = [],
  journalEntries = [],
  transactions = [],
  goals = null,
} = {}) {
  const body = summarizeBody({ weekStart, weekEnd, workoutLogs, meals, weights, goals });
  const mind = summarizeMind({ weekStart, weekEnd, entries: journalEntries });
  const money = summarizeMoney({ weekStart, weekEnd, transactions });
  return {
    body,
    mind,
    money,
    hasAny: Boolean(body || mind || money),
  };
}

export function formatWeekRange(weekStart, weekEnd) {
  try {
    const start = typeof weekStart === "string" ? parseISO(weekStart) : weekStart;
    const end = typeof weekEnd === "string" ? parseISO(weekEnd) : weekEnd;
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  } catch {
    return `${weekStart} – ${weekEnd}`;
  }
}

export function digestToMarkdown(digest, answers = {}) {
  const parts = ["## Your Forgeday Week"];
  if (digest?.body?.lines?.length) {
    parts.push("", "### Body", ...digest.body.lines.map(l => `- ${l}`));
  }
  if (digest?.mind?.lines?.length) {
    parts.push("", "### Mind", ...digest.mind.lines.map(l => `- ${l}`));
  }
  if (digest?.money?.lines?.length) {
    parts.push("", "### Money", ...digest.money.lines.map(l => `- ${l}`));
  }
  if (answers.win) parts.push("", "### What went well", answers.win);
  if (answers.change) parts.push("", "### What to change", answers.change);
  if (answers.next) parts.push("", "### Focus next week", answers.next);
  return parts.join("\n").trim();
}
