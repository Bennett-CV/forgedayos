import { test } from "node:test";
import assert from "node:assert/strict";
import { caloriesFromMacros, macroCalorieMismatch, formatMacroMismatch } from "./macroTargets.js";

test("caloriesFromMacros uses 4 / 4 / 9", () => {
  assert.equal(caloriesFromMacros({ protein_g: 180, carbs_g: 220, fat_g: 70 }), 180 * 4 + 220 * 4 + 70 * 9);
});

test("aligned macros produce no warning", () => {
  assert.equal(macroCalorieMismatch({
    calories: 2230,
    protein_g: 180,
    carbs_g: 220,
    fat_g: 70,
  }), null);
});

test("large mismatch warns in both directions", () => {
  const high = macroCalorieMismatch({
    calories: 1800,
    protein_g: 200,
    carbs_g: 250,
    fat_g: 90,
  });
  assert.ok(high);
  assert.equal(high.calories, 1800);
  assert.ok(high.fromMacros > 1800);

  const low = macroCalorieMismatch({
    calories: 3200,
    protein_g: 120,
    carbs_g: 150,
    fat_g: 40,
  });
  assert.ok(low);
  assert.ok(low.fromMacros < 3200);
  assert.ok(formatMacroMismatch(low).includes("3,200"));
});

test("incomplete targets skip the warning", () => {
  assert.equal(macroCalorieMismatch({ calories: 2400, protein_g: 180 }), null);
});
