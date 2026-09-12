const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

function num(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Calories implied by protein / carbs / fat (4 / 4 / 9). */
export function caloriesFromMacros({ protein_g, carbs_g, fat_g } = {}) {
  return num(protein_g) * KCAL_PER_G.protein
    + num(carbs_g) * KCAL_PER_G.carbs
    + num(fat_g) * KCAL_PER_G.fat;
}

/**
 * When macros and the calorie target disagree by more than the slack, return
 * a warning payload. Slack is the larger of 150 kcal or 10% of the calorie goal.
 */
export function macroCalorieMismatch(targets = {}, { slackKcal = 150, slackPct = 0.1 } = {}) {
  const calories = num(targets.calories);
  const protein_g = num(targets.protein_g);
  const carbs_g = num(targets.carbs_g);
  const fat_g = num(targets.fat_g);
  if (!calories || !protein_g || !carbs_g || !fat_g) return null;

  const fromMacros = caloriesFromMacros({ protein_g, carbs_g, fat_g });
  const delta = fromMacros - calories;
  const allowed = Math.max(slackKcal, calories * slackPct);
  if (Math.abs(delta) <= allowed) return null;

  return {
    calories: Math.round(calories),
    fromMacros: Math.round(fromMacros),
    delta: Math.round(delta),
  };
}

export function formatMacroMismatch(mismatch) {
  if (!mismatch) return "";
  return `These macros add up to ${mismatch.fromMacros.toLocaleString()} kcal, but the calorie target is ${mismatch.calories.toLocaleString()}.`;
}
