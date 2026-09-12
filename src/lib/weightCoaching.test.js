import { test } from "node:test";
import assert from "node:assert/strict";
import { weightCoaching, goalLabel } from "./weightCoaching.js";

test("goal labels stay short", () => {
  assert.equal(goalLabel("lose_weight"), "lose");
  assert.equal(goalLabel("gain_muscle"), "gain");
  assert.equal(goalLabel("maintain"), "maintain");
  assert.equal(goalLabel(null), "");
});

test("one weigh-in stays sparse and asks for a second log", () => {
  const c = weightCoaching({
    today: "2026-09-12",
    logs: [{ date: "2026-09-10", weight_lbs: 184 }],
    user: { fitness_goal: "lose_weight" },
  });
  assert.equal(c.sparse, true);
  assert.equal(c.onTrack, null);
  assert.match(c.trendLabel, /second day/);
  assert.equal(c.nextAction.href, "/nutrition?tab=weight");
});

test("lose goal: down week is on track and points at protein", () => {
  const c = weightCoaching({
    today: "2026-09-12",
    user: { fitness_goal: "lose_weight", target_weight_lbs: 175 },
    logs: [
      { date: "2026-09-05", weight_lbs: 185 },
      { date: "2026-09-12", weight_lbs: 183.6 },
    ],
  });
  assert.equal(c.sparse, false);
  assert.equal(c.trend, "down");
  assert.equal(c.onTrack, true);
  assert.match(c.call, /lose/);
  assert.equal(c.nextAction.href, "/nutrition");
});

test("gain goal: down week is off track", () => {
  const c = weightCoaching({
    today: "2026-09-12",
    user: { fitness_goal: "gain_muscle" },
    logs: [
      { date: "2026-09-05", weight_lbs: 170 },
      { date: "2026-09-12", weight_lbs: 168.8 },
    ],
  });
  assert.equal(c.onTrack, false);
  assert.match(c.call, /Gain/);
  assert.match(c.nextAction.label, /fuller meal/);
});

test("no fitness goal still names the trend and asks to set one", () => {
  const c = weightCoaching({
    today: "2026-09-12",
    user: {},
    logs: [
      { date: "2026-09-01", weight_lbs: 180 },
      { date: "2026-09-12", weight_lbs: 180.2 },
    ],
  });
  assert.equal(c.onTrack, null);
  assert.match(c.call, /Set lose, maintain, or gain/);
  assert.equal(c.nextAction.href, "/nutrition?goals=1");
});
