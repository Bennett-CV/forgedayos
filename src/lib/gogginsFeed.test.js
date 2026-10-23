import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGogginsFeed,
  parseGogginsFeedArgs,
  GOGGINS_FEED_SCHEMA_VERSION,
} from "./gogginsFeed.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const NOW = "2026-09-17"; // Thursday → week start Monday 2026-09-14

const FIXTURE_PROGRAM = [
  {
    day: 1,
    label: "Full Body A",
    type: "strength",
    exercises: [
      { name: "Goblet Squat", sets: 3, reps: 10 },
      { name: "Incline Dumbbell Bench Press", sets: 3, reps: 8 },
    ],
  },
  {
    day: 2,
    label: "Cardio",
    type: "cardio",
    exercises: [{ name: "Cardio", sets: 1, reps: null, isCardio: true }],
  },
];

const FIXTURE_WORKOUTS = [
  // Current week (2026-09-14)
  { week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 1, weight: 70, reps: 10, is_amrap: false },
  { week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 2, weight: 70, reps: 9, is_amrap: false },
  { week_start: "2026-09-14", day: 1, exercise: "Incline Dumbbell Bench Press", set_number: 1, weight: 55, reps: 8, is_amrap: false },
  // Prior week
  { week_start: "2026-09-07", day: 1, exercise: "Goblet Squat", set_number: 1, weight: 65, reps: 10, is_amrap: false },
  { week_start: "2026-09-07", day: 1, exercise: "Goblet Squat", set_number: 2, weight: 65, reps: 10, is_amrap: false },
  { week_start: "2026-09-07", day: 2, exercise: "Cardio", set_number: 1, weight: 3.2, reps: 32, notes: "run" },
  // Outside a 2-week window (before 2026-09-07 when weeks=2)
  { week_start: "2026-08-24", day: 1, exercise: "Goblet Squat", set_number: 1, weight: 80, reps: 5, is_amrap: false },
  // Empty auto-save noise
  { week_start: "2026-09-14", day: 1, exercise: "Goblet Squat", set_number: 3, weight: 0, reps: 0 },
];

const FIXTURE_WEIGHTS = [
  { date: "2026-08-20", weight_lbs: 188.0 },
  { date: "2026-09-03", weight_lbs: 186.2 },
  { date: "2026-09-10", weight_lbs: 185.0 },
  { date: "2026-09-17", weight_lbs: 183.6, notes: "morning" },
  // Outside 30d window when weightDays=14
  { date: "2026-07-01", weight_lbs: 192.0 },
];

/** Snapshot used in docs — keep shape stable. */
export const EXAMPLE_GOGGINS_FEED = buildGogginsFeed({
  program: FIXTURE_PROGRAM,
  workoutLogs: FIXTURE_WORKOUTS,
  weightLogs: FIXTURE_WEIGHTS,
  weeks: 10,
  weightDays: 90,
  now: NOW,
  generatedAt: "2026-09-17T12:00:00.000Z",
});

test("schema_version and generated_at are present", () => {
  const feed = buildGogginsFeed({ now: NOW, generatedAt: "2026-09-17T12:00:00.000Z" });
  assert.equal(feed.schema_version, GOGGINS_FEED_SCHEMA_VERSION);
  assert.equal(feed.generated_at, "2026-09-17T12:00:00.000Z");
  assert.equal(feed.window.current_week_start, "2026-09-14");
});

