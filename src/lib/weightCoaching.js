import { normalizeDateKey, localDaysAgoKey } from "./localDate.js";

function sortedLogs(logs) {
  return (logs || [])
    .map(l => ({
      key: normalizeDateKey(l.date),
      lbs: Number(l.weight_lbs),
    }))
    .filter(l => l.key && Number.isFinite(l.lbs) && l.lbs > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function nearestOnOrBefore(sorted, cutoff) {
  return [...sorted].reverse().find(l => l.key <= cutoff) || null;
}

function trendFromDelta(delta) {
  if (delta == null) return null;
  if (delta <= -0.3) return "down";
  if (delta >= 0.3) return "up";
  return "flat";
}

function signed(n) {
  if (!Number.isFinite(n)) return "0";
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

export function goalLabel(fitnessGoal) {
  if (fitnessGoal === "lose_weight") return "lose";
  if (fitnessGoal === "gain_muscle") return "gain";
  if (fitnessGoal === "maintain") return "maintain";
  return "";
}

/**
 * Short weight-trend call + a next action tied to lose / maintain / gain.
 * Sparse when fewer than two distinct weigh-in days.
 */
export function weightCoaching({
  logs = [],
  user,
  today,
} = {}) {
  const sorted = sortedLogs(logs);
  const distinctDays = new Set(sorted.map(l => l.key)).size;
  const latest = sorted[sorted.length - 1] || null;
  const weekCutoff = localDaysAgoKey(7, today || new Date());
  const monthCutoff = localDaysAgoKey(30, today || new Date());
  const weekAgo = latest ? nearestOnOrBefore(sorted, weekCutoff) : null;
  const monthAgo = latest ? nearestOnOrBefore(sorted, monthCutoff) : null;

  const delta7 = latest && weekAgo && weekAgo.key !== latest.key
    ? Number((latest.lbs - weekAgo.lbs).toFixed(1))
    : null;
  const delta30 = latest && monthAgo && monthAgo.key !== latest.key
    ? Number((latest.lbs - monthAgo.lbs).toFixed(1))
    : null;
  const firstToLast = sorted.length >= 2
    ? Number((sorted[sorted.length - 1].lbs - sorted[0].lbs).toFixed(1))
    : null;

  const primaryDelta = delta7 != null ? delta7 : delta30 != null ? delta30 : firstToLast;
  const windowLabel = delta7 != null ? "7 days" : delta30 != null ? "30 days" : "your logs";
  const trend = trendFromDelta(primaryDelta);
  const goal = user?.fitness_goal || null;
  const target = Number(user?.target_weight_lbs) > 0 ? Number(user.target_weight_lbs) : null;

  if (distinctDays < 2) {
    return {
      sparse: true,
      weighIns: distinctDays,
      latestLbs: latest?.lbs ?? null,
      delta7,
      delta30,
      trend: null,
      trendLabel: distinctDays === 1
        ? "One weigh-in so far. Log a second day to see the trend."
        : "No weigh-ins yet.",
      goal,
      onTrack: null,
      call: "",
      nextAction: {
        label: distinctDays === 1 ? "Log another weigh-in" : "Log your weight",
        href: "/nutrition?tab=weight",
      },
    };
  }

  const trendLabel = `${trend === "down" ? "Down" : trend === "up" ? "Up" : "Holding"} ${signed(primaryDelta)} lb over ${windowLabel}.`;

  let onTrack = null;
  let call = trendLabel;
  let nextAction = { label: "Keep logging weight", href: "/nutrition?tab=weight" };

  if (goal === "lose_weight") {
    onTrack = primaryDelta < 0;
    call = onTrack
      ? `Trending down — that matches lose${target ? ` (${target} lb)` : ""}.`
      : `Weight is ${trend === "up" ? "up" : "holding"}. Lose needs a slight weekly drop.`;
    nextAction = onTrack
      ? { label: "Keep hitting protein", href: "/nutrition" }
      : { label: "Hit protein today", href: "/nutrition" };
  } else if (goal === "gain_muscle") {
    onTrack = primaryDelta > 0;
    call = onTrack
      ? `Trending up — that matches gain${target ? ` (${target} lb)` : ""}.`
      : `Weight is ${trend === "down" ? "down" : "holding"}. Gain needs a slight weekly rise.`;
    nextAction = onTrack
      ? { label: "Keep the surplus honest", href: "/nutrition" }
      : { label: "Log a fuller meal", href: "/nutrition" };
  } else if (goal === "maintain") {
    onTrack = Math.abs(primaryDelta) <= 1;
    call = onTrack
      ? "Holding near even — that matches maintain."
      : `Moved ${signed(primaryDelta)} lb. Maintain likes a ±1 lb band.`;
    nextAction = onTrack
      ? { label: "Keep meals on target", href: "/nutrition" }
      : { label: "Check today's calories", href: "/nutrition" };
  } else {
    call = `${trendLabel} Set lose, maintain, or gain to get a next step.`;
    nextAction = { label: "Set a weight goal", href: "/nutrition?goals=1" };
  }

  return {
    sparse: false,
    weighIns: distinctDays,
    latestLbs: latest.lbs,
    delta7,
    delta30,
    trend,
    trendLabel,
    goal,
    onTrack,
    call,
    nextAction,
  };
}
