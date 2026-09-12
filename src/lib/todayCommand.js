import { isSameLocalDay, normalizeDateKey } from "./localDate.js";

export const DAILY_KEYS = ["lifts", "nutrition", "mindfulness", "finance"];

const MIND_TYPES = ["morning", "evening", "meditation", "reading"];

/** Monday = 0 … Sunday = 6 */
export function mondayIndex(date) {
  const d = date instanceof Date ? date.getDay() : new Date(date).getDay();
  return d === 0 ? 6 : d - 1;
}

/** Which program days typically land on which weekdays. */
export function trainingWeekdays(programLength) {
  const maps = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  if (maps[programLength]) return maps[programLength];
  return Array.from({ length: Math.max(0, programLength) }, (_, i) => i);
}

export function suggestedProgramDay(programLength, weekdayMon0) {
  const days = trainingWeekdays(programLength);
  const idx = days.indexOf(weekdayMon0);
  return idx >= 0 ? idx + 1 : null;
}

export function enabledDailyKeys(user, { hasFinanceData = false } = {}) {
  const focused = Array.isArray(user?.focused_pillars)
    ? user.focused_pillars.filter(k => DAILY_KEYS.includes(k))
    : [];
  const keys = focused.length ? [...focused] : ["lifts", "nutrition", "mindfulness"];
  if (!focused.length && hasFinanceData && !keys.includes("finance")) {
    keys.push("finance");
  }
  return DAILY_KEYS.filter(k => keys.includes(k));
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

function trainedToday({ today, activities, workoutLogs }) {
  const liftActivity = (activities || []).some(
    a => a.pillar === "lifts" && isSameLocalDay(a.date, today)
  );
  if (liftActivity) return true;
  return (workoutLogs || []).some(l => isSameLocalDay(l.created_date || l.date, today));
}

function sessionsThisWeek(workoutLogs, weekStart) {
  const logs = (workoutLogs || []).filter(l => l.week_start === weekStart);
  return new Set(logs.map(l => l.day).filter(d => d >= 1)).size;
}

function mealHourHint(hour) {
  if (hour < 11) return { meal: "breakfast", label: "Log breakfast" };
  if (hour < 16) return { meal: "lunch", label: "Log lunch" };
  return { meal: "dinner", label: "Log dinner" };
}

function mindHint(hour, todayEntries) {
  if (hour >= 17 && !todayEntries.some(e => e.type === "evening")) {
    return { type: "evening", label: "Log evening pages" };
  }
  if (!todayEntries.some(e => e.type === "morning")) {
    return { type: "morning", label: "Log morning pages" };
  }
  if (!todayEntries.some(e => e.type === "reading")) {
    return { type: "reading", label: "Log reading" };
  }
  return { type: "meditation", label: "Log a sit" };
}

/**
 * Build today's command-center snapshot from existing logs.
 * Pure — no I/O — so Today stays calm and testable.
 */
export function buildTodaySnapshot({
  user,
  today,
  now = new Date(),
  meals = [],
  workoutLogs = [],
  workoutProgram = [],
  journalEntries = [],
  transactions = [],
  activities = [],
  reviews = [],
  weekStart,
  weekdayMon0,
} = {}) {
  const hour = now instanceof Date ? now.getHours() : 12;
  const weekday = weekdayMon0 == null ? mondayIndex(now) : weekdayMon0;
  const hasFinanceData = (transactions || []).length > 0
    || (Array.isArray(user?.focused_pillars) && user.focused_pillars.includes("finance"));
  const keys = enabledDailyKeys(user, { hasFinanceData });

  const todayMeals = (meals || []).filter(m => isSameLocalDay(m.date, today));
  const totals = mealTotals(todayMeals);
  const goals = user?.nutrition_goals || {};
  const calorieGoal = Number(goals.calories) > 0 ? Number(goals.calories) : 0;
  const proteinGoal = Number(goals.protein_g) > 0 ? Number(goals.protein_g) : 0;

  const todayMind = (journalEntries || []).filter(e => isSameLocalDay(e.date, today));
  const mindDone = MIND_TYPES.filter(t => todayMind.some(e => e.type === t));

  const todaySpend = (transactions || []).filter(t => isSameLocalDay(t.date, today));
  const spendTotal = todaySpend
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const programDays = [...new Set((workoutProgram || []).map(d => Number(d.day)).filter(d => d >= 1))];
  const programLength = programDays.length;
  const hasProgram = programLength > 0;
  const suggestedDay = hasProgram ? suggestedProgramDay(programLength, weekday) : null;
  const restDay = hasProgram && suggestedDay == null;
  const trained = trainedToday({ today, activities, workoutLogs });
  const weekSessions = sessionsThisWeek(workoutLogs, weekStart);

  const items = [];

  if (keys.includes("lifts")) {
    let complete = false;
    let detail = "No session yet";
    let href = "/lifts";
    if (!hasProgram) {
      detail = "No program yet";
      href = "/lifts";
    } else if (restDay) {
      complete = true;
      detail = "Rest day";
    } else if (trained) {
      complete = true;
      detail = suggestedDay ? `Day ${suggestedDay} logged` : "Session logged";
      href = `/lifts?view=log&day=${suggestedDay || programDays[0]}`;
    } else {
      detail = suggestedDay ? `Day ${suggestedDay} waiting` : "Session waiting";
      href = `/lifts?view=log&day=${suggestedDay || programDays[0]}`;
    }
    items.push({
      key: "lifts",
      label: "Training",
      complete,
      detail,
      href,
    });
  }

  if (keys.includes("nutrition")) {
    const logged = todayMeals.length > 0;
    const kcalPart = calorieGoal
      ? `${Math.round(totals.calories).toLocaleString()} / ${Math.round(calorieGoal).toLocaleString()} kcal`
      : logged
        ? `${Math.round(totals.calories).toLocaleString()} kcal`
        : "No meals yet";
    const proteinPart = proteinGoal
      ? `${Math.round(totals.protein_g)} / ${Math.round(proteinGoal)}g protein`
      : logged
        ? `${Math.round(totals.protein_g)}g protein`
        : "";
    const hint = mealHourHint(hour);
    items.push({
      key: "nutrition",
      label: "Nutrition",
      complete: logged,
      detail: [kcalPart, proteinPart].filter(Boolean).join(" · "),
      href: logged ? "/nutrition" : `/nutrition?add=${hint.meal}`,
    });
  }

  if (keys.includes("mindfulness")) {
    const complete = mindDone.length > 0;
    const detail = complete
      ? mindDone.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" · ")
      : "Nothing logged";
    const hint = mindHint(hour, todayMind);
    items.push({
      key: "mindfulness",
      label: "Mind",
      complete,
      detail,
      href: complete ? "/mindfulness" : `/mindfulness?compose=${hint.type}`,
    });
  }

  if (keys.includes("finance")) {
    const complete = todaySpend.length > 0;
    const detail = complete
      ? (spendTotal > 0 ? `$${Math.round(spendTotal)} logged` : "Logged today")
      : "No spend logged";
    items.push({
      key: "finance",
      label: "Spending",
      complete,
      detail,
      href: "/finance",
    });
  }

  const completeCount = items.filter(i => i.complete).length;
  const totalCount = items.length;

  const reviewThisWeek = (reviews || []).some(r => r.week_start === weekStart && r.summary);
  const lateWeek = weekday >= 4;
  const reviewReady = lateWeek && !reviewThisWeek;

  const next = pickNextAction({
    items,
    hasProgram,
    restDay,
    suggestedDay,
    hour,
    todayMind,
    reviewReady,
    allComplete: totalCount > 0 && completeCount === totalCount,
  });

  const insight = pickInsight({
    items,
    hour,
    weekdayMon0: weekday,
    proteinGoal,
    protein: totals.protein_g,
    mealsLogged: todayMeals.length,
    weekSessions,
    hasProgram,
    reviewReady,
    allComplete: totalCount > 0 && completeCount === totalCount,
  });

  return {
    items,
    completeCount,
    totalCount,
    next,
    insight,
    reviewReady,
  };
}

