import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function AddFoodForm({ mealType: initialType, date, onAdded, onCancel }) {
  const [mealType, setMealType] = useState(initialType || "breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !calories) {
      toast.error("Name and calories are required.");
      return;
    }
    setSaving(true);
    const mealDate = date || format(new Date(), "yyyy-MM-dd");
    try {
      await base44.entities.Meal.create({
        date: mealDate,
        meal_type: mealType,
        food_description: name.trim(),
        food_name: name.trim(),
        quantity: 1,
        calories: parseFloat(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        serving_size: "custom",
        serving_size_g: null,
      });
      await base44.entities.Activity.create({
        pillar: "nutrition",
        category: "nutrition",
        title: `Logged ${mealType}: ${name.trim()}`,
        points: 2,
        date: mealDate,
      });
      toast.success("Food logged!");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      onAdded?.();
    } catch {
      toast.error("Failed to save meal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editorial-card p-4 space-y-3">
      <p className="micro-label">Add food</p>
      <div className="grid grid-cols-4 gap-1.5">
        {MEAL_TYPES.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMealType(m)}
            className={`capitalize text-[11px] font-semibold py-2 rounded-[4px] min-h-[40px] ${
              mealType === m ? "bg-clay text-clay-fg" : "bg-secondary text-caption"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <Input
        placeholder="Food name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="font-sans"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="micro-label mb-1.5 block">kcal</label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="320"
            value={calories}
            onChange={e => setCalories(e.target.value)}
          />
        </div>
        <div>
          <label className="micro-label mb-1.5 block">Protein (g)</label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={protein}
            onChange={e => setProtein(e.target.value)}
          />
        </div>
        <div>
          <label className="micro-label mb-1.5 block">Carbs (g)</label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={carbs}
            onChange={e => setCarbs(e.target.value)}
          />
        </div>
        <div>
          <label className="micro-label mb-1.5 block">Fat (g)</label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={fat}
            onChange={e => setFat(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] bg-clay text-clay-fg hover:bg-clay-hover font-semibold"
        >
          {saving ? "Saving…" : "Log food"}
        </Button>
      </div>
    </div>
  );
}
