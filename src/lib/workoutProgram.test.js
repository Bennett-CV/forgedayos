import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAM_PRESETS,
  getProgramPreset,
  clonePresetDays,
  emptyCustomDays,
  programDayNumbers,
} from "./workoutProgram.js";

test("starter presets cover the common setups", () => {
  assert.deepEqual(
    PROGRAM_PRESETS.map(p => p.id),
    ["full_body_3", "upper_lower", "ppl", "starter_5"]
  );
  assert.equal(getProgramPreset("full_body_3").days.length, 3);
  assert.equal(getProgramPreset("upper_lower").days.length, 4);
  assert.equal(getProgramPreset("ppl").days.length, 3);
  assert.equal(getProgramPreset("starter_5").days.length, 5);
});

test("clonePresetDays is a deep copy", () => {
  const preset = getProgramPreset("ppl");
  const clone = clonePresetDays(preset);
  clone[0].exercises[0].name = "CHANGED";
  assert.equal(preset.days[0].exercises[0].name, "Incline Dumbbell Bench Press");
  assert.equal(clone[0].day, 1);
});

test("empty custom days and programDayNumbers", () => {
  const days = emptyCustomDays(3);
  assert.equal(days.length, 3);
  assert.deepEqual(programDayNumbers(days), [1, 2, 3]);
  assert.deepEqual(programDayNumbers([{ day: 3 }, { day: 1 }, { day: 1 }]), [1, 3]);
});
