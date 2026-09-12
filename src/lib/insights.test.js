import { test } from "node:test";
import assert from "node:assert/strict";
import { generateInsights } from "./insights.js";

const WEEK = { weekStart: "2026-09-08", weekEnd: "2026-09-14" };

test("hides insights when logs are sparse", () => {
  assert.deepEqual(generateInsights({ ...WEEK }), []);
  assert.deepEqual(generateInsights({
    ...WEEK,
    meals: [{ date: "2026-09-08", protein_g: 40 }],
    workoutLogs: [{ week_start: "2026-09-08", day: 1 }],
  }), []);
});

test("training vs spend only when both sides have real volume", () => {
  const rows = generateInsights({
    ...WEEK,
    workoutLogs: [
      { week_start: "2026-09-08", day: 1 },
      { week_start: "2026-09-08", day: 2 },
    ],
    transactions: [
      { date: "2026-09-08", type: "expense", amount: 12 },
      { date: "2026-09-09", type: "expense", amount: 30 },
      { date: "2026-09-10", type: "expense", amount: 18 },
    ],
  });
  assert.equal(rows[0].id, "training_vs_spend");
  assert.match(rows[0].text, /2 training days/);
  assert.match(rows[0].text, /\$60/);
});

test("protein vs weight needs meal days, a protein goal, and a real delta", () => {
  const none = generateInsights({
    ...WEEK,
    user: { nutrition_goals: { protein_g: 180 } },
    meals: [
      { date: "2026-09-08", protein_g: 160 },
      { date: "2026-09-09", protein_g: 170 },
    ],
    weightLogs: [
      { date: "2026-09-08", weight_lbs: 184 },
      { date: "2026-09-14", weight_lbs: 183 },
    ],
  });
  assert.equal(none.some(r => r.id === "protein_vs_weight"), false);

  const hit = generateInsights({
    ...WEEK,
    user: { nutrition_goals: { protein_g: 180 } },
    meals: [
      { date: "2026-09-08", protein_g: 160 },
      { date: "2026-09-09", protein_g: 170 },
      { date: "2026-09-10", protein_g: 180 },
    ],
    weightLogs: [
      { date: "2026-09-08", weight_lbs: 184 },
      { date: "2026-09-14", weight_lbs: 183 },
    ],
  });
  const row = hit.find(r => r.id === "protein_vs_weight");
  assert.ok(row);
  assert.match(row.text, /170 \/ 180g/);
  assert.match(row.text, /-1 lb/);
});

test("caps at three and can mention a structured book", () => {
  const rows = generateInsights({
    ...WEEK,
    max: 3,
    workoutLogs: [
      { week_start: "2026-09-08", day: 1 },
      { week_start: "2026-09-08", day: 2 },
    ],
    transactions: [
      { date: "2026-09-08", type: "expense", amount: 10 },
      { date: "2026-09-09", type: "expense", amount: 10 },
      { date: "2026-09-10", type: "expense", amount: 10 },
    ],
    meals: [
      { date: "2026-09-08", protein_g: 180 },
      { date: "2026-09-09", protein_g: 180 },
      { date: "2026-09-10", protein_g: 180 },
    ],
    weightLogs: [
      { date: "2026-09-08", weight_lbs: 180 },
      { date: "2026-09-14", weight_lbs: 179 },
    ],
    user: { nutrition_goals: { protein_g: 180 } },
    books: [{ id: "1", title: "Deep Work", status: "reading" }],
  });
  assert.ok(rows.length <= 3);
  assert.ok(rows.some(r => r.id === "mind_and_training"));
  assert.match(rows.find(r => r.id === "mind_and_training").text, /Deep Work/);
});
