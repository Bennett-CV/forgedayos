import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query) return Response.json({ error: 'query required' }, { status: 400 });

    const searchRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=8&api_key=${USDA_API_KEY}`
    );
    const searchData = await searchRes.json();

    if (!searchData.foods || searchData.foods.length === 0) {
      return Response.json({ results: [] });
    }

    const results = searchData.foods.map(food => {
      const nutrients = {};
      for (const n of food.foodNutrients || []) {
        const num = String(n.nutrientNumber || n.nutrientId || "");
        const idMap = { "1008": "208", "1003": "203", "1005": "205", "1004": "204", "1079": "291", "2000": "269" };
        const key = idMap[num] || num;
        if (n.value !== undefined && n.value !== null) nutrients[key] = n.value;
      }

      return {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        // Per 100g values
        per100g: {
          calories: nutrients["208"] || 0,
          protein_g: nutrients["203"] || 0,
          carbs_g: nutrients["205"] || 0,
          fat_g: nutrients["204"] || 0,
          fiber_g: nutrients["291"] || 0,
          sugar_g: nutrients["269"] || 0,
        }
      };
    }).filter(f => f.per100g.calories > 0);

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});