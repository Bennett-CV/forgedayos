import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enabledTracks,
  trainedToday,
  nutritionStatus,
  mindStatus,
  pickNextAction,
  pickInsight,
  buildTodayCommand,
  greetingForHour,
  firstNameOf,
  nextProgramDay,
} from "./todayCommand.js";

describe("enabledTracks", () => {
  it("defaults to training, nutrition, and mind", () => {
    assert.deepEqual(enabledTracks([]), ["lifts", "nutrition", "mindfulness"]);
  });

  it("respects focused pillars and can add spending when data exists", () => {
    assert.deepEqual(enabledTracks(["lifts", "nutrition"]), ["lifts", "nutrition"]);
    assert.deepEqual(enabledTracks(["lifts"], { hasFinanceData: true }), ["lifts", "finance"]);
  });
});

describe("progress helpers", () => {
  it("detects a workout logged today", () => {
    assert.equal(trainedToday({ workoutLogs: [{ created_date: "2026-09-12T10:00:00Z" }], today: "2026-09-12" }), true);
    assert.equal(trainedToday({ activities: [{ pillar: "lifts", date: "2026-09-12" }], today: "2026-09-12" }), true);
    assert.equal(trainedToday({ workoutLogs: [], activities: [], today: "2026-09-12" }), false);
  });

  it("marks nutrition complete when logged totals hit targets", () => {
    const open = nutritionStatus({ meals: [{ calories: 400, protein_g: 20 }], goals: { calories: 2400, protein_g: 180 } });
    assert.equal(open.logged, true);
    assert.equal(open.complete, false);

    const done = nutritionStatus({
      meals: [{ calories: 2200, protein_g: 170 }],
      goals: { calories: 2400, protein_g: 180 },
    });
    assert.equal(done.complete, true);
  });

  it("counts mind items for today only", () => {
    const mind = mindStatus({
      entries: [
        { date: "2026-09-12", type: "morning" },
        { date: "2026-09-11", type: "evening" },
      ],
      today: "2026-09-12",
    });
    assert.equal(mind.count, 1);
    assert.equal(mind.complete, true);
  });

  it("picks the first program day without logs", () => {
    const next = nextProgramDay(
      [{ day: 1, label: "Full Body A" }, { day: 2, label: "Full Body B" }],
      [{ day: 1 }]
    );
    assert.equal(next.day, 2);
  });
});

describe("next action and insight", () => {
  const nutritionEmpty = nutritionStatus({ meals: [], goals: { calories: 2400, protein_g: 180 } });

  it("prioritizes an untrained day", () => {
    const next = pickNextAction({
      tracks: ["lifts", "nutrition"],
      trainingDone: false,
      nutrition: nutritionEmpty,
      hasProgram: true,
      programDay: { day: 1, label: "Full Body A" },
    });
    assert.equal(next.label, "Log Full Body A");
    assert.equal(next.href, "/lifts?view=log&day=1");
  });

  it("asks for a meal when training is done and food is empty", () => {
    const next = pickNextAction({
      tracks: ["lifts", "nutrition"],
      trainingDone: true,
      nutrition: nutritionEmpty,
    });
    assert.equal(next.label, "Log a meal");
  });

  it("points at weekly review late in the week", () => {
    const next = pickNextAction({
      tracks: ["lifts"],
      trainingDone: true,
      nutrition: { logged: true, complete: true, totals: { protein_g: 180 } },
      mind: { complete: true },
      reviewExists: false,
      weekHasData: true,
      weekday: 0,
    });
    assert.equal(next.label, "Start weekly review");
  });

  it("writes a cheap protein insight", () => {
    const insight = pickInsight({
      nutrition: { logged: true, proGoal: 180, totals: { protein_g: 40 } },
      reviewExists: true,
      weekday: 3,
    });
    assert.match(insight, /Protein is light/);
  });
});

describe("buildTodayCommand", () => {
  it("returns greeting, X of Y, and a single next action", () => {
    const view = buildTodayCommand({
      user: { full_name: "Bennett Cole", focused_pillars: ["lifts", "nutrition", "mindfulness"] },
      now: new Date("2026-09-12T15:00:00"),
      meals: [{ calories: 500, protein_g: 30 }],
      goals: { calories: 2400, protein_g: 180 },
      workoutLogs: [{ created_date: "2026-09-12T11:00:00" }],
      program: [{ day: 1, label: "Full Body A" }],
      journalEntries: [],
    });
    assert.equal(view.greeting, greetingForHour(15));
    assert.equal(view.firstName, "Bennett");
    assert.equal(view.totalCount, 3);
    assert.equal(view.completeCount, 1);
    assert.equal(view.next.label, "Add protein");
    assert.equal(view.items.filter(i => i.complete).length, 1);
  });
});

describe("copy helpers", () => {
  it("greets by hour and first name", () => {
    assert.equal(greetingForHour(8), "Good morning");
    assert.equal(greetingForHour(13), "Good afternoon");
    assert.equal(greetingForHour(19), "Good evening");
    assert.equal(firstNameOf({ full_name: "Ada Lovelace" }), "Ada");
    assert.equal(firstNameOf({}), "there");
  });
});
