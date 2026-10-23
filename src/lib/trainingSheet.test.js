import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRAINING_HISTORY_LIMITS,
  TRAINING_SHEET_MAX_PAGES,
  TRAINING_SHEET_PAGE_SIZE,
  buildTrainingSheet,
  pageThrough,
} from "./trainingSheet.js";

const LOGS = [
  { id: "s2", week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 2, weight: 70, reps: 9 },
  { id: "s1", week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 1, weight: 70, reps: 10, date: "2026-09-15" },
  { id: "run", week_start: "2026-09-07", day: 2, exercise: "Cardio", set_number: 1, weight: 3.2, reps: 32, notes: "run" },
  { id: "run2", week_start: "2026-09-07", day: 2, exercise: "Cardio", set_number: 1, weight: 3.2, reps: 32, notes: "run" },
  { id: "bike", week_start: "2026-09-14", day: 2, exercise: "Cardio", set_number: 1, weight: 12, reps: 40, notes: "bike" },
  { id: "empty", week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 3, weight: 0, reps: 0 },
  { id: "bw", week_start: "2026-08-24", created_date: "2026-08-25", exercise: "Pull-up", set_number: 1, weight: 0, reps: 8 },
  {
    id: "note-run",
    week_start: "2026-08-17",
    exercise: "Running",
    set_number: 1,
    weight: 0,
    reps: 0,
    notes: JSON.stringify({ type: "run", text: "acct 1234-5678-9012" }),
  },
];

test("full history splits lifts and runs and stays stable when reordered", () => {
  const first = buildTrainingSheet(LOGS);
  const second = buildTrainingSheet([...LOGS].reverse());
  assert.deepEqual(second.liftValues, first.liftValues);
  assert.deepEqual(second.runValues, first.runValues);

  assert.deepEqual(first.liftValues[0], ["date", "exercise", "set number", "reps", "weight", "notes"]);
  assert.deepEqual(first.runValues[0], ["date", "distance", "time", "notes"]);
  assert.deepEqual(first.lifts, [
    { date: "2026-08-25", exercise: "Pull-up", set_number: 1, reps: 8, weight: 0, notes: "" },
    { date: "2026-09-14", exercise: "Goblet Squat", set_number: 2, reps: 9, weight: 70, notes: "" },
    { date: "2026-09-15", exercise: "Goblet Squat", set_number: 1, reps: 10, weight: 70, notes: "" },
  ]);
  assert.deepEqual(first.runs, [
    { date: "2026-08-17", distance: "", time: "", notes: "acct [redacted]" },
    { date: "2026-09-07", distance: 3.2, time: 32, notes: "" },
    { date: "2026-09-07", distance: 3.2, time: 32, notes: "" },
  ]);
  assert.equal(first.history.earliest_date, "2026-08-17");
  assert.equal(first.history.latest_date, "2026-09-15");
  assert.equal(first.history.truncated, false);
  assert.ok(first.history.lifts_missing_notes >= 1);
  assert.ok(first.history.runs_missing_freeform_notes >= 1);
  assert.ok(first.history.runs_missing_distance >= 1);
});

test("a past week logged later keeps the program Monday, not the typing day", () => {
  const sheet = buildTrainingSheet([
    {
      id: "late",
      week_start: "2026-08-03",
      created_date: "2026-09-16",
      exercise: "Row",
      set_number: 1,
      weight: 50,
      reps: 8,
    },
    {
      id: "same-week",
      week_start: "2026-09-14",
      created_date: "2026-09-16",
      exercise: "Row",
      set_number: 1,
      weight: 50,
      reps: 8,
    },
  ]);
  assert.equal(sheet.lifts[0].date, "2026-08-03");
  assert.equal(sheet.lifts[1].date, "2026-09-16");
});

test("duplicate ids collapse so a repeated page cannot add a second row", () => {
  const once = buildTrainingSheet(LOGS);
  const twice = buildTrainingSheet([...LOGS, ...LOGS]);
  assert.deepEqual(twice.lifts, once.lifts);
  assert.deepEqual(twice.runs, once.runs);
});

test("history limits name the fields older logs lack", () => {
  const text = TRAINING_HISTORY_LIMITS.join(" ");
  assert.match(text, /earliest_date/);
  assert.match(text, /created_date/);
  assert.match(text, /week_start/);
  assert.match(text, /notes/);
  assert.match(text, /weight \(miles\)/);
  assert.match(text, /reps \(minutes\)/);
  assert.match(text, /WorkoutProgram/);
  assert.match(text, /truncated/);
  assert.equal(TRAINING_SHEET_PAGE_SIZE * TRAINING_SHEET_MAX_PAGES, 100000);
});

test("pageThrough walks every short page and flags a full cap", async () => {
  const all = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
    { id: "e" },
  ];
  const complete = await pageThrough(
    (pageSize, skip) => all.slice(skip, skip + pageSize),
    { pageSize: 2, maxPages: 10 }
  );
  assert.equal(complete.truncated, false);
  assert.equal(complete.pages, 3);
  assert.deepEqual(complete.rows, all);

  const capped = await pageThrough(
    (pageSize, skip) => all.slice(skip, skip + pageSize),
    { pageSize: 2, maxPages: 2 }
  );
  assert.equal(capped.truncated, true);
  assert.equal(capped.pages, 2);
  assert.equal(capped.rows.length, 4);

  const sheet = buildTrainingSheet(LOGS, { truncated: true });
  assert.equal(sheet.history.truncated, true);
});
