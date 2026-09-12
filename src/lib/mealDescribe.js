function num(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function newFoodDraft(partial = {}) {
  return {
    key: partial.key || `food-${Math.random().toString(36).slice(2, 9)}`,
    name: String(partial.name || partial.food_name || partial.description || "").trim(),
    calories: partial.calories == null || partial.calories === "" ? "" : String(partial.calories),
    protein_g: partial.protein_g == null || partial.protein_g === "" ? "" : String(partial.protein_g),
    carbs_g: partial.carbs_g == null || partial.carbs_g === "" ? "" : String(partial.carbs_g),
    fat_g: partial.fat_g == null || partial.fat_g === "" ? "" : String(partial.fat_g),
    serving: String(partial.serving || partial.serving_size || "").trim(),
  };
}

export function normalizeDetectedFood(raw) {
  if (!raw || typeof raw !== "object") return null;
  const draft = newFoodDraft(raw);
  if (!draft.name) return null;
  return draft;
}

export function normalizeDetectedFoods(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.foods)
      ? payload.foods
      : payload && typeof payload === "object" && payload.name
        ? [payload]
        : [];
  return list.map(normalizeDetectedFood).filter(Boolean);
}

export function foodsFromAnalyzeResult(result) {
  if (!result || result.error) return [];
  return normalizeDetectedFoods([{
    name: result.food_name || result.description || result.name,
    calories: result.calories,
    protein_g: result.protein_g,
    carbs_g: result.carbs_g,
    fat_g: result.fat_g,
    serving: result.serving_size || result.serving,
  }]);
}

export function mealPayloadFromDraft(draft, { mealType, date }) {
  return {
    date,
    meal_type: mealType,
    food_description: String(draft.name || "").trim(),
    food_name: String(draft.name || "").trim(),
    quantity: 1,
    calories: num(draft.calories),
    protein_g: num(draft.protein_g),
    carbs_g: num(draft.carbs_g),
    fat_g: num(draft.fat_g),
    serving_size: draft.serving || "described",
    serving_size_g: null,
  };
}

export function draftsAreLoggable(drafts) {
  return (drafts || []).some(d => String(d.name || "").trim() && num(d.calories) > 0);
}

export const MEAL_DESCRIBE_PROMPT = `You are Forgeday's meal logger. Split a natural-language meal into individual foods with estimated nutrition.

Return JSON only. Use common US household portions. Prefer USDA-ish estimates. If a drink is unsweetened coffee/tea/water, include it only if the user mentioned calories or milk/sugar.

Each food needs: name (short, human), calories, protein_g, carbs_g, fat_g, serving (e.g. "2 large", "1 slice").`;

/**
 * Parse a meal description. Tries a multi-food LLM first, then a single USDA analyze fallback.
 * Invokers are injected so the UI can swap implementations and tests stay pure.
 */
export async function parseMealDescription(text, { invokeLLM, analyzeFood } = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { foods: [], error: "Describe the meal first." };

  if (invokeLLM) {
    try {
      const result = await invokeLLM(trimmed);
      const foods = normalizeDetectedFoods(result);
      if (foods.length) return { foods };
    } catch {
      // fall through to USDA single-item analyze
    }
  }

  if (analyzeFood) {
    try {
      const one = await analyzeFood(trimmed);
      const foods = foodsFromAnalyzeResult(one?.data || one);
      if (foods.length) return { foods };
    } catch {
      // handled below
    }
  }

  return {
    foods: [],
    error: "Couldn't read that meal. Try simpler wording, or add a food by hand.",
  };
}
