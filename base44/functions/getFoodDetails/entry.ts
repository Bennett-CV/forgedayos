import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fdcId } = await req.json();
    if (!fdcId) return Response.json({ error: 'fdcId required' }, { status: 400 });

    const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(fdcId)}?api_key=${USDA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return Response.json({ servings: [] });
    const food = await res.json();

    const stripGrams = (s) => String(s).replace(/\s*\(\d+(\.\d+)?\s*(g|grams|ml)\s*\)/i, '').trim();

    const servings = [];

    // Branded: prefer householdServingSizeText ("1 cup", "2 Tbsp") + servingSize for grams
    if (food.dataType === 'Branded') {
      const label = food.householdServingSizeText;
      let g = 0;
      if (food.servingSize && food.servingSizeUnit) {
        const unit = String(food.servingSizeUnit).toLowerCase();
        if (unit === 'oz') g = food.servingSize * 28.35;
        else if (unit === 'g' || unit === 'ml') g = food.servingSize;
      }
      if (label && g > 0) {
        servings.push({ label: stripGrams(label), grams: parseFloat(g.toFixed(1)) });
      } else if (g > 0) {
        servings.push({ label: '1 serving', grams: parseFloat(g.toFixed(1)) });
      }
    }

    // foodPortions: array of { amount, modifier, gramWeight, portionDescription }
    for (const p of food.foodPortions || []) {
      if (!p.gramWeight || p.gramWeight <= 0) continue;
      let label = p.portionDescription || p.disseminationText;
      if (!label && p.amount != null && p.modifier) {
        label = `${p.amount} ${p.modifier}`.trim();
      }
      if (label) {
        servings.push({ label: stripGrams(label), grams: p.gramWeight });
      }
    }

    // Dedupe by rounded grams
    const seen = new Set();
    const unique = servings.filter(s => {
      const r = Math.round(s.grams);
      if (seen.has(r)) return false;
      seen.add(r);
      return true;
    });

    // Fallback only when nothing better is available
    if (unique.length === 0) {
      unique.push({ label: '1 portion', grams: 100 });
    }

    return Response.json({ servings: unique });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});