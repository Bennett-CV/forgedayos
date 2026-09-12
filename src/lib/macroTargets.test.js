import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { caloriesFromMacros, macroCalorieMismatch, macroCalorieWarning } from "./macroTargets.js";

describe("macroTargets", () => {
  it("computes 4/4/9 calories from macros", () => {
    assert.equal(caloriesFromMacros({ protein_g: 180, carbs_g: 220, fat_g: 70 }), 180 * 4 + 220 * 4 + 70 * 9);
  });

  it("returns null when a macro is missing", () => {
    assert.equal(caloriesFromMacros({ protein_g: 180, carbs_g: 220 }), null);
  });

  it("stays quiet when macros match calories", () => {
    const calories = 180 * 4 + 220 * 4 + 70 * 9;
    assert.equal(macroCalorieMismatch({ calories, protein_g: 180, carbs_g: 220, fat_g: 70 }), null);
    assert.equal(macroCalorieWarning({ calories, protein_g: 180, carbs_g: 220, fat_g: 70 }), null);
  });

  it("warns when macros are far above the calorie target", () => {
    const mismatch = macroCalorieMismatch({ calories: 1800, protein_g: 180, carbs_g: 250, fat_g: 80 });
    assert.ok(mismatch);
    assert.ok(mismatch.fromMacros > mismatch.calories);
    const warning = macroCalorieWarning({ calories: 1800, protein_g: 180, carbs_g: 250, fat_g: 80 });
    assert.match(warning, /above/);
    assert.match(warning, /1,800/);
  });

  it("warns when macros are far below the calorie target", () => {
    const warning = macroCalorieWarning({ calories: 3200, protein_g: 120, carbs_g: 150, fat_g: 40 });
    assert.match(warning, /below/);
  });
});
