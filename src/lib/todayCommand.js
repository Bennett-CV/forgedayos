import { format, startOfWeek, getDay } from "date-fns";

export const TRACK_ORDER = ["lifts", "nutrition", "mindfulness", "finance"];

const DEFAULT_TRACKS = ["lifts", "nutrition", "mindfulness"];

export function todayKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function weekStartKey(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstNameOf(user) {
  const name = String(user?.full_name || "").trim();
  return name.split(/\s+/)[0] || "there";
}

function asDay(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
}

export function mealTotals(meals = []) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein_g: acc.protein_g + (Number(m.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(m.carbs_g) || 0),
      fat_g: acc.fat_g + (Number(m.fat_g) || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function enabledTracks(focusedPillars, { hasFinanceData = false } = {}) {
  const focused = (Array.isArray(focusedPillars) ? focusedPillars : []).filter(k =>
    TRACK_ORDER.includes(k)
  );
  const base = focused.length ? focused.filter(k => k !== "career") : [...DEFAULT_TRACKS];
  const tracks = TRACK_ORDER.filter(k => base.includes(k));
  if (hasFinanceData && !tracks.includes("finance")) tracks.push("finance");
  return tracks.filter(k => k !== "career");
}

export function todaysWorkoutLogs(workoutLogs = [], today = todayKey()) {
  return workoutLogs.filter(l => asDay(l.created_date) === today || asDay(l.date) === today);
}

export function trainedToday({ workoutLogs = [], activities = [], today = todayKey() } = {}) {
  if (todaysWorkoutLogs(workoutLogs, today).length > 0) return true;
  return activities.some(a => a.pillar === "lifts" && asDay(a.date) === today);
}

export function nextProgramDay(program = [], weekLogs = []) {
  const days = [...program].filter(Boolean).sort((a, b) => (a.day || 0) - (b.day || 0));
  if (!days.length) return null;
  const logged = new Set(weekLogs.map(l => l.day).filter(d => d != null));
  return days.find(d => !logged.has(d.day)) || days[0];
}

function hasGoal(n) {
  return n != null && Number(n) > 0;
}

export function nutritionStatus({ meals = [], goals = null } = {}) {
  const totals = mealTotals(meals);
  const logged = meals.length > 0;
  const calGoal = hasGoal(goals?.calories) ? Number(goals.calories) : null;
  const proGoal = hasGoal(goals?.protein_g) ? Number(goals.protein_g) : null;
  const hitCalories = calGoal != null && totals.calories >= calGoal * 0.9;
  const hitProtein = proGoal != null && totals.protein_g >= proGoal * 0.9;
  const complete = calGoal != null || proGoal != null
    ? Boolean((calGoal == null || hitCalories) && (proGoal == null || hitProtein) && logged)
    : logged;
  return { totals, logged, calGoal, proGoal, hitCalories, hitProtein, complete };
}

export function mindStatus({ entries = [], today = todayKey() } = {}) {
  const todayEntries = entries.filter(e => asDay(e.date) === today);
  const types = [...new Set(todayEntries.map(e => e.type).filter(Boolean))];
  return { count: todayEntries.length, types, complete: todayEntries.length > 0 };
}

export function spendStatus({ transactions = [], today = todayKey() } = {}) {
  const todayTxns = transactions.filter(t => asDay(t.date) === today && t.type === "expense");
  const amount = todayTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return { count: todayTxns.length, amount, complete: todayTxns.length > 0 };
}

function formatKcal(n) {
  return Math.round(n).toLocaleString();
}

function trackRow(key, { trainingDone, nutrition, mind, spend }) {
  if (key === "lifts") {
    return {
      key,
      label: "Training",
      detail: trainingDone ? "Session logged" : "Not yet",
      complete: trainingDone,
      href: "/lifts?view=log",
    };
  }
  if (key === "nutrition") {
    const { totals, logged, calGoal, proGoal } = nutrition;
    let detail = "Nothing logged";
    if (logged || totals.calories > 0) {
      const cal = calGoal != null
        ? `${formatKcal(totals.calories)} / ${formatKcal(calGoal)} kcal`
        : `${formatKcal(totals.calories)} kcal`;
      const pro = proGoal != null
        ? `${Math.round(totals.protein_g)} / ${Math.round(proGoal)}g protein`
        : `${Math.round(totals.protein_g)}g protein`;
      detail = `${cal} · ${pro}`;
    }
    return { key, label: "Nutrition", detail, complete: nutrition.complete, href: "/nutrition" };
  }
  if (key === "mindfulness") {
    const labels = { morning: "Morning", evening: "Evening", meditation: "Sit", reading: "Reading" };
    const detail = mind.count === 0
      ? "Nothing logged"
      : mind.types.map(t => labels[t] || t).join(" · ") || `${mind.count} item${mind.count === 1 ? "" : "s"}`;
    return { key, label: "Mind", detail, complete: mind.complete, href: "/mindfulness" };
  }
  return {
    key,
    label: "Spending",
    detail: spend.count ? `$${Math.round(spend.amount).toLocaleString()} logged` : "No spend today",
    complete: spend.complete,
    href: "/finance",
  };
}

export function pickNextAction({
  tracks = [],
  trainingDone,
  nutrition,
  mind,
  spend,
  programDay,
  hasProgram,
  weekHasData,
  reviewExists,
  weekday, // 0 Sun … 6 Sat
} = {}) {
  const enabled = new Set(tracks);

  if (enabled.has("lifts") && !trainingDone) {
    if (!hasProgram) {
      return { label: "Set up your training", href: "/lifts", hint: "Pick a starter split and start this week." };
    }
    const dayLabel = programDay?.label ? programDay.label.replace(/^day\s*\d+\s*/i, "").trim() : "";
    const dayNum = programDay?.day;
    return {
      label: dayLabel ? `Log ${dayLabel}` : "Log today's lift",
      href: dayNum ? `/lifts?view=log&day=${dayNum}` : "/lifts?view=log",
      hint: dayLabel ? `Day ${dayNum} is waiting.` : "A short session still counts.",
    };
  }

  if (enabled.has("nutrition") && !nutrition?.logged) {
    return { label: "Log a meal", href: "/nutrition?add=breakfast", hint: "Calories and protein start the day." };
  }

  if (enabled.has("nutrition") && nutrition?.logged && !nutrition.complete) {
    if (nutrition.proGoal != null && !nutrition.hitProtein) {
      return { label: "Add protein", href: "/nutrition?add=snack", hint: `${Math.max(0, Math.round(nutrition.proGoal - nutrition.totals.protein_g))}g left toward your target.` };
    }
    if (nutrition.calGoal != null && !nutrition.hitCalories) {
      return { label: "Finish logging food", href: "/nutrition?add=snack", hint: "You're short of today's calorie target." };
    }
  }

  if (enabled.has("mindfulness") && !mind?.complete) {
    return { label: "Log a mind item", href: "/mindfulness?compose=morning", hint: "Morning, sit, or a few pages." };
  }

  if (enabled.has("finance") && !spend?.complete) {
    return { label: "Log spending", href: "/finance", hint: "A single entry keeps the week honest." };
  }

  const lateWeek = weekday === 0 || weekday === 5 || weekday === 6;
  if (!reviewExists && (lateWeek || weekHasData)) {
    return { label: "Start weekly review", href: "/review", hint: "Close the loop while the week is still clear." };
  }

  return { label: "You're clear", href: "/review", hint: "Open last week's notes, or rest." };
}

export function pickInsight({
  trainingDone,
  nutrition,
  mind,
  reviewExists,
  weekday,
  weekSessions,
  weightDelta,
} = {}) {
  if (!reviewExists && (weekday === 0 || weekday === 6)) {
    return "The week is ready to close — a short review is the whole point.";
  }
  if (nutrition?.logged && nutrition.proGoal != null && nutrition.totals.protein_g < nutrition.proGoal * 0.45) {
    return `Protein is light so far (${Math.round(nutrition.totals.protein_g)}g of ${Math.round(nutrition.proGoal)}g).`;
  }
  if (typeof weekSessions === "number" && weekSessions >= 3 && trainingDone) {
    return `${weekSessions} training days this week.`;
  }
  if (typeof weightDelta === "number" && Math.abs(weightDelta) >= 0.8) {
    const dir = weightDelta < 0 ? "down" : "up";
    return `Weight is ${dir} ${Math.abs(weightDelta).toFixed(1)} lb this week.`;
  }
  if (mind?.complete && trainingDone && nutrition?.logged) {
    return "The loop is moving: log today, score later, review on Sunday.";
  }
  return null;
}

export function buildTodayCommand({
  user,
  now = new Date(),
  meals = [],
  goals = null,
  workoutLogs = [],
  weekWorkoutLogs = [],
  activities = [],
  journalEntries = [],
  transactions = [],
  program = [],
  hasFinanceData = false,
  reviewExists = false,
  weekHasData = false,
  weekSessions = 0,
  weightDelta = null,
} = {}) {
  const today = todayKey(now);
  const tracks = enabledTracks(user?.focused_pillars, { hasFinanceData });
  const trainingDone = trainedToday({ workoutLogs, activities, today });
  const nutrition = nutritionStatus({ meals, goals: goals || user?.nutrition_goals });
  const mind = mindStatus({ entries: journalEntries, today });
  const spend = spendStatus({ transactions, today });
  const programDay = nextProgramDay(program, weekWorkoutLogs);
  const weekday = getDay(now);

  const items = tracks.map(key => trackRow(key, { trainingDone, nutrition, mind, spend }));
  const completeCount = items.filter(i => i.complete).length;
  const next = pickNextAction({
    tracks,
    trainingDone,
    nutrition,
    mind,
    spend,
    programDay,
    hasProgram: program.length > 0,
    weekHasData,
    reviewExists,
    weekday,
  });
  const insight = pickInsight({
    trainingDone,
    nutrition,
    mind,
    reviewExists,
    weekday,
    weekSessions,
    weightDelta,
  });

  return {
    greeting: greetingForHour(now.getHours()),
    firstName: firstNameOf(user),
    dateLabel: format(now, "EEEE, MMMM d"),
    items,
    completeCount,
    totalCount: items.length,
    next,
    insight,
  };
}
