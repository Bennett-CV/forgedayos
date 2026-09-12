const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

function num(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Calories implied by protein / carbs / fat (4 / 4 / 9). */
export function caloriesFromMacros({ protein_g, carbs_g, fat_g }) {
  const protein = num(protein_g);
  const carbs = num(carbs_g);
  const fat = num(fat_g);
  if (protein == null || carbs == null || fat == null) return null;
  return protein * KCAL_PER_G.protein + carbs * KCAL_PER_G.carbs + fat * KCAL_PER_G.fat;
}

/**
 * Warn when all four targets are set and macros don't match calories.
 * Default: more than 12% or 150 kcal apart.
 */
export function macroCalorieMismatch(targets, { pct = 0.12, abs = 150 } = {}) {
  const calories = num(targets?.calories);
  const fromMacros = caloriesFromMacros(targets || {});
  if (calories == null || fromMacros == null) return null;

  const delta = fromMacros - calories;
  if (Math.abs(delta) / calories < pct && Math.abs(delta) < abs) return null;

  return {
    calories: Math.round(calories),
    fromMacros: Math.round(fromMacros),
    delta: Math.round(delta),
  };
}

export function macroCalorieWarning(targets, opts) {
  const mismatch = macroCalorieMismatch(targets, opts);
  if (!mismatch) return null;
  const gap = Math.abs(mismatch.delta).toLocaleString();
  const dir = mismatch.delta > 0 ? "above" : "below";
  return `Macros add up to ${mismatch.fromMacros.toLocaleString()} kcal — ${gap} ${dir} your ${mismatch.calories.toLocaleString()} calorie target.`;
}