function pickNextAction({
  items,
  hasProgram,
  restDay,
  suggestedDay,
  hour,
  todayMind,
  reviewReady,
  allComplete,
}) {
  const lifts = items.find(i => i.key === "lifts");
  const nutrition = items.find(i => i.key === "nutrition");
  const mind = items.find(i => i.key === "mindfulness");
  const finance = items.find(i => i.key === "finance");

  if (lifts && !lifts.complete && !hasProgram) {
    return { label: "Set up a lifting program", href: "/lifts" };
  }
  if (lifts && !lifts.complete && !restDay) {
    return {
      label: suggestedDay ? `Log Day ${suggestedDay}` : "Log today's lift",
      href: lifts.href,
    };
  }
  if (nutrition && !nutrition.complete) {
    const hint = mealHourHint(hour);
    return { label: hint.label, href: nutrition.href };
  }
  if (mind && !mind.complete) {
    const hint = mindHint(hour, todayMind);
    return { label: hint.label, href: mind.href };
  }
  if (finance && !finance.complete) {
    return { label: "Log spending", href: "/finance" };
  }
  if (reviewReady) {
    return { label: "Start Weekly Review", href: "/review" };
  }
  if (allComplete) return null;
  return { label: "Open Weekly Review", href: "/review" };
}

export function pickInsight({
  items,
  hour,
  weekdayMon0 = 0,
  proteinGoal,
  protein,
  mealsLogged,
  weekSessions,
  hasProgram,
  reviewReady,
  allComplete,
}) {
  const nutrition = items.find(i => i.key === "nutrition");
  if (nutrition?.complete && proteinGoal > 0 && hour >= 14 && protein < proteinGoal * 0.55) {
    return `Protein is light — ${Math.round(protein)} of ${Math.round(proteinGoal)}g.`;
  }
  if (reviewReady && allComplete) {
    return "The week is ready to review.";
  }
  if (hasProgram && weekSessions === 0 && weekdayMon0 >= 3 && items.some(i => i.key === "lifts")) {
    return "No lifts logged this week yet.";
  }
  if (allComplete) {
    return "Quiet day. That's the point.";
  }
  if (!mealsLogged && hour >= 13 && nutrition) {
    return "Food log is still empty.";
  }
  return "";
}

export function inDateRange(value, startKey, endKey) {
  const key = normalizeDateKey(value);
  if (!key) return false;
  return key >= startKey && key <= endKey;
}
