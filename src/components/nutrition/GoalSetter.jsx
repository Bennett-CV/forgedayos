import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function targetsFromGoals(goals) {
  return {
    calories: goals?.calories != null && goals.calories !== "" ? String(goals.calories) : "",
    protein_g: goals?.protein_g != null && goals.protein_g !== "" ? String(goals.protein_g) : "",
    carbs_g: goals?.carbs_g != null && goals.carbs_g !== "" ? String(goals.carbs_g) : "",
    fat_g: goals?.fat_g != null && goals.fat_g !== "" ? String(goals.fat_g) : "",
  };
}

function parseTargets(targets) {
  const out = {};
  const map = [
    ["calories", targets.calories],
    ["protein_g", targets.protein_g],
    ["carbs_g", targets.carbs_g],
    ["fat_g", targets.fat_g],
  ];
  for (const [key, raw] of map) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  return out;
}

async function reloadMealsAndUser() {
  const [mealsData, me] = await Promise.all([
    base44.entities.Meal.list("-created_date", 500),
    base44.auth.me(),
  ]);
  return { meals: mealsData, me };
}

export default function GoalSetter({ goals, onComplete }) {
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    weight_lbs: "",
    height_inches: "",
    age: "",
    gender: "",
    activity_level: "",
    fitness_goal: "",
    target_weight_lbs: "",
  });
  const [targets, setTargets] = useState(() => targetsFromGoals(goals));

  useEffect(() => {
    setTargets(targetsFromGoals(goals));
  }, [goals]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTargetChange = (field, value) => {
    setTargets(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!formData.weight_lbs || !formData.height_inches || !formData.age || !formData.gender || !formData.activity_level || !formData.fitness_goal) {
      toast.error("Add weight, height, age, gender, activity, and goal to calculate.");
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        weight_lbs: parseFloat(formData.weight_lbs),
        height_inches: parseFloat(formData.height_inches),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        activity_level: formData.activity_level,
        fitness_goal: formData.fitness_goal,
        target_weight_lbs: formData.target_weight_lbs ? parseFloat(formData.target_weight_lbs) : undefined,
      };

      const response = await base44.functions.invoke("calculateNutritionGoals", payload);

      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        const recommended = response.data.nutrition_goals;
        if (recommended) setTargets(targetsFromGoals(recommended));
        toast.success("Recommended targets — tweak and save if you want.");
        const { meals, me } = await reloadMealsAndUser();
        onComplete?.({
          goals: me?.nutrition_goals || recommended || null,
          meals,
          close: false,
        });
      }
    } catch {
      toast.error("Failed to calculate goals");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const nutrition_goals = parseTargets(targets);
    if (!nutrition_goals.calories || !nutrition_goals.protein_g || !nutrition_goals.carbs_g || !nutrition_goals.fat_g) {
      toast.error("Enter calories, protein, carbs, and fat.");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({ nutrition_goals });
      toast.success("Goals saved");
      const { meals, me } = await reloadMealsAndUser();
      onComplete?.({
        goals: me?.nutrition_goals || nutrition_goals,
        meals,
        close: true,
      });
    } catch {
      toast.error("Could not save goals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="micro-label">Daily targets</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "calories", label: "Calories", unit: "kcal", placeholder: "2400" },
            { key: "protein_g", label: "Protein", unit: "g", placeholder: "180" },
            { key: "carbs_g", label: "Carbs", unit: "g", placeholder: "220" },
            { key: "fat_g", label: "Fat", unit: "g", placeholder: "70" },
          ].map(({ key, label, unit, placeholder }) => (
            <div key={key}>
              <label className="micro-label mb-1.5 block">{label} ({unit})</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                value={targets[key]}
                onChange={e => handleTargetChange(key, e.target.value)}
                className="font-mono"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-clay text-clay-fg hover:bg-clay-hover font-semibold"
        >
          {saving ? "Saving…" : "Save targets"}
        </Button>
      </div>

      <form onSubmit={handleCalculate} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Body Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Current Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="180"
                value={formData.weight_lbs}
                onChange={(e) => handleChange("weight_lbs", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (inches)</Label>
              <Input
                id="height"
                type="number"
                placeholder="70"
                value={formData.height_inches}
                onChange={(e) => handleChange("height_inches", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="30"
                value={formData.age}
                onChange={(e) => handleChange("age", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Activity & Goals</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity">Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(v) => handleChange("activity_level", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                  <SelectItem value="light">Light (1-3 days/week exercise)</SelectItem>
                  <SelectItem value="moderate">Moderate (3-5 days/week exercise)</SelectItem>
                  <SelectItem value="active">Active (6-7 days/week exercise)</SelectItem>
                  <SelectItem value="very_active">Very Active (physical job + training)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Fitness Goal</Label>
              <Select value={formData.fitness_goal} onValueChange={(v) => handleChange("fitness_goal", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">Lose Weight</SelectItem>
                  <SelectItem value="maintain">Maintain Weight</SelectItem>
                  <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_weight">Target Weight (lbs) - Optional</Label>
              <Input
                id="target_weight"
                type="number"
                placeholder="165"
                value={formData.target_weight_lbs}
                onChange={(e) => handleChange("target_weight_lbs", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={calculating}>
          {calculating ? "Calculating..." : "Calculate My Goals"}
        </Button>
      </form>
    </div>
  );
}
