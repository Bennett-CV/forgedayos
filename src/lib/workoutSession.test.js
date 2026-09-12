import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lastSessionSets,
  formatLastSet,
  formatLastSessionLine,
  mergeLastIntoSets,
  sessionProgress,
} from "./workoutSession.js";

const logs = [
  { exercise: "Squat", week_start: "2026-09-01", day: 1, set_number: 1, weight: 135, reps: 8 },
  { exercise: "Squat", week_start: "2026-09-01", day: 1, set_number: 2, weight: 135, reps: 8 },
  { exercise: "Squat", week_start: "2026-09-08", day: 1, set_number: 1, weight: 145, reps: 6 },
  { exercise: "Bench", week_start: "2026-09-08", day: 1, set_number: 1, weight: 0, reps: 0 },
];

test("lastSessionSets skips the current week and empty sets", () => {
  const last = lastSessionSets(logs, "Squat", { excludeWeek: "2026-09-08" });
  assert.equal(last.length, 2);
  assert.equal(last[0].weight, 135);
  assert.equal(lastSessionSets(logs, "Bench", { excludeWeek: "2026-09-08" }).length, 0);
});

test("formatLastSet and session line", () => {
  assert.equal(formatLastSet({ weight: 135, reps: 8 }), "135×8");
  assert.equal(formatLastSet({ weight: 135, reps: 0 }), "135");
  assert.equal(formatLastSessionLine([
    { weight: 135, reps: 8 },
    { weight: 135, reps: 8 },
  ]), "135×8 ×2");
});

test("mergeLastIntoSets fills empties only", () => {
  const last = lastSessionSets(logs, "Squat", { excludeWeek: "2026-09-08" });
  const merged = mergeLastIntoSets(
    [
      { weight: "", reps: "", id: null },
      { weight: "155", reps: "", id: null },
      { id: "saved", weight: "140", reps: "5" },
    ],
    last
  );
  assert.equal(merged[0].weight, "135");
  assert.equal(merged[0].reps, "8");
  assert.equal(merged[1].weight, "155");
  assert.equal(merged[2].id, "saved");
});

test("sessionProgress counts logged exercises", () => {
  const exercises = [{ name: "Squat" }, { name: "Row" }, { name: "Cardio", isCardio: true }];
  const week = [
    { exercise: "Squat", week_start: "2026-09-08", day: 1, weight: 145, reps: 6 },
    { exercise: "Cardio", week_start: "2026-09-08", day: 1, notes: "run", reps: 20 },
  ];
  assert.deepEqual(sessionProgress(exercises, week, "2026-09-08", 1), { done: 2, total: 3 });
});
