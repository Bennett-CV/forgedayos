import { test } from "node:test";
import assert from "node:assert/strict";
import { localDateKey } from "./localDate.js";
import {
  buildRecentMeals,
  calendarDaysBetween,
  copyMealPayload,
  copyPayloads,
  foodSignature,
  logDayLabel,
  loggedMealRecord,
  mergeLoggedMeals,
  recentScore,
  slotTitle,
} from "./recentMeals.js";

const TODAY = "2026-09-11";

function food(overrides) {
  return {
    id: overrides.id,
    date: overrides.date,
    meal_type: overrides.meal_type || "breakfast",
    food_name: overrides.food_name,
    food_description: overrides.food_description || overrides.food_name,
    calories: overrides.calories ?? 100,
    protein_g: overrides.protein_g ?? 10,
    carbs_g: overrides.carbs_g ?? 10,
    fat_g: overrides.fat_g ?? 5,
    serving_size: overrides.serving_size,
    serving_size_g: overrides.serving_size_g,
    quantity: overrides.quantity ?? 1,
    fiber_g: overrides.fiber_g,
    sugar_g: overrides.sugar_g,
    notes: overrides.notes,
    created_date: overrides.created_date,
    created_by: overrides.created_by,
  };
}

test("calendar day distance ignores the local clock and DST", () => {
  assert.equal(calendarDaysBetween("2026-08-01", "2026-09-11"), 41);
  assert.equal(calendarDaysBetween("2026-09-11", "2026-09-11"), 0);
  assert.equal(calendarDaysBetween("2026-09-10", "2026-09-11"), 1);
});

test("identical foods collapse, and a different portion stays separate", () => {
  const meals = [];
  for (let day = 1; day <= 20; day++) {
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    meals.push(food({
      id: `eggs-${day}`,
      date,
      food_name: day % 2 ? "Greek Yogurt" : "  greek   yogurt ",
      calories: 150,
      protein_g: 20,
      carbs_g: 8,
      fat_g: 0,
      serving_size: "custom",
      created_date: `${date}T15:00:00.000Z`,
    }));
  }
  meals.push(food({
    id: "yogurt-cup",
    date: "2026-08-20",
    food_name: "Greek Yogurt",
    calories: 150,
    protein_g: 20,
    carbs_g: 8,
    fat_g: 0,
    serving_size: "1 cup",
  }));
  meals.push(food({
    id: "yogurt-big",
    date: "2026-08-18",
    food_name: "Greek Yogurt",
    calories: 300,
    protein_g: 40,
    carbs_g: 16,
    fat_g: 0,
  }));

  const rows = buildRecentMeals(meals, { today: TODAY, mealType: "breakfast" });
  const names = rows.filter(row => row.kind === "food");
  assert.equal(names.length, 3);

  const usual = names.find(row => row.count === 20);
  assert.ok(usual);
  assert.equal(usual.lastDate, "2026-08-20");
  assert.equal(usual.title, "greek yogurt");
  assert.equal(usual.calories, 150);
  assert.equal(usual.macrosLabel, "P 20g · C 8g · F 0g");
  assert.match(usual.subtitle, /20×/);

  assert.equal(names.filter(row => row.title === "Greek Yogurt").length, 2);
  assert.notEqual(foodSignature(meals[0]), foodSignature(meals.at(-2)));
});

