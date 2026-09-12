import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSmartNudges,
  pickPrimaryNudge,
  normalizeNotificationPrefs,
  toLocalNotificationPayloads,
} from "./smartNotifications.js";
import {
  detectNotificationCapability,
  shouldShowInAppNudge,
  shouldFireLocalHook,
  dismissNudge,
  markNudgeFired,
} from "./notificationBridge.js";

const snapshot = {
  reviewReady: true,
  next: { label: "Log dinner", href: "/nutrition?add=dinner" },
};

test("normalize prefs fills defaults and clamps stale days", () => {
  assert.deepEqual(normalizeNotificationPrefs(null), {
    weekly_review: true,
    today_next: true,
    stale_weigh_in: true,
    stale_days: 7,
  });
  assert.equal(normalizeNotificationPrefs({ weekly_review: false, stale_days: 99 }).stale_days, 7);
  assert.equal(normalizeNotificationPrefs({ stale_days: 3 }).stale_days, 3);
});

test("review nudge wins when the week is ready", () => {
  const nudges = evaluateSmartNudges({
    snapshot,
    weightLogs: [{ date: "2026-09-12", weight_lbs: 180 }],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 16, 0, 0),
  });
  assert.equal(pickPrimaryNudge(nudges).kind, "weekly_review");
  assert.equal(toLocalNotificationPayloads(nudges)[0].url, "/review");
});

test("today next waits until 11:00", () => {
  const morning = evaluateSmartNudges({
    snapshot: { ...snapshot, reviewReady: false },
    weightLogs: [{ date: "2026-09-12", weight_lbs: 180 }],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 8, 0, 0),
  });
  assert.equal(morning.some(n => n.kind === "today_next"), false);

  const afternoon = evaluateSmartNudges({
    snapshot: { ...snapshot, reviewReady: false },
    weightLogs: [{ date: "2026-09-12", weight_lbs: 180 }],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 13, 0, 0),
  });
  assert.equal(afternoon[0].kind, "today_next");
  assert.equal(afternoon[0].title, "Log dinner");
});

test("stale weigh-in after the preferred gap, including never logged", () => {
  const stale = evaluateSmartNudges({
    snapshot: { reviewReady: false, next: null },
    weightLogs: [{ date: "2026-09-01", weight_lbs: 180 }],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 10, 0, 0),
    prefs: { stale_days: 7 },
  });
  assert.equal(stale[0].kind, "stale_weigh_in");
  assert.match(stale[0].body, /11 days/);

  const never = evaluateSmartNudges({
    snapshot: { reviewReady: false, next: null },
    weightLogs: [],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 10, 0, 0),
  });
  assert.equal(never[0].title, "Log a first weigh-in");
});

test("prefs can silence every nudge", () => {
  const nudges = evaluateSmartNudges({
    snapshot,
    weightLogs: [],
    today: "2026-09-12",
    now: new Date(2026, 8, 12, 16, 0, 0),
    prefs: { weekly_review: false, today_next: false, stale_weigh_in: false },
  });
  assert.deepEqual(nudges, []);
});

test("in-app dismiss and local-hook cooldown are per day", () => {
  const nudge = { id: "weekly_review" };
  const storage = new Map();
  const mem = {
    getItem: k => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, v),
  };
  assert.equal(shouldShowInAppNudge(nudge, { today: "2026-09-12", dismissed: {} }), true);
  const dismissed = dismissNudge("weekly_review", "2026-09-12", mem);
  assert.equal(shouldShowInAppNudge(nudge, { today: "2026-09-12", dismissed }), false);
  assert.equal(shouldShowInAppNudge(nudge, { today: "2026-09-13", dismissed }), true);

  assert.equal(shouldFireLocalHook(nudge, { today: "2026-09-12", lastFired: {} }), true);
  const fired = markNudgeFired("weekly_review", "2026-09-12", mem);
  assert.equal(shouldFireLocalHook(nudge, { today: "2026-09-12", lastFired: fired }), false);
});

test("notification capability is in-app when Notification is missing", () => {
  const cap = detectNotificationCapability({});
  assert.equal(cap.mode, "in-app-only");
  assert.equal(cap.permission, "unsupported");
});
