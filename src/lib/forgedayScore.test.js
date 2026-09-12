import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampScore,
  ratioScore,
  closenessScore,
  daysInclusive,
  pillarWeights,
  weightDirectionScore,
  computeForgedayScore,
} from "./forgedayScore.js";

test("score helpers stay in 0–100 and skip bad inputs", () => {
  assert.equal(clampScore(140), 100);
  assert.equal(clampScore(-4), 0);
  assert.equal(ratioScore(90, 180), 50);
  assert.equal(ratioScore(90, 0), null);
  assert.equal(closenessScore(2400, 2400), 100);
  assert.equal(closenessScore(1200, 2400), 50);
  assert.equal(daysInclusive("2026-09-08", "2026-09-14"), 7);
});

test("pillar weights follow enabled goals and always include consistency", () => {
  const all = pillarWeights({ focused_pillars: ["lifts", "nutrition", "mindfulness", "finance"] });
  assert.ok(all.raw.body > 0);
  assert.ok(all.raw.money > 0);
  assert.ok(all.raw.mind > 0);
  assert.ok(all.raw.consistency > 0);
  const sum = Object.values(all.weights).reduce((s, n) => s + n, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);

  const bodyOnly = pillarWeights({ focused_pillars: ["lifts"] });
  assert.ok(bodyOnly.raw.body > 0);
  assert.equal(bodyOnly.raw.money, 0);
  assert.equal(bodyOnly.raw.mind, 0);
});

test("weight direction uses the stated lose / gain / maintain goal", () => {
  assert.equal(weightDirectionScore(-1.2, "lose_weight"), 90);
  assert.equal(weightDirectionScore(1.2, "lose_weight"), 35);
  assert.equal(weightDirectionScore(1.0, "gain_muscle"), 90);
  assert.equal(weightDirectionScore(0.1, "maintain"), 95);
  assert.equal(weightDirectionScore(-0.4, null), null);
});

test("empty logs produce a hidden total, not a fake zero", () => {
  const score = computeForgedayScore({
    user: { focused_pillars: ["lifts", "nutrition", "mindfulness"] },
    today: "2026-09-10",
    weekStart: "2026-09-08",
    weekEnd: "2026-09-14",
  });
  assert.equal(score.total, null);
  assert.equal(score.sparse, true);
  assert.equal(score.pillars.body.score, null);
  assert.equal(score.pillars.mind.score, null);
  assert.ok(score.pillars.body.explain.length > 0);
});

test("scores body, mind, and consistency from logged data and explains the math", () => {
  const score = computeForgedayScore({
    user: {
      focused_pillars: ["lifts", "nutrition", "mindfulness"],
      nutrition_goals: { calories: 2400, protein_g: 180 },
      workout_days_per_week: 4,
      fitness_goal: "lose_weight",
    },
    today: "2026-09-12",
    weekStart: "2026-09-08",
    weekEnd: "2026-09-14",
    meals: [
      { date: "2026-09-08", calories: 2300, protein_g: 170 },
      { date: "2026-09-09", calories: 2500, protein_g: 190 },
      { date: "2026-09-10", calories: 2400, protein_g: 180 },
    ],
    workoutLogs: [
      { week_start: "2026-09-08", day: 1, created_date: "2026-09-08" },
      { week_start: "2026-09-08", day: 2, created_date: "2026-09-10" },
    ],
    journalEntries: [
      { date: "2026-09-08", type: "morning" },
      { date: "2026-09-09", type: "reading", pages_read: 20 },
    ],
    weightLogs: [
      { date: "2026-09-08", weight_lbs: 184 },
      { date: "2026-09-12", weight_lbs: 183.1 },
    ],
    activities: [
      { date: "2026-09-08", pillar: "lifts" },
      { date: "2026-09-10", pillar: "lifts" },
    ],
    books: [{ id: "1", title: "Atomic Habits", status: "reading", progress_pct: 40 }],
  });

  assert.ok(score.total != null && score.total >= 50);
  assert.ok(score.pillars.body.score != null);
  assert.ok(score.pillars.mind.score != null);
  assert.ok(score.pillars.consistency.score != null);
  assert.equal(score.pillars.money.score, null);
  assert.match(score.pillars.body.explain.join(" "), /Protein/);
  assert.match(score.pillars.body.explain.join(" "), /Weight/);
  assert.match(score.pillars.mind.explain.join(" "), /Atomic Habits/);
});

test("money scores only when a budget and spend both exist", () => {
  const hidden = computeForgedayScore({
    user: { focused_pillars: ["finance"] },
    today: "2026-09-12",
    weekStart: "2026-09-08",
    weekEnd: "2026-09-14",
    transactions: [{ date: "2026-09-09", type: "expense", amount: 40 }],
  });
  assert.equal(hidden.pillars.money.score, null);
  assert.match(hidden.pillars.money.explain.join(" "), /budget/);

  const scored = computeForgedayScore({
    user: { focused_pillars: ["finance"] },
    today: "2026-09-12",
    weekStart: "2026-09-08",
    weekEnd: "2026-09-14",
    transactions: [{ date: "2026-09-09", type: "expense", amount: 40 }],
    budgetCategories: [{ type: "expense", budget_amount: 600 }],
  });
  assert.equal(scored.pillars.money.score, 100);
});
