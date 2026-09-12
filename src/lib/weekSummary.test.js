import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWeekDigest, digestToMarkdown, formatWeekRange } from "./weekSummary.js";

const WEEK = { weekStart: "2026-09-07", weekEnd: "2026-09-13" };

describe("buildWeekDigest", () => {
  it("returns empty when nothing was logged", () => {
    const digest = buildWeekDigest(WEEK);
    assert.equal(digest.hasAny, false);
    assert.equal(digest.body, null);
    assert.equal(digest.mind, null);
    assert.equal(digest.money, null);
  });

  it("summarizes body, mind, and money when data exists", () => {
    const digest = buildWeekDigest({
      ...WEEK,
      workoutLogs: [
        { week_start: "2026-09-07", day: 1, exercise: "Squat", set_number: 1 },
        { week_start: "2026-09-07", day: 1, exercise: "Squat", set_number: 2 },
        { week_start: "2026-09-07", day: 2, exercise: "Row", set_number: 1 },
      ],
      meals: [
        { date: "2026-09-08", calories: 2200, protein_g: 160 },
        { date: "2026-09-09", calories: 2000, protein_g: 150 },
      ],
      weights: [
        { date: "2026-09-07", weight_lbs: 184.2 },
        { date: "2026-09-13", weight_lbs: 183.4 },
      ],
      journalEntries: [
        { date: "2026-09-08", type: "morning" },
        { date: "2026-09-08", type: "meditation", duration_minutes: 12 },
        { date: "2026-09-10", type: "reading", pages_read: 22 },
      ],
      transactions: [
        { date: "2026-09-09", type: "expense", amount: 42 },
        { date: "2026-09-11", type: "income", amount: 200 },
      ],
      goals: { calories: 2300, protein_g: 170 },
    });

    assert.equal(digest.hasAny, true);
    assert.equal(digest.body.sessions, 2);
    assert.equal(digest.body.sets, 3);
    assert.equal(digest.body.mealDays, 2);
    assert.ok(digest.body.lines.some(l => /training/i.test(l)));
    assert.ok(digest.mind.journals === 1);
    assert.ok(digest.mind.pages === 22);
    assert.equal(digest.money.spent, 42);
    assert.equal(digest.money.income, 200);

    const md = digestToMarkdown(digest, {
      win: "Hit two lift days.",
      change: "Protein slipped midweek.",
      next: "Three training days.",
    });
    assert.match(md, /Your Forgeday Week/);
    assert.match(md, /### Body/);
    assert.match(md, /### Mind/);
    assert.match(md, /### Money/);
    assert.match(md, /Hit two lift days/);
    assert.match(md, /Three training days/);
  });

  it("omits sections without data", () => {
    const digest = buildWeekDigest({
      ...WEEK,
      journalEntries: [{ date: "2026-09-08", type: "evening" }],
    });
    assert.equal(digest.body, null);
    assert.ok(digest.mind);
    assert.equal(digest.money, null);
  });
});

describe("formatWeekRange", () => {
  it("formats a Mon–Sun range", () => {
    assert.equal(formatWeekRange("2026-09-07", "2026-09-13"), "Sep 7 – Sep 13");
  });
});
