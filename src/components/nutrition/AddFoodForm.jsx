import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function fieldValue(v) {
  if (v == null || v === "") return "";
  return String(v);
}

export default function AddFoodForm({
  mealType: initialType,
  date,
  existingMeal,
  onAdded,
  onCancel,
  onDeleted,
}) {
  const isEdit = Boolean(existingMeal?.id);
  const [mealType, setMealType] = useState(existingMeal?.meal_type || initialType || "breakfast");
  const [name, setName] = useState(existingMeal?.food_name || existingMeal?.food_description || "");
  const [calories, setCalories] = useState(fieldValue(existingMeal?.calories));
  const [protein, setProtein] = useState(fieldValue(existingMeal?.protein_g));
  const [carbs, setCarbs] = useState(fieldValue(existingMeal?.carbs_g));
  const [fat, setFat] = useState(fieldValue(existingMeal?.fat_g));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !calories) {
      toast.error("Name and calories are required.");
      return;
    }
    setSaving(true);
    const mealDate = existingMeal?.date || date || format(new Date(), "yyyy-MM-dd");
    const payload = {
      date: mealDate,
      meal_type: mealType,
      food_description: name.trim(),
      food_name: name.trim(),
      calories: parseFloat(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
    };
    try {
      if (isEdit) {
        await base44.entities.Meal.update(existingMeal.id, payload);
        toast.success("Food updated");
      } else {
        await base44.entities.Meal.create({
          ...payload,
          quantity: 1,
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
      }
      onAdded?.();
    } catch {
      toast.error(isEdit ? "Failed to update meal." : "Failed to save meal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || saving) return;
    setSaving(true);
    try {
      await base44.entities.Meal.delete(existingMeal.id);
      toast.success("Removed");
      onDeleted?.();
    } catch {
      toast.error("Could not delete meal.");
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editorial-card p-4 space-y-3">
      <p className="micro-label">{isEdit ? "Edit food" : "Add food"}</p>
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
          {saving ? "Saving…" : isEdit ? "Save changes" : "Log food"}
        </Button>
      </div>
      {isEdit && !confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full text-[13px] font-semibold text-destructive min-h-[44px]"
        >
          Delete entry
        </button>
      )}
      {isEdit && confirmDelete && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(false)}
            className="min-h-[44px]"
            disabled={saving}
          >
            Keep
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
          >
            {saving ? "Removing…" : "Remove"}
          </Button>
        </div>
      )}
    </div>
  );
}
