import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mondayIndex,
  suggestedProgramDay,
  enabledDailyKeys,
  buildTodaySnapshot,
} from "./todayCommand.js";

test("weekday mapping and 3-day program days", () => {
  assert.equal(mondayIndex(new Date(2026, 8, 14)), 0); // Mon
  assert.equal(mondayIndex(new Date(2026, 8, 13)), 6); // Sun
  assert.equal(suggestedProgramDay(3, 0), 1);
  assert.equal(suggestedProgramDay(3, 2), 2);
  assert.equal(suggestedProgramDay(3, 4), 3);
  assert.equal(suggestedProgramDay(3, 1), null);
  assert.equal(suggestedProgramDay(5, 3), 4);
});

test("enabled daily keys follow focused pillars and show spending when present", () => {
  assert.deepEqual(enabledDailyKeys({}), ["lifts", "nutrition", "mindfulness"]);
  assert.deepEqual(
    enabledDailyKeys({ focused_pillars: ["lifts", "nutrition"] }),
    ["lifts", "nutrition"]
  );
  assert.deepEqual(
    enabledDailyKeys({ focused_pillars: ["finance"] }, { hasFinanceData: true }),
    ["finance"]
  );
  assert.ok(enabledDailyKeys({}, { hasFinanceData: true }).includes("finance"));
});

test("snapshot: empty morning asks for the next action", () => {
  const snap = buildTodaySnapshot({
    user: { focused_pillars: ["lifts", "nutrition", "mindfulness"], nutrition_goals: { calories: 2400, protein_g: 180 } },
    today: "2026-09-14",
    now: new Date(2026, 8, 14, 8, 0, 0),
    weekStart: "2026-09-14",
    weekdayMon0: 0,
    workoutProgram: [{ day: 1 }, { day: 2 }, { day: 3 }],
  });
  assert.equal(snap.completeCount, 0);
  assert.equal(snap.totalCount, 3);
  assert.equal(snap.next.label, "Log Day 1");
  assert.equal(snap.items.find(i => i.key === "nutrition").detail.includes("0 / 2,400"), true);
});

test("snapshot: rest day counts training complete and next is food", () => {
  const snap = buildTodaySnapshot({
    user: { focused_pillars: ["lifts", "nutrition"] },
    today: "2026-09-15",
    now: new Date(2026, 8, 15, 9, 0, 0),
    weekStart: "2026-09-14",
    weekdayMon0: 1, // Tue, rest on 3-day
    workoutProgram: [{ day: 1 }, { day: 2 }, { day: 3 }],
  });
  const training = snap.items.find(i => i.key === "lifts");
  assert.equal(training.complete, true);
  assert.equal(training.detail, "Rest day");
  assert.equal(snap.next.label, "Log breakfast");
});

test("snapshot: logged day produces X of Y and protein insight", () => {
  const snap = buildTodaySnapshot({
    user: {
      focused_pillars: ["lifts", "nutrition", "mindfulness"],
      nutrition_goals: { calories: 2400, protein_g: 180 },
    },
    today: "2026-09-14",
    now: new Date(2026, 8, 14, 16, 0, 0),
    weekStart: "2026-09-14",
    weekdayMon0: 0,
    workoutProgram: [{ day: 1 }, { day: 2 }, { day: 3 }],
    meals: [{ date: "2026-09-14", calories: 900, protein_g: 40 }],
    activities: [{ pillar: "lifts", date: "2026-09-14" }],
    journalEntries: [{ date: "2026-09-14", type: "morning" }],
  });
  assert.equal(snap.completeCount, 3);
  assert.equal(snap.totalCount, 3);
  assert.match(snap.insight, /Protein is light/);
  assert.equal(snap.next, null);
});

test("snapshot: spending appears when transactions exist", () => {
  const snap = buildTodaySnapshot({
    user: {},
    today: "2026-09-14",
    now: new Date(2026, 8, 14, 10, 0, 0),
    weekStart: "2026-09-14",
    weekdayMon0: 0,
    transactions: [{ date: "2026-09-10", type: "expense", amount: 12 }],
  });
  assert.ok(snap.items.some(i => i.key === "finance"));
  assert.equal(snap.items.find(i => i.key === "finance").complete, false);
});
