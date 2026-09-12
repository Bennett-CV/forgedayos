import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDetectedFoods,
  foodsFromAnalyzeResult,
  mealPayloadFromDraft,
  draftsAreLoggable,
  parseMealDescription,
} from "./mealDescribe.js";

test("normalizeDetectedFoods accepts several LLM shapes", () => {
  const foods = normalizeDetectedFoods({
    foods: [
      { name: "Eggs", calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10, serving: "2 large" },
      { food_name: "  ", calories: 90 },
    ],
  });
  assert.equal(foods.length, 1);
  assert.equal(foods[0].name, "Eggs");
  assert.equal(foods[0].calories, "140");
});

test("foodsFromAnalyzeResult maps the USDA function", () => {
  const foods = foodsFromAnalyzeResult({
    food_name: "2 Large Eggs",
    serving_size: "100g",
    calories: 143,
    protein_g: 12.5,
    carbs_g: 0.7,
    fat_g: 9.5,
  });
  assert.equal(foods[0].name, "2 Large Eggs");
  assert.equal(foods[0].serving, "100g");
});

test("mealPayloadFromDraft and loggable check", () => {
  const payload = mealPayloadFromDraft(
    { name: "Toast", calories: "90", protein_g: "4", carbs_g: "16", fat_g: "1", serving: "1 slice" },
    { mealType: "breakfast", date: "2026-09-12" }
  );
  assert.equal(payload.meal_type, "breakfast");
  assert.equal(payload.calories, 90);
  assert.equal(draftsAreLoggable([{ name: "Toast", calories: "" }]), false);
  assert.equal(draftsAreLoggable([{ name: "Toast", calories: "90" }]), true);
});

test("parseMealDescription prefers LLM foods, then USDA fallback", async () => {
  const empty = await parseMealDescription("   ");
  assert.match(empty.error, /Describe/);

  const fromLlm = await parseMealDescription("eggs and toast", {
    invokeLLM: async () => ({ foods: [{ name: "Eggs", calories: 140 }] }),
    analyzeFood: async () => { throw new Error("should not run"); },
  });
  assert.equal(fromLlm.foods[0].name, "Eggs");

  const fromUsda = await parseMealDescription("3 eggs", {
    invokeLLM: async () => { throw new Error("llm down"); },
    analyzeFood: async () => ({ food_name: "3 Large Eggs", calories: 210, protein_g: 18, carbs_g: 1, fat_g: 14 }),
  });
  assert.equal(fromUsda.foods[0].name, "3 Large Eggs");
});
