import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query) return Response.json({ error: 'query required' }, { status: 400 });

    // Query USDA with ALL data types including Branded for much better coverage
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Branded&pageSize=25&api_key=${USDA_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.foods || data.foods.length === 0) {
      return Response.json({ results: [] });
    }

    // Prefer Foundation/SR Legacy first (raw ingredients), then Branded
    const ordered = [
      ...data.foods.filter(f => f.dataType === 'Foundation' || f.dataType === 'SR Legacy'),
      ...data.foods.filter(f => f.dataType === 'Branded'),
    ];

    const results = ordered
      .slice(0, 15)
      .map(food => {
        const nutrients = {};
        for (const n of food.foodNutrients || []) {
          const num = String(n.nutrientNumber || n.nutrientId || "");
          // Map both old and new USDA nutrient IDs
          const idMap = { "1008": "208", "1003": "203", "1005": "205", "1004": "204", "1079": "291", "2000": "269" };
          const key = idMap[num] || num;
          if (n.value !== undefined && n.value !== null) nutrients[key] = n.value;
        }

        const per100g = {
          calories: Math.round(nutrients["208"] || 0),
          protein_g: parseFloat((nutrients["203"] || 0).toFixed(1)),
          carbs_g: parseFloat((nutrients["205"] || 0).toFixed(1)),
          fat_g: parseFloat((nutrients["204"] || 0).toFixed(1)),
          fiber_g: parseFloat((nutrients["291"] || 0).toFixed(1)),
          sugar_g: parseFloat((nutrients["269"] || 0).toFixed(1)),
        };

        // Build serving options
        const servings = [];

        // For branded foods, try to get the actual serving size
        if (food.dataType === 'Branded' && food.servingSize && food.servingSizeUnit) {
          let servingGrams = food.servingSize;
          if (food.servingSizeUnit.toLowerCase() === 'oz') servingGrams = food.servingSize * 28.35;
          else if (food.servingSizeUnit.toLowerCase() === 'g') servingGrams = food.servingSize;
          if (servingGrams > 0) {
            servings.push({ label: '1 serving', grams: parseFloat(servingGrams.toFixed(1)) });
          }
        }

        // Common household measures from USDA (e.g. "1 cup", "1 tbsp", "1 slice")
        const householdMeasure = food.foodMeasures?.find(m => m.gramWeight > 0);
        if (householdMeasure) {
          servings.push({ label: householdMeasure.disseminationText, grams: householdMeasure.gramWeight });
        }

        // Fallback only when no natural serving exists — keep grams internal
        if (servings.length === 0) {
          servings.push({ label: '1 portion', grams: 100 });
        }

        // Deduplicate by grams
        const seen = new Set();
        const uniqueServings = servings.filter(s => {
          const rounded = Math.round(s.grams);
          if (seen.has(rounded)) return false;
          seen.add(rounded);
          return true;
        });

        // Clean up description — USDA raw names are uppercase and verbose
        let name = food.description || "";
        if (food.dataType === 'Foundation' || food.dataType === 'SR Legacy') {
          // Convert "CHICKEN, BROILERS OR FRYERS, BREAST, COOKED" -> title case, strip excess
          name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }

        return {
          id: String(food.fdcId),
          name,
          brand: food.brandOwner || food.brandName || null,
          dataType: food.dataType,
          per100g,
          servings: uniqueServings,
        };
      })
      .filter(f => f.per100g.calories > 0);

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});