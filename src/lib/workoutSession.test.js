import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lastSessionSets,
  formatLastSet,
  formatLastSessionLine,
  mergeLastIntoSets,
  mergeServerIntoSets,
  serverSetsFromLogs,
  isPendingSet,
  isUntouchedPrefill,
  mergeCardioDraft,
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
  assert.equal(merged[0].weightPrefilled, true);
  assert.equal(merged[0].repsPrefilled, true);
  assert.equal(merged[1].weight, "155");
  assert.equal(merged[1].reps, "");
  assert.equal(merged[2].id, "saved");
  assert.equal(merged[2].weight, "140");
});

const lastSession = [
  { exercise: "Squat", set_number: 1, weight: 135, reps: 8 },
  { exercise: "Squat", set_number: 2, weight: 145, reps: 6 },
];

test("mergeServerIntoSets prefills empty untouched sets and does not save them", () => {
  const server = serverSetsFromLogs(3, [], "Squat");
  const merged = mergeServerIntoSets([], server, lastSession);
  assert.equal(merged[0].weight, "135");
  assert.equal(merged[0].reps, "8");
  assert.equal(merged[0].id, null);
  assert.equal(merged[0].weightPrefilled, true);
  assert.equal(isUntouchedPrefill(merged[0]), true);
  assert.equal(isPendingSet(merged[0]), true);
  assert.equal(merged[1].weight, "145");
  assert.equal(merged[1].reps, "6");
  // No set 3 last time — do not copy set 2 into it.
  assert.equal(merged[2].weight, "");
  assert.equal(merged[2].reps, "");
  assert.equal(isPendingSet(merged[2]), false);
});

test("mergeServerIntoSets keeps typed fields when an earlier set is saved", () => {
  const server = serverSetsFromLogs(3, [
    { id: "s1", exercise: "Squat", set_number: 1, weight: 185, reps: 3 },
  ], "Squat");
  const local = mergeServerIntoSets([], serverSetsFromLogs(3, [], "Squat"), lastSession);
  local[1] = {
    ...local[1],
    weight: "200",
    weightTouched: true,
    weightPrefilled: false,
  };
  local[2] = {
    ...local[2],
    weight: "",
    reps: "",
    weightTouched: true,
    repsTouched: true,
    weightPrefilled: false,
    repsPrefilled: false,
  };

  const merged = mergeServerIntoSets(local, server, lastSession);

  assert.equal(merged[0].id, "s1");
  assert.equal(merged[0].weight, "185");
  assert.equal(merged[0].reps, "3");
  assert.equal(merged[0].weightPrefilled, false);
  assert.equal(merged[1].weight, "200");
  assert.equal(merged[1].weightTouched, true);
  assert.equal(merged[1].reps, "6");
  assert.equal(merged[1].repsPrefilled, true);
  assert.equal(merged[1].id, null);
  assert.equal(merged[2].weight, "");
  assert.equal(merged[2].reps, "");
  assert.equal(isPendingSet(merged[1]), true);
  assert.equal(isUntouchedPrefill(merged[1]), false);
});

test("mergeServerIntoSets keeps an explicit prefill when this refresh has no last session", () => {
  const local = [{
    id: null,
    weight: "135",
    reps: "8",
    weightTouched: false,
    repsTouched: false,
    weightPrefilled: true,
    repsPrefilled: true,
  }];
  const merged = mergeServerIntoSets(local, serverSetsFromLogs(1, [], "Squat"), []);
  assert.equal(merged[0].weight, "135");
  assert.equal(merged[0].reps, "8");
  assert.equal(merged[0].weightPrefilled, true);
  assert.equal(merged[0].id, null);
  assert.equal(isUntouchedPrefill(merged[0]), true);
});

test("mergeServerIntoSets keeps a row saved locally when the refresh is behind", () => {
  const local = [{
    id: "new",
    weight: "185",
    reps: "3",
    weightTouched: false,
    repsTouched: false,
    weightPrefilled: false,
    repsPrefilled: false,
  }];
  const server = serverSetsFromLogs(1, [], "Squat");
  const merged = mergeServerIntoSets(local, server, lastSession);
  assert.equal(merged[0].id, "new");
  assert.equal(merged[0].weight, "185");
  assert.equal(merged[0].reps, "3");
  assert.equal(merged[0].weightPrefilled, false);
  assert.equal(isPendingSet(merged[0]), false);
});

test("isPendingSet includes unsaved edits and skips saved untouched rows", () => {
  assert.equal(isPendingSet({ id: "a", weight: "135", reps: "8" }), false);
  assert.equal(isPendingSet({
    id: "a", weight: "140", reps: "8", weightTouched: true,
  }), true);
  assert.equal(isPendingSet({
    id: null, weight: "", reps: "", weightTouched: true, repsTouched: true,
  }), false);
});

test("mergeCardioDraft keeps typed fields and fills the rest from the server", () => {
  const local = {
    type: "bike",
    note: "easy",
    duration: "40",
    distance: "8",
    id: null,
    touched: { type: true, note: true, duration: true, distance: false },
  };
  const merged = mergeCardioDraft(local, {
    type: "run",
    note: "",
    duration: "20",
    distance: "3",
    id: "c1",
  });
  assert.equal(merged.type, "bike");
  assert.equal(merged.note, "easy");
  assert.equal(merged.duration, "40");
  assert.equal(merged.distance, "3");
  assert.equal(merged.id, "c1");

  const draft = mergeCardioDraft(
    { type: "", note: "", duration: "32", distance: "4", id: null, touched: {} },
    { type: "", note: "", duration: "", distance: "", id: null }
  );
  assert.equal(draft.duration, "32");
  assert.equal(draft.distance, "4");
  assert.equal(draft.id, null);
});

test("sessionProgress counts logged exercises", () => {
  const exercises = [{ name: "Squat" }, { name: "Row" }, { name: "Cardio", isCardio: true }];
  const week = [
    { exercise: "Squat", week_start: "2026-09-08", day: 1, weight: 145, reps: 6 },
    { exercise: "Cardio", week_start: "2026-09-08", day: 1, notes: "run", reps: 20 },
  ];
  assert.deepEqual(sessionProgress(exercises, week, "2026-09-08", 1), { done: 2, total: 3 });
});
