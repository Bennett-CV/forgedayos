import { daysSinceLastWeighIn, isHealthActivity, latestWeightLog } from "./healthImport.js";
import { isSameLocalDay, normalizeDateKey } from "./localDate.js";

export const WIDGET_KINDS = {
  TODAY_PROGRESS: "today_progress",
  NEXT_ACTION: "next_action",
  WEIGH_IN: "weigh_in",
  WEEKLY_REVIEW: "weekly_review",
  HEALTH_STEPS: "health_steps",
};

/**
 * Glance payloads that Today renders as widget-style cards.
 * Shape is stable so a later iOS WidgetKit extension can map the same ids.
 */
export function buildGlanceWidgets({
  snapshot,
  weightLogs = [],
  activities = [],
  today,
} = {}) {
  const widgets = [];
  const todayKey = normalizeDateKey(today);

  if (snapshot) {
    const { completeCount = 0, totalCount = 0, next, reviewReady } = snapshot;
    widgets.push({
      id: WIDGET_KINDS.TODAY_PROGRESS,
      kind: WIDGET_KINDS.TODAY_PROGRESS,
      title: "Today",
      value: totalCount ? `${completeCount} of ${totalCount}` : "—",
      subtitle: totalCount ? "complete" : "Nothing on the board",
      href: "/",
      empty: totalCount === 0,
    });

    widgets.push({
      id: WIDGET_KINDS.NEXT_ACTION,
      kind: WIDGET_KINDS.NEXT_ACTION,
      title: "Next",
      value: next?.label || "Quiet day",
      subtitle: next ? "Open the next action" : "That's the point",
      href: next?.href || "/",
      empty: !next,
    });

    widgets.push({
      id: WIDGET_KINDS.WEEKLY_REVIEW,
      kind: WIDGET_KINDS.WEEKLY_REVIEW,
      title: "Review",
      value: reviewReady ? "Ready" : "Later",
      subtitle: reviewReady ? "Close the week" : "Weekly Review",
      href: "/review",
      empty: !reviewReady,
    });
  }

  const latest = latestWeightLog(weightLogs);
  const days = daysSinceLastWeighIn(weightLogs, todayKey);
  widgets.push({
    id: WIDGET_KINDS.WEIGH_IN,
    kind: WIDGET_KINDS.WEIGH_IN,
    title: "Weight",
    value: latest ? `${latest.lbs} lb` : "No weigh-in",
    subtitle: latest
      ? (days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`)
      : "Log or import",
    href: "/nutrition?tab=weight",
    empty: !latest,
  });

  const stepRows = (activities || []).filter(
    a => isHealthActivity(a) && a.category === "steps" && isSameLocalDay(a.date, todayKey)
  );
  if (stepRows.length) {
    const steps = stepRows.reduce((s, a) => s + (Number(a.value) || 0), 0);
    widgets.push({
      id: WIDGET_KINDS.HEALTH_STEPS,
      kind: WIDGET_KINDS.HEALTH_STEPS,
      title: "Steps",
      value: Math.round(steps).toLocaleString(),
      subtitle: "Imported today",
      href: "/health",
      empty: false,
    });
  }

  return widgets;
}

export function iosWidgetMapping() {
  return {
    today_progress: "ForgedayTodayWidget",
    next_action: "ForgedayNextWidget",
    weigh_in: "ForgedayWeightWidget",
    weekly_review: "ForgedayReviewWidget",
    health_steps: "ForgedayStepsWidget",
  };
}
