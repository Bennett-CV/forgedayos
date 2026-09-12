import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesizeWeek, formatWeekSectionLines, renderWeekSummaryMarkdown, weekHighlights } from "./weekSynthesis.js";

const WEEK = { weekStart: "2026-09-08", weekEnd: "2026-09-14" };

test("empty week hides every section", () => {
  const s = synthesizeWeek(WEEK);
  assert.equal(s.body.hasData, false);
  assert.equal(s.mind.hasData, false);
  assert.equal(s.money.hasData, false);
  const lines = formatWeekSectionLines(s);
  assert.deepEqual(lines.body, []);
  assert.deepEqual(lines.mind, []);
  assert.deepEqual(lines.money, []);
});

test("synthesizes body, mind, and money from existing logs", () => {
  const s = synthesizeWeek({
    ...WEEK,
    meals: [
      { date: "2026-09-08", calories: 2200, protein_g: 170 },
      { date: "2026-09-09", calories: 2400, protein_g: 190 },
    ],
    workoutLogs: [
      { week_start: "2026-09-08", day: 1, exercise: "Squat" },
      { week_start: "2026-09-08", day: 1, exercise: "Bench" },
      { week_start: "2026-09-08", day: 2, exercise: "Row" },
    ],
    journalEntries: [
      { date: "2026-09-08", type: "morning" },
      { date: "2026-09-10", type: "reading", pages_read: 22 },
    ],
    transactions: [
      { date: "2026-09-09", type: "expense", amount: 42 },
      { date: "2026-09-11", type: "income", amount: 100 },
    ],
    weightLogs: [
      { date: "2026-09-08", weight_lbs: 184 },
      { date: "2026-09-14", weight_lbs: 183.2 },
    ],
    nutritionGoals: { calories: 2400, protein_g: 180 },
  });

  assert.equal(s.body.hasData, true);
  assert.equal(s.body.sessions, 2);
  assert.equal(s.body.mealDays, 2);
  assert.equal(s.body.avgKcal, 2300);
  assert.equal(s.body.weightDelta, -0.8);
  assert.equal(s.mind.hasData, true);
  assert.equal(s.mind.counts.morning, 1);
  assert.equal(s.mind.pagesRead, 22);
  assert.equal(s.money.hasData, true);
  assert.equal(s.money.spent, 42);
  assert.equal(s.money.earned, 100);

  const md = renderWeekSummaryMarkdown(s, { win: "Showed up", change: "Sleep", next: "Three lifts" });
  assert.match(md, /Your Forgeday Week/);
  assert.match(md, /## Body/);
  assert.match(md, /## Mind/);
  assert.match(md, /## Money/);
  assert.match(md, /Went well: Showed up/);
  assert.ok(weekHighlights(s, { win: "Showed up" }).includes("Showed up"));
});

test("ignores logs outside the week", () => {
  const s = synthesizeWeek({
    ...WEEK,
    meals: [{ date: "2026-09-01", calories: 3000, protein_g: 200 }],
    journalEntries: [{ date: "2026-09-20", type: "morning" }],
    transactions: [{ date: "2026-08-30", type: "expense", amount: 9 }],
  });
  assert.equal(s.body.hasData, false);
  assert.equal(s.mind.hasData, false);
  assert.equal(s.money.hasData, false);
});