test("program summary preserves day templates", () => {
  const feed = buildGogginsFeed({
    program: FIXTURE_PROGRAM,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  assert.equal(feed.program.days.length, 2);
  assert.equal(feed.program.days[0].label, "Full Body A");
  assert.equal(feed.program.days[0].exercises[0].name, "Goblet Squat");
  assert.equal(feed.program.days[1].type, "cardio");
});

test("workouts group by week/day/exercise and drop empty sets", () => {
  const feed = buildGogginsFeed({
    workoutLogs: FIXTURE_WORKOUTS,
    weeks: 2,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  // weeks=2 → from 2026-09-07; August row excluded
  assert.equal(feed.window.week_start_from, "2026-09-07");
  assert.ok(!feed.workouts.some((w) => w.week_start === "2026-08-24"));

  const current = feed.workouts.find((w) => w.week_start === "2026-09-14" && w.day === 1);
  assert.ok(current);
  assert.equal(current.date, "2026-09-14");
  const squat = current.exercises.find((e) => e.name === "Goblet Squat");
  assert.equal(squat.sets.length, 2);
  assert.deepEqual(squat.sets[0], {
    set_number: 1,
    weight: 70,
    reps: 10,
    is_amrap: false,
    notes: null,
  });
});

test("body weight series respects weight_days window", () => {
  const feed = buildGogginsFeed({
    weightLogs: FIXTURE_WEIGHTS,
    weightDays: 14,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  assert.equal(feed.window.weight_from, "2026-09-03");
  assert.ok(!feed.body_weight.some((w) => w.date === "2026-07-01"));
  assert.ok(!feed.body_weight.some((w) => w.date === "2026-08-20"));
  assert.equal(feed.body_weight.at(-1).weight_lbs, 183.6);
  assert.equal(feed.body_weight.at(-1).notes, "morning");
});

test("derived stats: sessions this week, best sets, weight deltas", () => {
  const feed = buildGogginsFeed({
    program: FIXTURE_PROGRAM,
    workoutLogs: FIXTURE_WORKOUTS,
    weightLogs: FIXTURE_WEIGHTS,
    weeks: 10,
    weightDays: 90,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });

  // Current week has day 1 only with logged values
  assert.equal(feed.stats.sessions_this_week, 1);

  const squatBest = feed.stats.best_sets.find((b) => b.exercise === "Goblet Squat");
  // Best in 10-week window includes August 80×5
  assert.equal(squatBest.weight, 80);
  assert.equal(squatBest.reps, 5);

  assert.equal(feed.stats.latest_weight_lbs, 183.6);
  // 7d: nearest on/before 2026-09-10 → 185.0 → delta -1.4
  assert.equal(feed.stats.weight_delta_7d, -1.4);
  // 14d: nearest on/before 2026-09-03 → 186.2 → delta -2.6
  assert.equal(feed.stats.weight_delta_14d, -2.6);
  // 28d: nearest on/before 2026-08-20 → 188.0 → delta -4.4
  assert.equal(feed.stats.weight_delta_28d, -4.4);
});

test("empty inputs yield empty collections and null weight stats", () => {
  const feed = buildGogginsFeed({ now: NOW, generatedAt: "2026-09-17T12:00:00.000Z" });
  assert.deepEqual(feed.program.days, []);
  assert.deepEqual(feed.workouts, []);
  assert.deepEqual(feed.runs, []);
  assert.deepEqual(feed.body_weight, []);
  assert.equal(feed.stats.sessions_this_week, 0);
  assert.deepEqual(feed.stats.best_sets, []);
  assert.equal(feed.stats.latest_weight_lbs, null);
  assert.equal(feed.stats.weight_delta_7d, null);
});

test("parseGogginsFeedArgs clamps weeks and weight_days", () => {
  assert.deepEqual(parseGogginsFeedArgs({}), { weeks: 10, weightDays: 90 });
  assert.deepEqual(parseGogginsFeedArgs({ weeks: 2, weight_days: 30 }), { weeks: 2, weightDays: 30 });
  assert.deepEqual(parseGogginsFeedArgs({ weeks: 99, weightDays: 1 }), { weeks: 26, weightDays: 7 });
  assert.deepEqual(parseGogginsFeedArgs({ weeks: -3, weight_days: 999 }), { weeks: 1, weightDays: 365 });
});

test("example fixture matches documented shape keys", () => {
  const keys = Object.keys(EXAMPLE_GOGGINS_FEED).sort();
  assert.deepEqual(keys, [
    "body_weight",
    "generated_at",
    "program",
    "runs",
    "schema_version",
    "stats",
    "window",
    "workouts",
  ]);
  assert.equal(EXAMPLE_GOGGINS_FEED.schema_version, "1.1.0");
  assert.ok(EXAMPLE_GOGGINS_FEED.workouts.length >= 2);
  assert.ok(EXAMPLE_GOGGINS_FEED.stats.best_sets.length >= 1);
});

test("checked-in fixture matches the builder", () => {
  const file = JSON.parse(readFileSync(join(ROOT, "docs/fixtures/goggins-feed.example.json"), "utf8"));
  assert.deepEqual(file, EXAMPLE_GOGGINS_FEED);
});

test("deno mirror matches the app builder aside from the header", () => {
  const logic = (rel) => readFileSync(join(ROOT, rel), "utf8").replace(/\/\*[\s\S]*?\*\//, "").trim();
  assert.equal(
    logic("base44/functions/gogginsTrainingFeed/gogginsFeed.js"),
    logic("src/lib/gogginsFeed.js"),
  );
  assert.equal(
    readFileSync(join(ROOT, "base44/functions/gogginsTrainingFeed/trainingSheet.js"), "utf8"),
    readFileSync(join(ROOT, "src/lib/trainingSheet.js"), "utf8"),
  );
  assert.equal(
    readFileSync(join(ROOT, "base44/functions/syncTrainingSheet/trainingSheet.js"), "utf8"),
    readFileSync(join(ROOT, "src/lib/trainingSheet.js"), "utf8"),
  );
  assert.equal(
    readFileSync(join(ROOT, "base44/functions/syncTrainingSheet/googleTrainingSheet.js"), "utf8"),
    readFileSync(join(ROOT, "src/lib/googleTrainingSheet.js"), "utf8"),
  );
});

test("runs are dated and kept out of lift sets and best sets", () => {
  const feed = buildGogginsFeed({
    workoutLogs: [
      ...FIXTURE_WORKOUTS,
      {
        week_start: "2026-09-14",
        day: 2,
        exercise: "Cardio",
        set_number: 1,
        weight: 12,
        reps: 40,
        notes: "bike",
        created_date: "2026-09-16",
      },
      {
        week_start: "2026-09-07",
        day: 2,
        exercise: "Cardio",
        set_number: 1,
        weight: 2,
        reps: 20,
        notes: JSON.stringify({ type: "run", text: "easy 1234-5678-9012" }),
        date: "2026-09-09",
        created_date: "2026-09-10T00:00:00.000Z",
      },
    ],
    weeks: 10,
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });

  assert.ok(!feed.workouts.some((w) => w.exercises.some((e) => e.name === "Cardio" && e.sets.some((s) => s.notes === "run"))));
  const bike = feed.workouts.find((w) => w.week_start === "2026-09-14" && w.day === 2);
  assert.equal(bike.exercises[0].name, "Cardio");
  assert.equal(bike.date, "2026-09-16");
  assert.ok(!feed.stats.best_sets.some((b) => b.exercise === "Cardio"));

  const typed = feed.runs.find((r) => r.date === "2026-09-09");
  assert.deepEqual(typed, {
    date: "2026-09-09",
    distance: 2,
    time: 20,
    notes: "easy [redacted]",
  });
  const legacy = feed.runs.find((r) => r.distance === 3.2);
  assert.equal(legacy.date, "2026-09-07");
  assert.equal(legacy.time, 32);
  assert.equal(legacy.notes, null);

  const current = feed.workouts.find((w) => w.week_start === "2026-09-14" && w.day === 1);
  assert.equal(current.date, "2026-09-14");
  assert.equal(feed.stats.sessions_this_week, 2);
});

test("feed omits identity fields and redacts account-like numbers in notes", () => {
  const feed = buildGogginsFeed({
    workoutLogs: [{
      week_start: "2026-09-14",
      day: 1,
      exercise: "Squat",
      set_number: 1,
      weight: 100,
      reps: 5,
      notes: "acct 1234-5678-9012",
      created_by: "person@example.com",
      account_number: "123456789012",
    }],
    weightLogs: [{
      date: "2026-09-17",
      weight_lbs: 180,
      notes: "routing 021000021",
      created_by: "person@example.com",
    }],
    now: NOW,
    generatedAt: "2026-09-17T12:00:00.000Z",
  });
  const text = JSON.stringify(feed);
  assert.equal(text.includes("person@example.com"), false);
  assert.equal(text.includes("123456789012"), false);
  assert.equal(text.includes("1234-5678-9012"), false);
  assert.equal(text.includes("021000021"), false);
  assert.equal(text.includes("account_number"), false);
  assert.match(feed.workouts[0].exercises[0].sets[0].notes, /\[redacted\]/);
  assert.match(feed.body_weight[0].notes, /\[redacted\]/);
  assert.equal(feed.body_weight[0].date, "2026-09-17");
});
