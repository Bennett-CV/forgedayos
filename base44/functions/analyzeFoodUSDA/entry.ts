import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { foodInput } = await req.json();
    if (!foodInput) return Response.json({ error: 'foodInput required' }, { status: 400 });

    // Step 1: Use AI to extract quantity + clean food name
    const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Parse this food input into a quantity multiplier and a clean USDA-searchable food name.
Food input: "${foodInput}"

Examples:
- "1 pound ground beef 80/20" → { "quantity": 453.6, "unit": "g", "search_term": "ground beef 80% lean 20% fat raw", "description": "1 lb Ground Beef (80/20)" }
- "2 large eggs" → { "quantity": 2, "unit": "serving", "search_term": "egg whole raw", "description": "2 Large Eggs" }
- "1 cup cooked white rice" → { "quantity": 186, "unit": "g", "search_term": "white rice cooked", "description": "1 cup White Rice (cooked)" }
- "6 oz chicken breast grilled" → { "quantity": 170, "unit": "g", "search_term": "chicken breast grilled boneless skinless", "description": "6 oz Chicken Breast (grilled)" }
- "7 oz chicken breast" → { "quantity": 198, "unit": "g", "search_term": "chicken breast broilers or fryers meat only cooked roasted", "description": "7 oz Chicken Breast" }

Return grams when possible. If it's a countable food, return number of servings.
IMPORTANT: For meats and proteins, use specific USDA-style search terms (e.g. "broilers or fryers meat only cooked roasted" for chicken). Avoid vague terms that could match processed or mixed foods.`,
      response_json_schema: {
        type: "object",
        properties: {
          quantity: { type: "number" },
          unit: { type: "string" },
          search_term: { type: "string" },
          description: { type: "string" }
        },
        required: ["quantity", "unit", "search_term", "description"]
      }
    });

    // Step 2: Search USDA for the food
    const searchRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(parsed.search_term)}&dataType=Foundation,SR%20Legacy&pageSize=5&api_key=${USDA_API_KEY}`
    );
    const searchData = await searchRes.json();

    if (!searchData.foods || searchData.foods.length === 0) {
      return Response.json({ error: 'No USDA data found for this food' }, { status: 404 });
    }

    // Pick the first food that has calorie data
    let food = searchData.foods[0];
    for (const candidate of searchData.foods) {
      const hasCalories = (candidate.foodNutrients || []).some(
        n => (n.nutrientNumber === "208" || n.nutrientId === 1008 || n.nutrientNumber === 208) && n.value > 0
      );
      if (hasCalories) { food = candidate; break; }
    }

    const nutrients = {};
    for (const n of food.foodNutrients || []) {
      // Support both string and numeric nutrientNumber, and nutrientId
      const num = String(n.nutrientNumber || n.nutrientId || "");
      // Map nutrientId to nutrientNumber for common nutrients
      const idMap = { "1008": "208", "1003": "203", "1005": "205", "1004": "204", "1079": "291", "2000": "269" };
      const key = idMap[num] || num;
      if (n.value !== undefined && n.value !== null) nutrients[key] = n.value;
    }

    // USDA nutrient numbers: 208=calories, 203=protein, 205=carbs, 204=fat, 291=fiber, 269=sugar
    // All values are per 100g
    const per100g = {
      calories: nutrients["208"] || 0,
      protein_g: nutrients["203"] || 0,
      carbs_g: nutrients["205"] || 0,
      fat_g: nutrients["204"] || 0,
      fiber_g: nutrients["291"] || 0,
      sugar_g: nutrients["269"] || 0,
    };

    // Scale based on quantity
    let scale = 1;
    if (parsed.unit === "g") {
      scale = parsed.quantity / 100;
    } else if (parsed.unit === "serving") {
      // Use serving size from USDA if available, else assume 100g
      const servingSize = food.servingSize || 100;
      scale = (parsed.quantity * servingSize) / 100;
    }

    const result = {
      food_name: parsed.description,
      serving_size: `${parsed.quantity}${parsed.unit === "g" ? "g" : " serving(s)"}`,
      calories: Math.round(per100g.calories * scale * 10) / 10,
      protein_g: Math.round(per100g.protein_g * scale * 10) / 10,
      carbs_g: Math.round(per100g.carbs_g * scale * 10) / 10,
      fat_g: Math.round(per100g.fat_g * scale * 10) / 10,
      fiber_g: Math.round(per100g.fiber_g * scale * 10) / 10,
      sugar_g: Math.round(per100g.sugar_g * scale * 10) / 10,
    };

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});