test("a repeated multi-item slot is one row and copies every item", () => {
  const meals = [];
  for (const date of ["2026-09-09", "2026-09-10", "2026-09-08", "2026-09-07"]) {
    const eggs = Object.freeze(food({
      id: `eggs-${date}`,
      date,
      food_name: "Eggs",
      calories: 140,
      protein_g: 12,
      carbs_g: 1,
      fat_g: 10,
      serving_size: "2 large",
      fiber_g: 0,
      created_date: `${date}T14:00:00.000Z`,
    }));
    const toast = Object.freeze(food({
      id: `toast-${date}`,
      date,
      food_name: "Toast",
      calories: 90,
      protein_g: 4,
      carbs_g: 16,
      fat_g: 1,
      serving_size: "1 slice",
      sugar_g: 2,
      notes: "sourdough",
      created_date: `${date}T14:01:00.000Z`,
    }));
    // Sep 7 is logged toast-then-eggs. The slot still matches the other days.
    meals.push(...(date === "2026-09-07" ? [toast, eggs] : [eggs, toast]));
  }
  meals.push(Object.freeze(food({
    id: "lunch-eggs",
    date: "2026-09-10",
    meal_type: "lunch",
    food_name: "Eggs",
    calories: 140,
    protein_g: 12,
    carbs_g: 1,
    fat_g: 10,
  })));
  Object.freeze(meals);

  const rows = buildRecentMeals(meals, { today: TODAY });
  const slots = rows.filter(row => row.kind === "slot");
  assert.equal(slots.length, 1);
  assert.equal(slots[0].title, "Breakfast from yesterday");
  assert.equal(slots[0].count, 4);
  assert.equal(slots[0].lastDate, "2026-09-10");
  assert.equal(slots[0].calories, 230);
  assert.equal(slots[0].macrosLabel, "P 16g · C 17g · F 11g");
  assert.match(slots[0].subtitle, /Eggs, Toast/);
  assert.match(slots[0].subtitle, /4×/);

  const payloads = copyPayloads(slots[0], { date: TODAY });
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads.map(row => row.food_name), ["Eggs", "Toast"]);
  assert.deepEqual(payloads.map(row => row.date), [TODAY, TODAY]);
  assert.equal(payloads[0].calories, 140);
  assert.equal(payloads[0].fiber_g, 0);
  assert.equal(payloads[1].notes, "sourdough");
  assert.equal(payloads[1].sugar_g, 2);
  for (const payload of payloads) {
    assert.equal(payload.id, undefined);
    assert.equal(payload.created_date, undefined);
    assert.equal(payload.created_by, undefined);
    assert.equal(payload.meal_type, "breakfast");
  }

  assert.equal(meals[0].date, "2026-09-09");
  assert.equal(meals[0].id, "eggs-2026-09-09");
  assert.equal(slots[0].sources[0].date, "2026-09-10");
});

test("a one-food day is not a slot, and empty or unusable rows are ignored", () => {
  const rows = buildRecentMeals([
    food({ id: "1", date: "2026-09-10", food_name: "Coffee", calories: 5, protein_g: 0, carbs_g: 0, fat_g: 0 }),
    { id: "2", date: "2026-09-10", meal_type: "breakfast", food_name: "   ", calories: 10 },
    { id: "3", meal_type: "breakfast", food_name: "Missing day", calories: 10 },
    { id: "4", date: "2026-09-10", meal_type: "brunch", food_name: "Bagel", calories: 10 },
    null,
  ], { today: TODAY });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "food");
  assert.equal(rows[0].title, "Coffee");
});

test("ranking puts repeated meals above one-offs without beating today's staple", () => {
  const meals = [];
  for (let day = 4; day <= 11; day++) {
    meals.push(food({
      id: `oats-${day}`,
      date: `2026-09-${String(day).padStart(2, "0")}`,
      food_name: "Oats",
      calories: 300,
      protein_g: 10,
      carbs_g: 50,
      fat_g: 6,
    }));
  }
  for (let day = 1; day <= 10; day++) {
    meals.push(food({
      id: `yogurt-${day}`,
      date: `2026-09-${String(day).padStart(2, "0")}`,
      meal_type: "snack",
      food_name: "Yogurt",
      calories: 150,
      protein_g: 20,
      carbs_g: 8,
      fat_g: 0,
    }));
  }
  meals.push(food({
    id: "salmon",
    date: TODAY,
    meal_type: "dinner",
    food_name: "Salmon",
    calories: 400,
    protein_g: 40,
    carbs_g: 0,
    fat_g: 18,
  }));
  meals.push(
    food({
      id: "eggs",
      date: "2026-09-10",
      food_name: "Eggs",
      calories: 140,
      protein_g: 12,
      carbs_g: 1,
      fat_g: 10,
      created_date: "2026-09-10T14:00:00.000Z",
    }),
    food({
      id: "toast",
      date: "2026-09-10",
      food_name: "Toast",
      calories: 90,
      protein_g: 4,
      carbs_g: 16,
      fat_g: 1,
      created_date: "2026-09-10T14:01:00.000Z",
    }),
  );

  const titles = buildRecentMeals(meals, { today: TODAY }).map(row => row.title);
  assert.deepEqual(titles, [
    "Oats",
    "Yogurt",
    "Salmon",
    "Breakfast from yesterday",
    "Eggs",
    "Toast",
  ]);

  assert.equal(recentScore({ count: 8, lastDate: TODAY, kind: "food" }, TODAY), 3.5);
  assert.equal(recentScore({ count: 100, lastDate: TODAY, kind: "food" }, TODAY), 3.5);
  assert.equal(recentScore({ count: 8, lastDate: "2026-09-10", kind: "food" }, TODAY), 2.5);
  assert.equal(recentScore({ count: 1, lastDate: "2026-09-10", kind: "slot" }, TODAY), -0.75);
});

