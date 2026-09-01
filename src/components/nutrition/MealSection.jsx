import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import EditMealModal from "./EditMealModal";

export default function MealSection({ mealType, meals, onAdd, onDeleted }) {
  const [editingMeal, setEditingMeal] = useState(null);

  const handleDelete = async (id) => {
    await base44.entities.Meal.delete(id);
    toast.success("Removed");
    onDeleted?.();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="micro-label">{mealType}</h3>
        <button
          onClick={() => onAdd(mealType)}
          className="text-[12px] font-semibold text-clay min-h-0 min-w-0"
        >
          + Add
        </button>
      </div>

      <div className="editorial-card overflow-hidden">
        {meals.length > 0 ? (
          meals.map((meal, i) => (
            <div
              key={meal.id}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="min-w-0 pr-3">
                <p className="text-[14px] font-medium text-ink truncate">{meal.food_name || meal.food_description}</p>
                {meal.serving_size && <p className="text-[11px] text-caption">{meal.serving_size}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-[13px] text-caption">{Math.round(meal.calories ?? 0)} kcal</span>
                <button onClick={() => setEditingMeal(meal)} className="text-[11px] font-semibold text-faint min-h-0 min-w-0">
                  Edit
                </button>
                <button onClick={() => handleDelete(meal.id)} className="text-[11px] font-semibold text-destructive min-h-0 min-w-0">
                  Del
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-4 text-[13px] text-caption">Nothing logged yet.</div>
        )}
      </div>

      <EditMealModal
        open={!!editingMeal}
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaved={() => { setEditingMeal(null); onDeleted?.(); }}
      />
    </div>
  );
}
