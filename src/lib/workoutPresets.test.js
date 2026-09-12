import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKOUT_PRESETS,
  blankProgram,
  clonePresetDays,
  presetById,
  programDayCount,
  dayGridClass,
} from "./workoutPresets.js";

describe("workout presets", () => {
  it("includes the four starter paths", () => {
    const ids = WORKOUT_PRESETS.map(p => p.id);
    assert.deepEqual(ids, ["full_body_3", "upper_lower", "ppl"]);
    assert.equal(presetById("full_body_3").days.length, 3);
    assert.equal(presetById("upper_lower").days.length, 4);
    assert.equal(presetById("ppl").days.length, 6);
  });

  it("clones days so edits do not mutate the template", () => {
    const preset = presetById("full_body_3");
    const days = clonePresetDays(preset);
    days[0].exercises[0].name = "Changed";
    assert.notEqual(preset.days[0].exercises[0].name, "Changed");
  });

  it("builds a blank custom program", () => {
    const days = blankProgram(4);
    assert.equal(days.length, 4);
    assert.equal(days[3].day, 4);
    assert.deepEqual(days[0].exercises, []);
  });

  it("sizes the day grid for 3–6 day programs", () => {
    assert.equal(dayGridClass(3), "grid-cols-3");
    assert.equal(dayGridClass(6), "grid-cols-3");
    assert.equal(programDayCount([{ day: 1 }, { day: 2 }]), 2);
  });

  it("names every preset exercise", () => {
    for (const preset of WORKOUT_PRESETS) {
      for (const day of preset.days) {
        assert.ok(day.label);
        for (const ex of day.exercises) {
          assert.ok(ex.name);
          assert.ok(ex.sets >= 1);
        }
      }
    }
  });
});