test("search and meal filter run after dedupe", () => {
  const meals = [
    food({ id: "1", date: "2026-09-10", food_name: "Eggs", calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10 }),
    food({ id: "2", date: "2026-09-10", food_name: "Toast", calories: 90, protein_g: 4, carbs_g: 16, fat_g: 1 }),
    food({ id: "3", date: "2026-09-10", meal_type: "lunch", food_name: "Chicken salad", calories: 420, protein_g: 35, carbs_g: 12, fat_g: 18 }),
  ];
  const found = buildRecentMeals(meals, { today: TODAY, query: "eggs toast" });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, "slot");

  const lunch = buildRecentMeals(meals, { today: TODAY, mealType: "lunch" });
  assert.deepEqual(lunch.map(row => row.title), ["Chicken salad"]);

  assert.equal(buildRecentMeals(meals, { today: TODAY, query: "nope" }).length, 0);
  assert.equal(buildRecentMeals(meals, { today: TODAY, limit: 1 }).length, 1);
});

test("copy keeps macros and the local civil day, and leaves the original alone", () => {
  const evening = new Date(2026, 8, 11, 22, 30, 0);
  const original = Object.freeze(food({
    id: "original",
    date: "2026-09-01",
    food_name: "Salmon",
    calories: 400,
    protein_g: 40,
    carbs_g: 0,
    fat_g: 18,
    serving_size: "1 fillet",
    serving_size_g: 180,
    quantity: 1,
    created_by: "person@example.com",
    created_date: "2026-09-01T18:00:00.000Z",
  }));

  const payload = copyMealPayload(original, { date: "2026-09-11" });
  assert.equal(payload.date, "2026-09-11");
  assert.equal(payload.food_name, "Salmon");
  assert.equal(payload.calories, 400);
  assert.equal(payload.protein_g, 40);
  assert.equal(payload.serving_size_g, 180);
  assert.equal(payload.id, undefined);
  assert.equal(payload.created_by, undefined);
  assert.equal(payload.created_date, undefined);
  assert.equal(original.date, "2026-09-01");
  assert.equal(original.id, "original");

  const fromClock = copyMealPayload(original, { date: evening });
  assert.equal(fromClock.date, localDateKey(evening));
  assert.equal(fromClock.date, "2026-09-11");
  const utcDay = evening.toISOString().slice(0, 10);
  if (utcDay !== "2026-09-11") {
    assert.notEqual(fromClock.date, utcDay);
  }

  assert.equal(copyMealPayload(original, { date: "" }).date, localDateKey(new Date()));
});

test("an ISO instant is grouped on the local civil day, not the UTC date", () => {
  const evening = new Date(2026, 8, 11, 22, 30, 0);
  const rows = buildRecentMeals([
    food({
      id: "late",
      date: evening.toISOString(),
      meal_type: "dinner",
      food_name: "Salmon",
      calories: 400,
      protein_g: 40,
      carbs_g: 0,
      fat_g: 18,
    }),
  ], { today: "2026-09-11" });

  assert.equal(rows[0].lastDate, "2026-09-11");
  const utcDay = evening.toISOString().slice(0, 10);
  if (utcDay !== "2026-09-11") {
    assert.notEqual(rows[0].lastDate, utcDay);
  }
});

test("logged rows keep the copied day when the server echoes another timestamp", () => {
  const payload = copyMealPayload(
    food({ id: "old", date: "2026-09-01", food_name: "Eggs", calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10 }),
    { date: "2026-09-11" },
  );
  const record = loggedMealRecord({
    id: "new-id",
    date: "2026-09-12",
    created_date: "2026-09-12T03:30:00.000Z",
    calories: 999,
    created_by: "person@example.com",
  }, payload);

  assert.equal(record.id, "new-id");
  assert.equal(record.date, "2026-09-11");
  assert.equal(record.calories, 140);
  assert.equal(record.food_name, "Eggs");
  assert.equal(record.created_date, undefined);
  assert.equal(record.created_by, undefined);

  const merged = mergeLoggedMeals(
    [{ id: "old", food_name: "Oats", date: "2026-09-11" }],
    [record, { ...record }, { id: "old", food_name: "duplicate" }],
  );
  assert.deepEqual(merged.map(row => row.id), ["new-id", "old"]);
  assert.equal(merged[1].food_name, "Oats");
});

test("slot titles and the log-day label use the local calendar", () => {
  assert.equal(slotTitle("breakfast", "2026-09-10", TODAY), "Breakfast from yesterday");
  assert.equal(slotTitle("breakfast", TODAY, TODAY), "Today's breakfast");
  assert.equal(slotTitle("dinner", "2026-09-08", TODAY), "Dinner from Tuesday");
  assert.equal(slotTitle("snack", "2026-09-01", TODAY), "Snack from Sep 1");
  assert.equal(logDayLabel(TODAY, TODAY), "today");
  assert.equal(logDayLabel("2026-09-10", TODAY), "yesterday");
  assert.equal(logDayLabel("2026-09-08", TODAY), "Sep 8");
});
