import { daysSinceLastWeighIn } from "./healthImport.js";
import { normalizeDateKey } from "./localDate.js";

export const NUDGE_KINDS = {
  WEEKLY_REVIEW: "weekly_review",
  TODAY_NEXT: "today_next",
  STALE_WEIGH_IN: "stale_weigh_in",
};

export const DEFAULT_NOTIFICATION_PREFS = {
  weekly_review: true,
  today_next: true,
  stale_weigh_in: true,
  stale_days: 7,
};

export function normalizeNotificationPrefs(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const staleDays = Number(src.stale_days);
  return {
    weekly_review: src.weekly_review !== false,
    today_next: src.today_next !== false,
    stale_weigh_in: src.stale_weigh_in !== false,
    stale_days: [3, 7, 14].includes(staleDays) ? staleDays : 7,
  };
}

/**
 * Contextual nudges from existing logs. Pure — no I/O.
 * Softened: only fire today_next after 11:00 so mornings stay quiet.
 */
export function evaluateSmartNudges({
  snapshot,
  weightLogs = [],
  today,
  now = new Date(),
  prefs,
} = {}) {
  const p = normalizeNotificationPrefs(prefs);
  const hour = now instanceof Date ? now.getHours() : 12;
  const todayKey = normalizeDateKey(today);
  const nudges = [];

  if (p.weekly_review && snapshot?.reviewReady) {
    nudges.push({
      id: NUDGE_KINDS.WEEKLY_REVIEW,
      kind: NUDGE_KINDS.WEEKLY_REVIEW,
      title: "Weekly Review is ready",
      body: "Close the week while the logs are still fresh.",
      href: "/review",
      priority: 1,
    });
  }

  if (p.today_next && snapshot?.next && hour >= 11) {
    nudges.push({
      id: NUDGE_KINDS.TODAY_NEXT,
      kind: NUDGE_KINDS.TODAY_NEXT,
      title: snapshot.next.label,
      body: "Today still has an open next action.",
      href: snapshot.next.href || "/",
      priority: 2,
    });
  }

  if (p.stale_weigh_in && todayKey) {
    const days = daysSinceLastWeighIn(weightLogs, todayKey);
    const stale = days == null || days >= p.stale_days;
    if (stale) {
      nudges.push({
        id: NUDGE_KINDS.STALE_WEIGH_IN,
        kind: NUDGE_KINDS.STALE_WEIGH_IN,
        title: days == null ? "Log a first weigh-in" : "Weigh-in is stale",
        body: days == null
          ? "No weight logged yet. Add one on Food → Weight or import Health."
          : `Last weigh-in was ${days} days ago.`,
        href: "/nutrition?tab=weight",
        priority: 3,
      });
    }
  }

  return nudges.sort((a, b) => a.priority - b.priority);
}

export function pickPrimaryNudge(nudges) {
  return (nudges && nudges[0]) || null;
}

export function toLocalNotificationPayloads(nudges) {
  return (nudges || []).map(n => ({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.href,
  }));
}
