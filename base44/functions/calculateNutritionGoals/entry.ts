import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weight_lbs, height_inches, age, gender, activity_level, fitness_goal, target_weight_lbs } = await req.json();

    // Validate required fields
    if (!weight_lbs || !height_inches || !age || !gender || !activity_level || !fitness_goal) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    const weight_kg = weight_lbs * 0.453592;
    const height_cm = height_inches * 2.54;
    
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
    } else {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
    }

    // Activity multipliers
    const activity_multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * (activity_multipliers[activity_level] || 1.55);

    // Adjust calories based on fitness goal
    let target_calories;
    if (fitness_goal === 'lose_weight') {
      target_calories = tdee - 500; // 500 calorie deficit
    } else if (fitness_goal === 'gain_muscle') {
      target_calories = tdee + 300; // 300 calorie surplus
    } else {
      target_calories = tdee; // Maintenance
    }

    // Round to nearest 50
    target_calories = Math.round(target_calories / 50) * 50;

    // Calculate macros based on goal
    let protein_g, fat_g, carbs_g;
    
    if (fitness_goal === 'lose_weight') {
      // Higher protein for weight loss (1.2g per lb), moderate fat, lower carbs
      protein_g = Math.round(weight_lbs * 1.2);
      fat_g = Math.round((target_calories * 0.30) / 9);
      carbs_g = Math.round((target_calories - (protein_g * 4) - (fat_g * 9)) / 4);
    } else if (fitness_goal === 'gain_muscle') {
      // High protein for muscle gain (1g per lb), balanced fat/carbs
      protein_g = Math.round(weight_lbs * 1.0);
      fat_g = Math.round((target_calories * 0.25) / 9);
      carbs_g = Math.round((target_calories - (protein_g * 4) - (fat_g * 9)) / 4);
    } else {
      // Maintenance: balanced macros
      protein_g = Math.round(weight_lbs * 0.8);
      fat_g = Math.round((target_calories * 0.30) / 9);
      carbs_g = Math.round((target_calories - (protein_g * 4) - (fat_g * 9)) / 4);
    }

    // Save to user profile
    await base44.auth.updateMe({
      weight_lbs,
      height_inches,
      age,
      gender,
      activity_level,
      fitness_goal,
      target_weight_lbs: target_weight_lbs || null,
      nutrition_goals: {
        calories: target_calories,
        protein_g,
        fat_g,
        carbs_g
      }
    });

    return Response.json({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      nutrition_goals: {
        calories: target_calories,
        protein_g,
        fat_g,
        carbs_g
      },
      message: 'Nutrition goals calculated and saved to your profile'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});