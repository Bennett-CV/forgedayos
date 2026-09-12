import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGlanceWidgets, WIDGET_KINDS } from "./glanceWidgets.js";

const snapshot = {
  completeCount: 1,
  totalCount: 3,
  next: { label: "Log lunch", href: "/nutrition?add=lunch" },
  reviewReady: true,
};

test("builds today, next, review, and weight cards", () => {
  const widgets = buildGlanceWidgets({
    snapshot,
    weightLogs: [{ date: "2026-09-10", weight_lbs: 183.2 }],
    today: "2026-09-12",
  });
  const byId = Object.fromEntries(widgets.map(w => [w.id, w]));
  assert.equal(byId[WIDGET_KINDS.TODAY_PROGRESS].value, "1 of 3");
  assert.equal(byId[WIDGET_KINDS.NEXT_ACTION].value, "Log lunch");
  assert.equal(byId[WIDGET_KINDS.WEEKLY_REVIEW].value, "Ready");
  assert.equal(byId[WIDGET_KINDS.WEIGH_IN].value, "183.2 lb");
  assert.equal(byId[WIDGET_KINDS.WEIGH_IN].subtitle, "2 days ago");
  assert.equal(byId[WIDGET_KINDS.HEALTH_STEPS], undefined);
});

test("empty weight and quiet next stay visible; steps stay hidden until imported", () => {
  const widgets = buildGlanceWidgets({
    snapshot: { completeCount: 3, totalCount: 3, next: null, reviewReady: false },
    weightLogs: [],
    today: "2026-09-12",
  });
  const weight = widgets.find(w => w.id === WIDGET_KINDS.WEIGH_IN);
  const next = widgets.find(w => w.id === WIDGET_KINDS.NEXT_ACTION);
  const steps = widgets.find(w => w.id === WIDGET_KINDS.HEALTH_STEPS);
  assert.equal(weight.empty, true);
  assert.equal(weight.value, "No weigh-in");
  assert.equal(next.value, "Quiet day");
  assert.equal(steps, undefined);
});

test("today's imported steps appear as a glance card", () => {
  const widgets = buildGlanceWidgets({
    snapshot,
    today: "2026-09-12",
    activities: [
      { date: "2026-09-12", category: "steps", value: 4200, notes: "[health]" },
      { date: "2026-09-12", category: "steps", value: 800, notes: "[health]" },
      { date: "2026-09-11", category: "steps", value: 9999, notes: "[health]" },
    ],
  });
  const steps = widgets.find(w => w.id === WIDGET_KINDS.HEALTH_STEPS);
  assert.equal(steps.value, "5,000");
});
